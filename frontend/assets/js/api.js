import { getApiBase, getToken, clearToken } from "./state.js";

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

export const request = async (path, options = {}) => {
  const base = getApiBase();
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("accept", "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const resp = await fetch(`${base}${path}`, { ...options, headers });
  if (resp.status === 401) {
    clearToken();
  }
  const data = await toJson(resp);
  if (!resp.ok) {
    const msg = typeof data === "string" ? data : data?.detail || resp.statusText;
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const login = async (email, password) => {
  return request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
};

export const signup = async (email, password) => {
  return request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
};

export const me = async () => request("/user/me", { method: "GET" });

export const updateMe = async (payload) => {
  return request("/user/me", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const listBooks = async () => request("/books", { method: "GET" });
export const getBook = async (bookId) => request(`/books/${bookId}`, { method: "GET" });
export const createBook = async (payload) => {
  return request("/books", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
export const updateBook = async (bookId, payload) => {
  return request(`/books/${bookId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
export const deleteBook = async (bookId) => request(`/books/${bookId}`, { method: "DELETE" });

export const listCategories = async () => request("/categories", { method: "GET" });
export const createCategory = async (payload) => {
  return request("/categories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
export const updateCategory = async (categoryId, payload) => {
  return request(`/categories/${categoryId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
export const deleteCategory = async (categoryId) => request(`/categories/${categoryId}`, { method: "DELETE" });
export const listListings = async () => request("/listings", { method: "GET" });

export const myListings = async () => request("/user/me/listings", { method: "GET" });

export const createListing = async (payload) => {
  return request("/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const getMyMessages = async () => request("/messages/me", { method: "GET" });

export const sendMessage = async (payload) => {
  return request("/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const adminUsers = async () => request("/admin/users", { method: "GET" });
export const adminLockedUsers = async () => request("/admin/users/lock", { method: "GET" });

export const lockUser = async (userId) => request(`/admin/users/${userId}/lock`, { method: "PATCH" });
export const unlockUser = async (userId) => request(`/admin/users/${userId}/unlock`, { method: "PATCH" });
export const adminDeleteListing = async (listingId) => request(`/admin/posts/${listingId}`, { method: "DELETE" });
