const tokenKey = "rook_token";
const apiBaseKey = "rook_api_base";
const supabaseAnonKey = "rook_supabase_anon";
const supabaseRefreshKey = "rook_supabase_refresh";

export const getToken = () => {
  try {
    return localStorage.getItem(tokenKey);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    localStorage.setItem(tokenKey, token);
  } catch {
    return;
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(supabaseRefreshKey);
  } catch {
    return;
  }
};

export const getSupabaseAnon = () => {
  try {
    return localStorage.getItem(supabaseAnonKey);
  } catch {
    return null;
  }
};

export const setSupabaseAnon = (anon) => {
  try {
    if (!anon) {
      localStorage.removeItem(supabaseAnonKey);
      return;
    }
    localStorage.setItem(supabaseAnonKey, anon);
  } catch {
    return;
  }
};

export const getSupabaseRefreshToken = () => {
  try {
    return localStorage.getItem(supabaseRefreshKey);
  } catch {
    return null;
  }
};

export const setSupabaseRefreshToken = (token) => {
  try {
    if (!token) {
      localStorage.removeItem(supabaseRefreshKey);
      return;
    }
    localStorage.setItem(supabaseRefreshKey, token);
  } catch {
    return;
  }
};

export const getApiBaseOverride = () => {
  try {
    return localStorage.getItem(apiBaseKey);
  } catch {
    return null;
  }
};

export const setApiBaseOverride = (base) => {
  try {
    if (!base) {
      localStorage.removeItem(apiBaseKey);
      return;
    }
    localStorage.setItem(apiBaseKey, base);
  } catch {
    return;
  }
};

export const getApiBase = () => {
  const override = getApiBaseOverride();
  if (override) {
    return override;
  }
  if (location.protocol === "http:" || location.protocol === "https:") {
    return location.origin;
  }
  return "http://127.0.0.1:8000";
};
