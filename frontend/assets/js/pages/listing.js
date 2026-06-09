import { getListing, getPublicProfile } from "../api.js";
import { initAvatars } from "../app.js";
import { fmtVnd, qs, setStatus, setText } from "../ui.js";

const readListingId = (params) => {
  const raw = params?.get?.("id") || params?.get?.("listing_id") || "";
  const s = String(raw || "").trim();
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
};

const getListingId = (opts) => {
  const fromOpts = readListingId(opts?.query);
  if (fromOpts != null) return fromOpts;
  try {
    const fromSearch = readListingId(new URLSearchParams(location.search || ""));
    if (fromSearch != null) return fromSearch;
  } catch {}
  try {
    const h = String(location.hash || "");
    const idx = h.indexOf("?");
    if (idx >= 0) {
      const fromHash = readListingId(new URLSearchParams(h.slice(idx + 1)));
      if (fromHash != null) return fromHash;
    }
  } catch {}
  return null;
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  const status = qs("#listing-status");
  const imagesBox = qs("#listing-images");
  const titleEl = qs("#listing-title");
  const authorEl = qs("#listing-author");
  const priceEl = qs("#listing-price");
  const condEl = qs("#listing-condition");
  const stEl = qs("#listing-status-text");
  const idEl = qs("#listing-id");
  const descEl = qs("#listing-desc");

  const sellerName = qs("#seller-name");
  const sellerSub = qs("#seller-sub");
  const sellerAvatar = qs("#seller-avatar");
  const msgBtn = qs("#seller-message");
  const profileLink = qs("#seller-profile-link");

  setStatus(status, "");
  const listingId = getListingId(opts);
  if (!listingId) {
    setStatus(status, "Missing listing id.", "error");
    return;
  }

  try {
    const listing = await getListing(listingId);
    if (!listing?.id) {
      setStatus(status, "Listing not found.", "error");
      return;
    }

    const bookTitle = listing?.book?.title || (listing?.book_id != null ? `Book #${listing.book_id}` : "Listing");
    const author = listing?.book?.author || "";
    const desc = listing?.book?.description || "";
    setText(titleEl, bookTitle);
    setText(authorEl, author);
    setText(priceEl, fmtVnd(listing.price) || "");
    setText(condEl, listing.condition || "");
    setText(stEl, listing.status || "");
    setText(idEl, `#${listing.id}`);
    setText(descEl, desc || "—");

    if (imagesBox) {
      imagesBox.innerHTML = "";
      const urls = Array.isArray(listing.images) ? listing.images.map((x) => x?.url).filter(Boolean) : [];
      if (!urls.length) {
        const empty = document.createElement("div");
        empty.className = "h-56 bg-surface-container-low flex items-center justify-center text-outline";
        empty.textContent = "No images";
        imagesBox.appendChild(empty);
      } else {
        for (const u of urls.slice(0, 4)) {
          const wrap = document.createElement("div");
          wrap.className = "h-56 bg-surface-container-low overflow-hidden";
          const img = document.createElement("img");
          img.src = u;
          img.alt = bookTitle;
          img.className = "w-full h-full object-cover";
          wrap.appendChild(img);
          imagesBox.appendChild(wrap);
        }
      }
    }

    const sellerId = listing?.seller_id != null ? String(listing.seller_id) : "";
    if (sellerId) {
      try {
        const p = await getPublicProfile(sellerId);
        setText(sellerName, p?.name || p?.email || "Seller");
        setText(sellerSub, "");
        if (sellerAvatar) {
          sellerAvatar.setAttribute("data-avatar-name", p?.name || p?.email || "");
          sellerAvatar.setAttribute("data-avatar-url", p?.avatar_url || "");
          initAvatars();
        }
      } catch {
        setText(sellerName, "Seller");
        setText(sellerSub, "");
      }
    }

    if (profileLink) {
      const href = navigate ? `#/profile?id=${encodeURIComponent(sellerId)}` : `./profile.html?id=${encodeURIComponent(sellerId)}`;
      profileLink.setAttribute("href", href);
      if (navigate) {
        profileLink.addEventListener("click", (ev) => {
          ev.preventDefault();
          navigate(`/profile?id=${encodeURIComponent(sellerId)}`);
        });
      }
    }

    if (msgBtn) {
      msgBtn.addEventListener("click", () => {
        try {
          if (sellerId) localStorage.setItem("rook_msg_to", String(sellerId));
          localStorage.setItem("rook_msg_listing", String(listing.id));
        } catch {}
        if (navigate) {
          navigate("/messages");
          return;
        }
        location.href = "./messages.html";
      });
    }
  } catch (e) {
    setStatus(status, e?.message || "Couldn't load listing.", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
