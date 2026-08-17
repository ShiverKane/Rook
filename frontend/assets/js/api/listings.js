import { ensureSupabaseConfigLoaded, isSupabaseRest, request } from "./client.js";
import { getApiBase } from "../state.js";
import { me } from "./auth.js";

export const listAvailableListingsBySeller = async (sellerId) => {
  const sid = sellerId == null ? "" : String(sellerId).trim();
  if (!sid) {
    return [];
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const esc = encodeURIComponent(sid);
    return request(
      `listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.true&status=eq.available&seller_id=eq.${esc}&order=id.desc`,
      { method: "GET" }
    );
  }
  const all = await listListings();
  return (all || []).filter((l) => String(l?.seller_id) === sid && String(l?.status || "") === "available");
};

export const listListings = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.true&order=id.desc", { method: "GET" });
  }
  return request("/listings", { method: "GET" });
};

export const listPendingListings = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request("listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.false&order=id.desc", { method: "GET" });
  }
  return request("/listings/admin/pending", { method: "GET" });
};

export const approveListing = async (listingId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?id=eq.${Number(listingId)}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/admin/${Number(listingId)}/approve`, { method: "PATCH" });
};

export const listListingsByBook = async (bookId) => {
  const id = Number(bookId);
  if (!Number.isFinite(id)) {
    return [];
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&is_active=eq.true&book_id=eq.${id}&order=id.desc`, { method: "GET" });
  }
  const all = await listListings();
  return (all || []).filter((l) => Number(l.book_id) === id);
};

export const getListing = async (listingId) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    return null;
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?select=*,book:books(*,category:categories(*)),images:listing_images(*)&id=eq.${id}&limit=1`, { method: "GET" });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/${id}`, { method: "GET" });
};

export const myListings = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      return [];
    }
    return request(`listings?select=*,book:books(*),images:listing_images(*)&seller_id=eq.${user.id}&order=created_at.desc`, { method: "GET" });
  }
  return request("/user/me/listings", { method: "GET" });
};

export const createListing = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      throw new Error("You must be signed in to create a listing.");
    }
    const listingPayload = {
      book_id: payload.book_id,
      seller_id: user.id,
      price: payload.price,
      condition: payload.condition,
      status: payload.status || "available",
      is_active: payload.is_active !== false
    };
    const inserted = await request("listings", { method: "POST", body: JSON.stringify(listingPayload) });
    const listing = Array.isArray(inserted) ? inserted[0] : inserted;
    const urls = Array.isArray(payload.images) ? payload.images : [];
    const cleanUrls = urls.map((u) => String(u || "").trim()).filter(Boolean);
    if (listing?.id && cleanUrls.length) {
      const imgRows = cleanUrls.map((url) => ({ listing_id: listing.id, url }));
      await request("listing_images", { method: "POST", body: JSON.stringify(imgRows) });
    }
    if (!listing?.id) {
      return listing;
    }
    const out = await request(`listings?select=*,book:books(*),images:listing_images(*)&id=eq.${listing.id}&limit=1`, { method: "GET" });
    return Array.isArray(out) ? out[0] || listing : out;
  }
  return request("/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};

export const updateListing = async (listingId, payload) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid listing_id.");
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload || {}) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}) });
};

export const replaceListingImages = async (listingId, urls = []) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid listing_id.");
  }
  const clean = (urls || []).map((u) => String(u || "").trim()).filter(Boolean);
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    await request(`listing_images?listing_id=eq.${id}`, { method: "DELETE" });
    if (!clean.length) {
      return [];
    }
    const rows = clean.map((url) => ({ listing_id: id, url }));
    return request("listing_images", { method: "POST", body: JSON.stringify(rows) });
  }
  return request(`/listings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ images: clean }) });
};

export const markListingSold = async (listingId) => {
  const id = Number(listingId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid listing_id.");
  }
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const rows = await request(`listings?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "sold" }) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request(`/listings/${id}/sold`, { method: "PATCH" });
};

export const adminDeleteListing = async (listingId) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    return request(`listings?id=eq.${Number(listingId)}`, { method: "DELETE" });
  }
  return request(`/admin/posts/${listingId}`, { method: "DELETE" });
};
