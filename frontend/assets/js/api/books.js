import { ensureSupabaseConfigLoaded, isSupabaseRest, request, supabaseGetUser } from "./client.js";
import { getApiBase, clearToken } from "../state.js";

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
        throw new Error("Invalid Supabase session. Please sign out and sign in again.");
      }
      throw e;
    }
    const uid = authUser?.id || null;
    if (!uid) {
      throw new Error("You must be signed in to Supabase before registering a book.");
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
    throw new Error("Failed to create book. Please verify Supabase schema/policies (books.created_by + RLS).");
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

export const searchBooks = async (query, mode = "title") => {
  await ensureSupabaseConfigLoaded();
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
