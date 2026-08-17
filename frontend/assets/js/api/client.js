import { getApiBase, getApiBaseOverride, setApiBaseOverride, getSupabaseAnon, setSupabaseAnon, getSupabaseRefreshToken, setSupabaseRefreshToken, getToken, clearToken, setToken } from "../state.js";

export const toJson = async (resp) => {
  const text = await resp.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const joinUrl = (base, path) => {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
};

export const isSupabaseRest = (base) => /supabase\.co\/rest\/v1\/?$/i.test((base || "").replace(/\/+$/, "/"));
export const toSupabaseAuthBase = (restBase) => (restBase || "").replace(/\/rest\/v1\/?$/i, "/auth/v1/");
export const toSupabaseStorageBase = (restBase) => (restBase || "").replace(/\/rest\/v1\/?$/i, "/storage/v1/");

export const normalizeSupabaseRestBase = (maybeBase) => {
  const b = String(maybeBase || "").trim().replace(/\/+$/, "");
  if (!b) {
    return b;
  }
  if (!/supabase\.co/i.test(b)) {
    return b;
  }
  if (/\/rest\/v1$/i.test(b)) {
    return b;
  }
  if (/\/rest\/v1\//i.test(`${b}/`)) {
    return b.replace(/\/+$/, "");
  }
  if (/\/auth\/v1$/i.test(b) || /\/auth\/v1\//i.test(`${b}/`)) {
    return b.replace(/\/auth\/v1\/?$/i, "/rest/v1");
  }
  return `${b}/rest/v1`;
};

export const toPostgrestError = (data, fallback) => {
  if (!data) {
    return fallback;
  }
  if (typeof data === "string") {
    return data;
  }
  return data.message || data.details || data.hint || data.code || fallback;
};

let configBootPromise = null;
export const ensureSupabaseConfigLoaded = async () => {
  try {
    const currentOverride = getApiBaseOverride();
    if (currentOverride) {
      const normalized = normalizeSupabaseRestBase(currentOverride);
      if (normalized && normalized !== currentOverride) {
        setApiBaseOverride(normalized);
      }
    }
    const base = getApiBase();
    if (isSupabaseRest(base)) {
      return;
    }
    const override = getApiBaseOverride();
    const hasBase = Boolean(override);
    const hasAnon = Boolean(getSupabaseAnon());
    const overrideLooksSupabase = /supabase\.co/i.test(override || "");
    if (hasBase && hasAnon && !overrideLooksSupabase) {
      return;
    }
    if (configBootPromise) {
      await configBootPromise;
      return;
    }
    configBootPromise = (async () => {
      const resp = await fetch("/config", { cache: "no-cache" });
      if (!resp.ok) {
        return;
      }
      const cfg = await resp.json();
      if (cfg?.supabase_rest_url) {
        const cfgBase = normalizeSupabaseRestBase(String(cfg.supabase_rest_url));
        if (!hasBase || (overrideLooksSupabase && !isSupabaseRest(override))) {
          if (cfgBase) {
            setApiBaseOverride(cfgBase);
          }
        }
      }
      if (!hasAnon && cfg?.supabase_anon_key) {
        setSupabaseAnon(String(cfg.supabase_anon_key));
      }
    })();
    await configBootPromise;
  } catch {
    return;
  }
};

export const supabaseAuthRequest = async (authPath, options = {}) => {
  const base = getApiBase();
  const anon = getSupabaseAnon();
  if (!anon) {
    throw new Error("Missing Supabase anon key (rook_supabase_anon).");
  }
  const authBase = toSupabaseAuthBase(base);
  const url = joinUrl(authBase, authPath);
  const headers = new Headers(options.headers || {});
  headers.set("apikey", anon);
  headers.set("accept", "application/json");
  const token = getToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  } else {
    headers.set("authorization", `Bearer ${anon}`);
  }
  if (options.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const resp = await fetch(url, { ...options, headers });
  const data = await toJson(resp);
  if (!resp.ok) {
    const msg = toPostgrestError(data, resp.statusText);
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const supabaseStorageUpload = async (bucket, objectPath, file, opts = {}) => {
  const base = getApiBase();
  const anon = getSupabaseAnon();
  if (!anon) {
    throw new Error("Missing Supabase anon key (rook_supabase_anon).");
  }
  const storageBase = toSupabaseStorageBase(base);
  const url = joinUrl(storageBase, `object/${bucket}/${objectPath}`);
  const headers = new Headers(opts.headers || {});
  headers.set("apikey", anon);
  const token = getToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  } else {
    headers.set("authorization", `Bearer ${anon}`);
  }
  headers.set("x-upsert", "true");
  if (file?.type) {
    headers.set("content-type", file.type);
  }
  const resp = await fetch(url, { method: "POST", headers, body: file });
  const data = await toJson(resp);
  if (!resp.ok) {
    const msg = toPostgrestError(data, resp.statusText);
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
};

const refreshSupabaseSessionIfNeeded = async () => {
  const refresh = getSupabaseRefreshToken();
  if (!refresh) {
    return null;
  }
  try {
    const data = await supabaseAuthRequest("token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh })
    });
    if (data?.access_token) {
      setToken(data.access_token);
      setSupabaseRefreshToken(data.refresh_token || refresh);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
};

export const supabaseGetUser = async () => {
  try {
    return await supabaseAuthRequest("user", { method: "GET" });
  } catch (e) {
    if (e?.status === 401) {
      const newToken = await refreshSupabaseSessionIfNeeded();
      if (newToken) {
        return await supabaseAuthRequest("user", { method: "GET" });
      }
    }
    throw e;
  }
};

export const request = async (path, options = {}) => {
  await ensureSupabaseConfigLoaded();
  const base = getApiBase();
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("accept", "application/json");

  if (isSupabaseRest(base)) {
    const anon = getSupabaseAnon();
    if (anon) {
      headers.set("apikey", anon);
      headers.set("authorization", `Bearer ${token || anon}`);
    }
    if (!headers.has("content-type") && options.body != null) {
      headers.set("content-type", "application/json");
    }
    if (!headers.has("prefer") && ["POST", "PATCH", "PUT", "DELETE"].includes((options.method || "GET").toUpperCase())) {
      headers.set("prefer", "return=representation");
    }
  } else if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const url = isSupabaseRest(base) ? joinUrl(base, path) : `${base}${path}`;
  let resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    if (isSupabaseRest(base)) {
      const newToken = await refreshSupabaseSessionIfNeeded();
      if (newToken) {
        headers.set("authorization", `Bearer ${newToken}`);
        resp = await fetch(url, { ...options, headers });
      } else {
        clearToken();
      }
    } else {
      clearToken();
    }
  }
  const data = await toJson(resp);
  if (!resp.ok) {
    const msg = isSupabaseRest(base) ? toPostgrestError(data, resp.statusText) : typeof data === "string" ? data : data?.detail || resp.statusText;
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const uploadListingImages = async (files, opts = {}) => {
  await ensureSupabaseConfigLoaded();
  const base = getApiBase();
  if (!isSupabaseRest(base)) {
    throw new Error("Image upload is only supported when using Supabase.");
  }
  const inputFiles = Array.from(files || []).filter(Boolean);
  if (!inputFiles.length) {
    return [];
  }
  const bucket = opts.bucket || "listing-images";
  const authUser = await supabaseGetUser();
  const uid = authUser?.id || "anon";
  const storageBase = toSupabaseStorageBase(base).replace(/\/+$/, "");
  const now = Date.now();
  const urls = [];
  for (const f of inputFiles) {
    const safeName = String(f.name || "image").replace(/[^a-zA-Z0-9._-]+/g, "_");
    const rand = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Math.random()}`.slice(2);
    const objectPath = `listings/${uid}/${now}-${rand}-${safeName}`;
    await supabaseStorageUpload(bucket, objectPath, f);
    urls.push(`${storageBase}/object/public/${bucket}/${objectPath}`);
  }
  return urls;
};

export { refreshSupabaseSessionIfNeeded };
