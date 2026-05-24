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
    const base = getApiBase();
    if (isSupabaseRest(base)) {
      return;
    }
    const hasBase = Boolean(getApiBaseOverride());
    const hasAnon = Boolean(getSupabaseAnon());
    if (hasBase && hasAnon) {
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
      if (!hasBase && cfg?.supabase_rest_url) {
        setApiBaseOverride(String(cfg.supabase_rest_url));
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

export const listBooks = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("books?select=*&order=id.desc", { method: "GET" });
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
    const rows = await request("books", { method: "POST", body: JSON.stringify(payload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request("/books", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
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
    const rows = await request("categories", { method: "POST", body: JSON.stringify(payload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request("/categories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
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
