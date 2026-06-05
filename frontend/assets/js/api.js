import { getApiBase, getApiBaseOverride, setApiBaseOverride, getSupabaseAnon, setSupabaseAnon, getSupabaseRefreshToken, setSupabaseRefreshToken, getToken, clearToken, setToken } from "./state.js";

const toJson = async (resp) => {
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

const joinUrl = (base, path) => {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
};

const isSupabaseRest = (base) => /supabase\.co\/rest\/v1\/?$/i.test((base || "").replace(/\/+$/, "/"));
const toSupabaseAuthBase = (restBase) => (restBase || "").replace(/\/rest\/v1\/?$/i, "/auth/v1/");
const toSupabaseStorageBase = (restBase) => (restBase || "").replace(/\/rest\/v1\/?$/i, "/storage/v1/");
const normalizeSupabaseRestBase = (maybeBase) => {
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

const toPostgrestError = (data, fallback) => {
  if (!data) {
    return fallback;
  }
  if (typeof data === "string") {
    return data;
  }
  return data.message || data.details || data.hint || data.code || fallback;
};

let configBootPromise = null;
const ensureSupabaseConfigLoaded = async () => {
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

const supabaseAuthRequest = async (authPath, options = {}) => {
  const base = getApiBase();
  const anon = getSupabaseAnon();
  if (!anon) {
    throw new Error("Thiếu Supabase anon key (rook_supabase_anon).");
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

const supabaseStorageUpload = async (bucket, objectPath, file, opts = {}) => {
  const base = getApiBase();
  const anon = getSupabaseAnon();
  if (!anon) {
    throw new Error("Thiếu Supabase anon key (rook_supabase_anon).");
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

export const uploadListingImages = async (files, opts = {}) => {
  await ensureSupabaseConfigLoaded();
  const base = getApiBase();
  if (!isSupabaseRest(base)) {
    throw new Error("Upload ảnh hiện chỉ hỗ trợ khi chạy Supabase.");
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

const supabaseGetUser = async () => {
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

export const login = async (email, password) => {
  await ensureSupabaseConfigLoaded();
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const data = await supabaseAuthRequest("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (data?.refresh_token) {
      setSupabaseRefreshToken(data.refresh_token);
    }
    return { access_token: data.access_token, refresh_token: data.refresh_token, token_type: data.token_type || "bearer" };
  }
  return request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
};

export const signup = async (email, password) => {
  await ensureSupabaseConfigLoaded();
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const data = await supabaseAuthRequest("signup", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    const accessToken = data?.session?.access_token || null;
    const refreshToken = data?.session?.refresh_token || null;
    if (refreshToken) {
      setSupabaseRefreshToken(refreshToken);
    }
    return { access_token: accessToken, refresh_token: refreshToken, token_type: "bearer" };
  }
  return request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
};

export const me = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const authUser = await supabaseGetUser();
    const uid = authUser?.id;
    if (!uid) {
      return null;
    }
    const rows = await request(`profiles?select=*&id=eq.${uid}&limit=1`, { method: "GET" });
    const profile = Array.isArray(rows) ? rows[0] || null : rows;
    if (profile) {
      profile.email = profile.email || authUser?.email || null;
    }
    return profile;
  }
  return request("/user/me", { method: "GET" });
};

export const updateMe = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const authUser = await supabaseGetUser();
    const uid = authUser?.id;
    if (!uid) {
      throw new Error("Cần đăng nhập để cập nhật profile.");
    }
    const rows = await request(`profiles?id=eq.${uid}`, { method: "PATCH", body: JSON.stringify(payload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request("/user/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const getProfileSummaries = async (userIds = []) => {
  const ids = Array.from(new Set((userIds || []).map((v) => (v == null ? "" : String(v))).filter(Boolean)));
  if (!ids.length) {
    return [];
  }

  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("rpc/get_profile_summaries", { method: "POST", body: JSON.stringify({ user_ids: ids }) });
  }

  const results = await Promise.allSettled(ids.map((id) => request(`/users/${encodeURIComponent(id)}`, { method: "GET" })));
  return results.filter((r) => r.status === "fulfilled").map((r) => r.value);
};

export const listBooks = async (opts = {}) => {
  const base = getApiBase();
  const includeUnapproved = opts?.includeUnapproved === true;
  if (isSupabaseRest(base)) {
    const filter = includeUnapproved ? "" : "is_approved=eq.true&";
    return request(`books?select=*&${filter}order=id.desc`, { method: "GET" });
  }
  if (includeUnapproved) {
    const [approved, pending] = await Promise.all([request("/books", { method: "GET" }), request("/books/admin/pending", { method: "GET" })]);
    return [...(pending || []), ...(approved || [])];
  }
  return request("/books", { method: "GET" });
};

export const getBook = async (bookId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`books?select=*&id=eq.${Number(bookId)}&limit=1`, { method: "GET" });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/books/${bookId}`, { method: "GET" });
};

export const createBook = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    let authUser = null;
    try {
      authUser = await supabaseGetUser();
    } catch (e) {
      if (e?.status === 401) {
        clearToken();
        throw new Error("Phiên đăng nhập Supabase không hợp lệ. Vui lòng Sign out và Sign in lại.");
      }
      throw e;
    }
    const uid = authUser?.id || null;
    if (!uid) {
      throw new Error("Bạn cần đăng nhập Supabase trước khi đăng ký sách.");
    }

    let body = { ...(payload || {}) };
    if (body.is_approved === false && body.created_by == null) {
      body.created_by = uid;
    }

    const rows = await request("books", { method: "POST", body: JSON.stringify(body) });
    const created = Array.isArray(rows) ? rows[0] || null : rows;
    if (created?.id) {
      return created;
    }

    const fallback = await request(`books?select=*&created_by=eq.${uid}&order=id.desc&limit=1`, { method: "GET" });
    const last = Array.isArray(fallback) ? fallback[0] || null : fallback;
    if (last?.id) {
      return last;
    }
    throw new Error("Tạo sách thất bại. Vui lòng kiểm tra Supabase schema/policies (books.created_by + RLS).");
  }
  return request("/books", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const listPendingBooks = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("books?select=*,category:categories(*)&is_approved=eq.false&order=id.desc", { method: "GET" });
  }
  return request("/books/admin/pending", { method: "GET" });
};

export const approveBook = async (bookId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`books?id=eq.${Number(bookId)}`, { method: "PATCH", body: JSON.stringify({ is_approved: true }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/books/admin/${Number(bookId)}/approve`, { method: "PATCH" });
};
export const updateBook = async (bookId, payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`books?id=eq.${Number(bookId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/books/${bookId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
export const deleteBook = async (bookId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`books?id=eq.${Number(bookId)}`, { method: "DELETE" });
  }
  return request(`/books/${bookId}`, { method: "DELETE" });
};

export const listCategories = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("categories?select=*&order=id.asc", { method: "GET" });
  }
  return request("/categories", { method: "GET" });
};
export const createCategory = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    let authUser = null;
    try {
      authUser = await supabaseGetUser();
    } catch (e) {
      if (e?.status === 401) {
        clearToken();
        throw new Error("Phiên đăng nhập Supabase không hợp lệ. Vui lòng Sign out và Sign in lại.");
      }
      throw e;
    }
    const uid = authUser?.id || null;
    if (!uid) {
      throw new Error("Bạn cần đăng nhập Supabase trước khi đăng ký category.");
    }

    let body = { ...(payload || {}) };
    if (body.is_approved === false && body.created_by == null) {
      body.created_by = uid;
    }

    try {
      const rows = await request("categories", { method: "POST", body: JSON.stringify(body) });
      const created = Array.isArray(rows) ? rows[0] || null : rows;
      if (created?.id) {
        return created;
      }
      const fallback = await request(`categories?select=*&created_by=eq.${uid}&order=id.desc&limit=1`, { method: "GET" });
      const last = Array.isArray(fallback) ? fallback[0] || null : fallback;
      if (last?.id) {
        return last;
      }
      throw new Error("Tạo category thất bại. Vui lòng kiểm tra Supabase schema/policies (categories.created_by + RLS).");
    } catch (e) {
      if (e?.data?.code === "PGRST204") {
        throw new Error("Supabase chưa có cột categories.created_by (schema cache chưa update). Chạy SQL trong database/supabase_setup.md để add columns, sau đó Reload schema cache / Restart API trên Supabase.");
      }
      throw e;
    }
  }
  return request("/categories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const listPendingCategories = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("categories?select=*&is_approved=eq.false&order=id.desc", { method: "GET" });
  }
  return request("/categories/admin/pending", { method: "GET" });
};

export const approveCategory = async (categoryId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`categories?id=eq.${Number(categoryId)}`, { method: "PATCH", body: JSON.stringify({ is_approved: true }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/categories/admin/${Number(categoryId)}/approve`, { method: "PATCH" });
};
export const updateCategory = async (categoryId, payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`categories?id=eq.${Number(categoryId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/categories/${categoryId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
export const deleteCategory = async (categoryId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`categories?id=eq.${Number(categoryId)}`, { method: "DELETE" });
  }
  return request(`/categories/${categoryId}`, { method: "DELETE" });
};

export const listListings = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.true&order=id.desc", { method: "GET" });
  }
  return request("/listings", { method: "GET" });
};

export const listPendingListings = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.false&order=id.desc", { method: "GET" });
  }
  return request("/listings/admin/pending", { method: "GET" });
};

export const approveListing = async (listingId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?id=eq.${Number(listingId)}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/admin/${Number(listingId)}/approve`, { method: "PATCH" });
};

export const searchBooks = async (query, mode = "title") => {
  const q = String(query || "").trim();
  if (!q) {
    return [];
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const esc = encodeURIComponent(q);
    const filter = mode === "isbn" ? `isbn=ilike.*${esc}*` : `title=ilike.*${esc}*`;
    return request(`books?select=*&${filter}&order=id.desc&limit=10`, { method: "GET" });
  }
  const books = await listBooks({ includeUnapproved: false });
  const lower = q.toLowerCase();
  const pick = mode === "isbn" ? (b) => String(b?.isbn || "").toLowerCase() : (b) => String(b?.title || "").toLowerCase();
  return (books || []).filter((b) => pick(b).includes(lower)).slice(0, 10);
};

export const listListingsByBook = async (bookId) => {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return [];
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.true&book_id=eq.${id}&order=id.desc`, { method: "GET" });
  }
  const all = await listListings();
  return (all || []).filter((l) => Number(l.book_id) === id);
};

export const getListing = async (listingId) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    return null;
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&id=eq.${id}&limit=1`, { method: "GET" });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/${id}`, { method: "GET" });
};

export const myListings = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      return [];
    }
    return request(`listings?select=*,book:books(*),images:listing_images(*)&seller_id=eq.${user.id}&order=created_at.desc`, { method: "GET" });
  }
  return request("/user/me/listings", { method: "GET" });
};

export const createListing = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      throw new Error("Cần đăng nhập để tạo listing.");
    }
    const listingPayload = {
      book_id: payload.book_id,
      seller_id: user.id,
      price: payload.price,
      condition: payload.condition,
      status: payload.status || "available",
      is_active: payload.is_active !== false
    };
    const inserted = await request("listings", { method: "POST", body: JSON.stringify(listingPayload) });
    const listing = Array.isArray(inserted) ? inserted[0] : inserted;
    const urls = Array.isArray(payload.images) ? payload.images : [];
    const cleanUrls = urls.map((u) => String(u || "").trim()).filter(Boolean);
    if (listing?.id && cleanUrls.length) {
      const imgRows = cleanUrls.map((url) => ({ listing_id: listing.id, url }));
      await request("listing_images", { method: "POST", body: JSON.stringify(imgRows) });
    }
    if (!listing?.id) {
      return listing;
    }
    const out = await request(`listings?select=*,book:books(*),images:listing_images(*)&id=eq.${listing.id}&limit=1`, { method: "GET" });
    return Array.isArray(out) ? out[0] || listing : out;
  }
  return request("/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const updateListing = async (listingId, payload) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    throw new Error("listing_id không hợp lệ.");
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload || {}) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}) });
};

export const replaceListingImages = async (listingId, urls = []) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    throw new Error("listing_id không hợp lệ.");
  }
  const clean = (urls || []).map((u) => String(u || "").trim()).filter(Boolean);
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    await request(`listing_images?listing_id=eq.${id}`, { method: "DELETE" });
    if (!clean.length) {
      return [];
    }
    const rows = clean.map((url) => ({ listing_id: id, url }));
    return request("listing_images", { method: "POST", body: JSON.stringify(rows) });
  }
  return request(`/listings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ images: clean }) });
};

export const markListingSold = async (listingId) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    throw new Error("listing_id không hợp lệ.");
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "sold" }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/${id}/sold`, { method: "PATCH" });
};

export const getMyMessages = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      return [];
    }
    const uid = user.id;
    return request(`messages?select=*&or=(sender_id.eq.${uid},receiver_id.eq.${uid})&order=created_at.desc`, { method: "GET" });
  }
  return request("/messages/me", { method: "GET" });
};

export const sendMessage = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      throw new Error("Cần đăng nhập để gửi tin nhắn.");
    }
    const msgPayload = {
      listing_id: payload.listing_id ?? null,
      receiver_id: payload.receiver_id,
      body: payload.body,
      sender_id: user.id
    };
    const rows = await request("messages", { method: "POST", body: JSON.stringify(msgPayload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request("/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const adminUsers = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("profiles?select=*&order=created_at.desc", { method: "GET" });
  }
  return request("/admin/users", { method: "GET" });
};

export const adminLockedUsers = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("profiles?select=*&status=eq.banned&order=created_at.desc", { method: "GET" });
  }
  return request("/admin/users/lock", { method: "GET" });
};

export const lockUser = async (userId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`profiles?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ status: "banned" }) });
  }
  return request(`/admin/users/${userId}/lock`, { method: "PATCH" });
};

export const unlockUser = async (userId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`profiles?id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  }
  return request(`/admin/users/${userId}/unlock`, { method: "PATCH" });
};

export const adminDeleteListing = async (listingId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`listings?id=eq.${Number(listingId)}`, { method: "DELETE" });
  }
  return request(`/admin/posts/${listingId}`, { method: "DELETE" });
};
