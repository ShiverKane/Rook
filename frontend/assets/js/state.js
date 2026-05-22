const tokenKey = "rook_token";

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
  } catch {
    return;
  }
};

export const getApiBase = () => {
  if (location.protocol === "http:" || location.protocol === "https:") {
    return location.origin;
  }
  return "http://127.0.0.1:8000";
};
