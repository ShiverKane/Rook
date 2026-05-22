import { createListing } from "../api.js";
import { getToken, clearToken } from "../state.js";
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

export const init = (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  const statusEl = qs("#listing-status");
  const btn = qs("#listing-submit");
  const bookId = qs("#book_id");
  const condition = qs("#condition");
  const price = qs("#price");
  const st = qs("#status");
  const images = qs("#images");

  if (!btn) {
    return;
  }

  btn.addEventListener("click", async () => {
    setStatus(statusEl, "");
    btn.disabled = true;
    try {
      const urls = (images?.value || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        book_id: Number(bookId?.value),
        price: Number(price?.value),
        condition: condition?.value || "",
        status: st?.value || "available",
        is_active: true,
        images: urls
      };
      const out = await createListing(payload);
      setStatus(statusEl, `Đã tạo listing #${out.id}`, "success");
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
      setStatus(statusEl, e.message || "Tạo listing thất bại", "error");
    } finally {
      btn.disabled = false;
    }
  });
};

document.addEventListener("DOMContentLoaded", () => init());
