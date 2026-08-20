import { ensureSupabaseConfigLoaded, isSupabaseRest, request, supabaseAuthRequest, supabaseGetUser } from "./client.js";
import { setSupabaseRefreshToken, setToken, getApiBase } from "../state.js";

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
      throw new Error("You must be signed in to update your profile.");
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
