import { me, updateMe } from "../api.js";
import { getToken, clearToken } from "../state.js";
import { initAvatars } from "../app.js";
import { qs, setStatus } from "../ui.js";

const requireAuth = (navigate) => {
  if (!getToken()) {
    if (navigate) {
      navigate("/signin");
      return false;
    }
    location.href = "./signin.html";
    return false;
  }
  return true;
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  const status = qs("#profile-status");
  const nameInput = qs("#profile-name");
  const avatarInput = qs("#profile-avatar");
  const saveBtn = qs("#profile-save");
  const signoutBtn = qs("#profile-signout");
  const avatarBlock = qs("[data-avatar]");

  setStatus(status, "");
  try {
    const user = await me();
    if (nameInput) {
      nameInput.value = user.name || "";
    }
    if (avatarInput) {
      avatarInput.value = user.avatar_url || "";
    }
    if (avatarBlock) {
      avatarBlock.setAttribute("data-avatar-name", user.name || user.email || "");
      avatarBlock.setAttribute("data-avatar-url", user.avatar_url || "");
      initAvatars();
    }
  } catch (e) {
    if (e.status === 401) {
      clearToken();
      if (navigate) {
        navigate("/signin");
        return;
      }
      location.href = "./signin.html";
      return;
    }
    setStatus(status, e.message || "Không tải được profile", "error");
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      setStatus(status, "");
      saveBtn.disabled = true;
      try {
        const payload = {
          name: nameInput?.value ?? undefined,
          avatar_url: avatarInput?.value ?? undefined
        };
        const updated = await updateMe(payload);
        setStatus(status, "Đã lưu", "success");
        if (avatarBlock) {
          avatarBlock.setAttribute("data-avatar-name", updated.name || updated.email || "");
          avatarBlock.setAttribute("data-avatar-url", updated.avatar_url || "");
          initAvatars();
        }
      } catch (e) {
        setStatus(status, e.message || "Lưu thất bại", "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  if (signoutBtn) {
    signoutBtn.addEventListener("click", () => {
      clearToken();
      if (navigate) {
        navigate("/signin");
        return;
      }
      location.href = "./signin.html";
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
