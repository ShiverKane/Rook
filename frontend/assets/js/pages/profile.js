import { getPublicProfile, listAvailableListingsBySeller, me, updateMe } from "../api.js";
import { getToken, clearToken } from "../state.js";
import { initAvatars } from "../app.js";
import { fmtVnd, qs, setStatus, setText } from "../ui.js";

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

const readQueryId = (params) => {
  const raw = params?.get?.("id") || params?.get?.("user_id") || "";
  const s = String(raw || "").trim();
  return s || null;
};

const getTargetId = (opts) => {
  const fromOpts = readQueryId(opts?.query);
  if (fromOpts) {
    return fromOpts;
  }
  try {
    const fromSearch = readQueryId(new URLSearchParams(location.search || ""));
    if (fromSearch) {
      return fromSearch;
    }
  } catch {}
  try {
    const h = String(location.hash || "");
    const idx = h.indexOf("?");
    if (idx >= 0) {
      const fromHash = readQueryId(new URLSearchParams(h.slice(idx + 1)));
      if (fromHash) {
        return fromHash;
      }
    }
  } catch {}
  return null;
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }

  const status = qs("#profile-status");
  const titleEl = qs("#profile-title");
  const memberSince = qs("#profile-member-since");
  const badges = qs("#profile-badges");
  const nameInput = qs("#profile-name");
  const avatarInput = qs("#profile-avatar");
  const saveBtn = qs("#profile-save");
  const avatarBlock = qs("[data-avatar]");
  const dashboardLink = qs("#profile-dashboard-link");
  const listingsBox = qs("#profile-listings");
  const listingsSubtitle = qs("#profile-listings-subtitle");

  const targetId = getTargetId(opts);
  setStatus(status, "");

  const renderListings = (items) => {
    if (!listingsBox) {
      return;
    }
    const data = Array.isArray(items) ? items : [];
    listingsBox.innerHTML = "";
    if (listingsSubtitle) {
      setText(listingsSubtitle, data.length ? `${data.length} available` : "No available listings");
    }
    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "text-on-surface-variant text-[12px]";
      empty.textContent = "No available listings.";
      listingsBox.appendChild(empty);
      return;
    }
    for (const l of data.slice(0, 8)) {
      const title = l?.book?.title || (l?.book_id != null ? `Book #${l.book_id}` : "Listing");
      const author = l?.book?.author || "";
      const img = l?.images?.[0]?.url || "";

      const card = document.createElement("div");
      card.className = "rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low cursor-pointer";
      card.addEventListener("click", () => {
        if (!l?.id) return;
        if (navigate) {
          navigate(`/listing?id=${l.id}`);
          return;
        }
        location.href = `./listing.html?id=${l.id}`;
      });

      const cover = document.createElement("div");
      cover.className = "h-24 bg-surface-container-high flex items-center justify-center text-outline overflow-hidden";
      if (img) {
        const image = document.createElement("img");
        image.src = img;
        image.alt = title;
        image.className = "w-full h-full object-cover";
        cover.appendChild(image);
      } else {
        cover.textContent = "No image";
      }

      const body = document.createElement("div");
      body.className = "p-4";
      const h = document.createElement("div");
      h.className = "font-label-md text-label-md text-on-surface truncate";
      h.textContent = title;
      const sub = document.createElement("div");
      sub.className = "text-on-surface-variant text-[12px] mt-1 truncate";
      sub.textContent = author;
      const price = document.createElement("div");
      price.className = "text-primary font-bold mt-2";
      price.textContent = fmtVnd(l?.price) || "";
      body.appendChild(h);
      body.appendChild(sub);
      body.appendChild(price);

      card.appendChild(cover);
      card.appendChild(body);
      listingsBox.appendChild(card);
    }
  };

  try {
    const self = await me();
    const isSelf = !targetId || String(self?.id) === String(targetId);
    const user = isSelf ? self : await getPublicProfile(targetId);

    if (titleEl) {
      titleEl.textContent = user?.name || user?.email || "Profile";
    }

    if (memberSince) {
      memberSince.innerHTML = "";
      memberSince.className = "flex items-center gap-2";
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined text-base";
      icon.textContent = "calendar_today";
      const year = user?.created_at ? new Date(user.created_at).getFullYear() : null;
      const label = document.createElement("span");
      label.textContent = `Member since ${year || "—"}`;
      memberSince.appendChild(icon);
      memberSince.appendChild(label);
    }

    const sid = isSelf ? self?.id : targetId;
    const listings = await listAvailableListingsBySeller(sid);
    renderListings(listings);

    if (badges) {
      badges.innerHTML = "";
      const mk = (text, cls) => {
        const s = document.createElement("span");
        s.className = cls || "px-4 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-md";
        s.textContent = text;
        return s;
      };
      if ((listings || []).length > 0) {
        badges.appendChild(mk("Seller"));
      }
      if (isSelf) {
        badges.appendChild(mk(self?.role === "admin" ? "Admin" : "User"));
        if (self?.status === "banned") {
          badges.appendChild(mk("Banned", "px-4 py-1 bg-error-container text-on-error-container rounded-full text-label-md"));
        }
      } else {
        badges.appendChild(mk("Public profile", "px-4 py-1 bg-surface-container-low text-on-surface rounded-full text-label-md"));
      }
    }

    if (nameInput) {
      nameInput.value = user?.name || "";
      nameInput.disabled = !isSelf;
    }
    if (avatarInput) {
      avatarInput.value = user?.avatar_url || "";
      avatarInput.disabled = !isSelf;
    }
    if (avatarBlock) {
      avatarBlock.setAttribute("data-avatar-name", user?.name || user?.email || "");
      avatarBlock.setAttribute("data-avatar-url", user?.avatar_url || "");
      initAvatars();
    }
    if (saveBtn) {
      saveBtn.style.display = isSelf ? "" : "none";
    }
    if (dashboardLink) {
      dashboardLink.style.display = isSelf ? "" : "none";
    }
  } catch (e) {
    if (e?.status === 401) {
      clearToken();
      if (navigate) {
        navigate("/signin");
        return;
      }
      location.href = "./signin.html";
      return;
    }
    setStatus(status, e?.message || "Couldn't load profile.", "error");
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      setStatus(status, "");
      saveBtn.disabled = true;
      try {
        const payload = {
          name: (nameInput?.value || "").trim() || undefined,
          avatar_url: (avatarInput?.value || "").trim() || undefined
        };
        const updated = await updateMe(payload);
        setStatus(status, "Saved.", "success");
        if (avatarBlock) {
          avatarBlock.setAttribute("data-avatar-name", updated?.name || updated?.email || "");
          avatarBlock.setAttribute("data-avatar-url", updated?.avatar_url || "");
          initAvatars();
        }
      } catch (e) {
        setStatus(status, e?.message || "Save failed.", "error");
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
