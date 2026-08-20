import { ensureSupabaseConfigLoaded, isSupabaseRest, request, supabaseGetUser } from "./client.js";
import { getApiBase, clearToken } from "../state.js";

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
        throw new Error("Invalid Supabase session. Please sign out and sign in again.");
      }
      throw e;
    }
    const uid = authUser?.id || null;
    if (!uid) {
      throw new Error("You must be signed in to Supabase before registering a category.");
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
      throw new Error("Failed to create category. Please verify Supabase schema/policies (categories.created_by + RLS).");
    } catch (e) {
      if (e?.data?.code === "PGRST204") {
        throw new Error("Supabase is missing categories.created_by (schema cache not updated). Run the SQL in database/supabase_setup.md to add columns, then reload the schema cache / restart the Supabase API.");
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
