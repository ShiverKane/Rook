import { isSupabaseRest, request } from "./client.js";
import { getApiBase } from "../state.js";
import { me } from "./auth.js";

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

export const getPublicProfile = async (userId) => {
  const id = userId == null ? "" : String(userId).trim();
  if (!id) {
    return null;
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request("rpc/get_profile_summaries", { method: "POST", body: JSON.stringify({ user_ids: [id] }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/users/${encodeURIComponent(id)}`, { method: "GET" });
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
