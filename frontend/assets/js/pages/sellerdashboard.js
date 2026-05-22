import { me, myListings } from "../api.js";
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

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  const status = qs("#seller-status");
  const userName = qs("#seller-name");
  const avatar = qs("#seller-avatar");
  const activeCount = qs("#seller-active-count");
  const listingsBox = qs("#seller-listings");

  setStatus(status, "");
  try {
    const user = await me();
    setText(userName, user.name || user.email || "");
    if (avatar) {
      avatar.setAttribute("data-avatar-name", user.name || user.email || "");
      avatar.setAttribute("data-avatar-url", user.avatar_url || "");
      initAvatars();
    }
    const listings = await myListings();
    const active = (listings || []).filter((l) => l.is_active).length;
    setText(activeCount, `${active}`);
    if (listingsBox) {
      listingsBox.innerHTML = "";
      for (const l of (listings || []).slice(0, 8)) {
        const row = document.createElement("div");
        row.className = "p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all flex items-center justify-between";
        const left = document.createElement("div");
        const t = document.createElement("div");
        t.className = "font-label-md text-label-md text-on-surface";
        t.textContent = l.book?.title || `Listing #${l.id}`;
        const s = document.createElement("div");
        s.className = "text-on-surface-variant text-[12px] mt-1";
        s.textContent = `${l.status} • ${l.price}`;
        left.appendChild(t);
        left.appendChild(s);
        const link = document.createElement("a");
        link.className = "text-primary font-label-md text-label-md hover:underline";
        if (navigate) {
          link.href = "#/managelisting";
          link.addEventListener("click", (ev) => {
            ev.preventDefault();
            navigate("/managelisting");
          });
        } else {
          link.href = "./managelisting.html";
        }
        link.textContent = "Edit";
        row.appendChild(left);
        row.appendChild(link);
        listingsBox.appendChild(row);
      }
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
    setStatus(status, e.message || "Không tải được dữ liệu", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
