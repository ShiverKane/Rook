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
  const title = qs("#profile-title");
  const memberSince = qs("#profile-member-since");
  const badges = qs("#profile-badges");
  const nameInput = qs("#profile-name");
  const avatarInput = qs("#profile-avatar");
  const saveBtn = qs("#profile-save");
  const signoutBtn = qs("#profile-signout");
  const avatarBlock = qs("[data-avatar]");

  setStatus(status, "");
  try {
    const user = await me();
    if (title) {
      title.textContent = user.name || user.email || "Profile";
    }
    if (memberSince) {
      const year = user.created_at ? new Date(user.created_at).getFullYear() : null;
      memberSince.innerHTML = `<span class="material-symbols-outlined text-base">calendar_today</span> Member since ${year || "—"}`;
    }
    if (badges) {
      badges.innerHTML = "";
      const mk = (text) => {
        const s = document.createElement("span");
        s.className = "px-4 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-md";
        s.textContent = text;
        return s;
      };
      if ((user.listing_count || 0) > 0) {
        badges.appendChild(mk("Seller"));
      }
      badges.appendChild(mk(user.role === "admin" ? "Admin" : "User"));
      if (user.status === "banned") {
        const s = document.createElement("span");
        s.className = "px-4 py-1 bg-error-container text-on-error-container rounded-full text-label-md";
        s.textContent = "Banned";
        badges.appendChild(s);
      }
    }
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
