import { adminUsers, adminLockedUsers, lockUser, unlockUser, listListings } from "../api.js";
import { getToken, clearToken } from "../state.js";
import { initAvatars } from "../app.js";
import { qs, setText, setStatus } from "../ui.js";

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

const renderUsers = (rows, users) => {
  rows.innerHTML = "";
  for (const u of users) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-surface-container-low/30 transition-colors";
    const tdEmail = document.createElement("td");
    tdEmail.className = "px-8 py-6 text-on-surface text-body-md";
    tdEmail.textContent = u.email || u.id || "";
    const tdRole = document.createElement("td");
    tdRole.className = "px-8 py-6 text-on-surface-variant text-body-md";
    tdRole.textContent = u.role;
    const tdStatus = document.createElement("td");
    tdStatus.className = "px-8 py-6";
    const badge = document.createElement("span");
    badge.className =
      u.status === "banned"
        ? "px-3 py-1 bg-error-container text-on-error-container rounded-full text-[12px] font-bold"
        : "px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-[12px] font-bold";
    badge.textContent = u.status;
    tdStatus.appendChild(badge);
    const tdAction = document.createElement("td");
    tdAction.className = "px-8 py-6";
    const btn = document.createElement("button");
    btn.className = "text-primary font-label-md text-label-md hover:underline";
    btn.textContent = u.status === "banned" ? "Unlock" : "Lock";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        if (u.status === "banned") {
          await unlockUser(u.id);
          u.status = "active";
        } else {
          await lockUser(u.id);
          u.status = "banned";
        }
        renderUsers(rows, users);
      } finally {
        btn.disabled = false;
      }
    });
    tdAction.appendChild(btn);
    tr.appendChild(tdEmail);
    tr.appendChild(tdRole);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAction);
    rows.appendChild(tr);
  }
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  const status = qs("#admin-status");
  const usersCount = qs("#admin-users-count");
  const listingsCount = qs("#admin-listings-count");
  const lockedCount = qs("#admin-locked-count");
  const usersBody = qs("#admin-users-body");

  setStatus(status, "");
  try {
    const [users, locked, listings] = await Promise.all([adminUsers(), adminLockedUsers(), listListings()]);
    setText(usersCount, `${(users || []).length}`);
    setText(lockedCount, `${(locked || []).length}`);
    setText(listingsCount, `${(listings || []).length}`);
    if (usersBody) {
      renderUsers(usersBody, users || []);
    }
    initAvatars();
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
    setStatus(status, e.message || "Không tải được admin data", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
