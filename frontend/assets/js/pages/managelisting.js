import { createBook, createCategory, createListing, getListing, listBooks, listCategories, me, replaceListingImages, updateListing, uploadListingImages } from "../api.js";
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

const getListingIdForEdit = (opts) => {
  const read = (params) => {
    const raw = params?.get?.("id") ?? params?.get?.("listing_id");
    if (raw == null) {
      return null;
    }
    const s = String(raw).trim();
    if (!s) {
      return null;
    }
    const n = Number.parseInt(s, 10);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return n;
  };

  const fromOpts = read(opts?.query);
  if (fromOpts != null) {
    return fromOpts;
  }

  try {
    const s = new URLSearchParams(location.search || "");
    const v = read(s);
    if (v != null) return v;
  } catch {}

  try {
    const h = String(location.hash || "");
    const idx = h.indexOf("?");
    if (idx >= 0) {
      const s = new URLSearchParams(h.slice(idx + 1));
      const v = read(s);
      if (v != null) return v;
    }
  } catch {}

  return null;
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  try {
    const user = await me();
    if (!user?.id) {
      clearToken();
      if (navigate) {
        navigate("/signin");
        return;
      }
      location.href = "./signin.html";
      return;
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
  }
  const statusEl = qs("#listing-status");
  const btn = qs("#listing-submit");
  const btnLabel = qs("#listing-submit-label");
  const heading = qs("#listing-heading");
  const subheading = qs("#listing-subheading");
  const bookId = qs("#book_id");
  const bookOther = qs("#book-other");
  const condition = qs("#condition");
  const price = qs("#price");
  const st = qs("#status");
  const imageFiles = qs("#image_files");
  const imageHint = qs("#image-files-hint");
  const modal = qs("#book-modal");
  const modalClose = qs("#book-modal-close");
  const modalCancel = qs("#book-cancel");
  const modalSave = qs("#book-save");
  const modalStatus = qs("#book-modal-status");
  const titleInput = qs("#book_title");
  const authorInput = qs("#book_author");
  const categorySelect = qs("#book_category");
  const catOther = qs("#cat-other");
  const languageInput = qs("#book_language");
  const isbnInput = qs("#book_isbn");
  const descInput = qs("#book_description");
  const catModal = qs("#cat-modal");
  const catModalClose = qs("#cat-modal-close");
  const catModalCancel = qs("#cat-cancel");
  const catModalSave = qs("#cat-save");
  const catModalStatus = qs("#cat-modal-status");
  const catNameInput = qs("#cat_name");
  const catDescInput = qs("#cat_description");

  if (!btn) {
    return;
  }

  const editListingId = getListingIdForEdit(opts);
  const isEdit = editListingId != null;

  if (heading) {
    heading.textContent = isEdit ? "Edit Listing" : "List a New Treasure";
  }
  if (subheading) {
    subheading.textContent = isEdit ? `Update your listing #${editListingId}.` : "Add a listing and include 0..n image URLs.";
  }
  if (btnLabel) {
    btnLabel.textContent = isEdit ? "Update Listing" : "Create Listing";
  }

  const openModal = () => {
    if (!modal) {
      return;
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    setStatus(modalStatus, "");
  };

  const closeModal = () => {
    if (!modal) {
      return;
    }
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    setStatus(modalStatus, "");
  };

  const addBookOption = (book, opts = {}) => {
    if (!bookId) {
      return;
    }
    const opt = document.createElement("option");
    opt.value = String(book.id);
    const suffix = opts.pending ? " (pending)" : "";
    opt.textContent = `${book.title || `#${book.id}`} — ${book.author || ""}${suffix}`;
    bookId.appendChild(opt);
    if (opts.select !== false) {
      bookId.value = String(book.id);
    }
  };

  const addCategoryOption = (cat, opts = {}) => {
    if (!categorySelect) {
      return;
    }
    const opt = document.createElement("option");
    opt.value = String(cat.id);
    const suffix = opts.pending ? " (pending)" : "";
    opt.textContent = `${cat.name || `#${cat.id}`}${suffix}`;
    categorySelect.appendChild(opt);
    if (opts.select !== false) {
      categorySelect.value = String(cat.id);
    }
  };

  let existing = null;
  if (isEdit) {
    try {
      existing = await getListing(editListingId);
      if (!existing?.id) {
        throw new Error("Listing not found.");
      }
    } catch (e) {
      setStatus(statusEl, e?.message || "Couldn't load listing for editing.", "error");
      return;
    }
  }

  try {
    if (bookId) {
      bookId.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select a book...";
      bookId.appendChild(placeholder);
      const books = await listBooks();
      for (const b of books || []) {
        addBookOption(b, { pending: b.is_approved === false, select: false });
      }
      bookId.value = "";
    }
    if (categorySelect) {
      categorySelect.innerHTML = "";
      const none = document.createElement("option");
      none.value = "";
      none.textContent = "—";
      categorySelect.appendChild(none);
      const cats = await listCategories();
      for (const c of cats || []) {
        addCategoryOption(c, { pending: c.is_approved === false, select: false });
      }
      categorySelect.value = "";
    }
  } catch (e) {
    setStatus(statusEl, e?.message || "Couldn't load books list.", "error");
  }

  if (isEdit && existing) {
    if (bookId) {
      const target = String(existing.book_id || "");
      if (target && !Array.from(bookId.options || []).some((o) => String(o.value) === target)) {
        addBookOption({ id: existing.book_id, title: existing?.book?.title || `#${existing.book_id}`, author: existing?.book?.author || "" }, { select: false });
      }
      bookId.value = target;
    }
    if (condition) {
      condition.value = existing.condition || "";
    }
    if (price) {
      price.value = existing.price != null ? String(existing.price) : "";
    }
    if (st) {
      st.value = existing.status || "available";
    }
    if (imageHint) {
      const count = Array.isArray(existing.images) ? existing.images.length : 0;
      imageHint.textContent = count ? `Current: ${count} image(s). Choose files to replace (optional).` : "Choose files to upload (optional).";
    }
  }

  const openCatModal = () => {
    if (!catModal) {
      return;
    }
    catModal.classList.remove("hidden");
    catModal.classList.add("flex");
    setStatus(catModalStatus, "");
  };

  const closeCatModal = () => {
    if (!catModal) {
      return;
    }
    catModal.classList.add("hidden");
    catModal.classList.remove("flex");
    setStatus(catModalStatus, "");
  };

  if (bookOther) {
    bookOther.addEventListener("click", () => openModal());
  }
  if (modalClose) {
    modalClose.addEventListener("click", () => closeModal());
  }
  if (modalCancel) {
    modalCancel.addEventListener("click", () => closeModal());
  }
  if (modal) {
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) {
        closeModal();
      }
    });
  }

  if (catOther) {
    catOther.addEventListener("click", () => openCatModal());
  }
  if (catModalClose) {
    catModalClose.addEventListener("click", () => closeCatModal());
  }
  if (catModalCancel) {
    catModalCancel.addEventListener("click", () => closeCatModal());
  }
  if (catModal) {
    catModal.addEventListener("click", (ev) => {
      if (ev.target === catModal) {
        closeCatModal();
      }
    });
  }

  if (catModalSave) {
    catModalSave.addEventListener("click", async () => {
      setStatus(catModalStatus, "");
      catModalSave.disabled = true;
      try {
        const name = catNameInput?.value?.trim() || "";
        if (!name) {
          throw new Error("Please enter a name.");
        }
        const description = (catDescInput?.value || "").trim() || null;
        const created = await createCategory({
          name,
          description: description || undefined,
          is_approved: false
        });
        if (!created?.id) {
          throw new Error("Failed to create category.");
        }
        addCategoryOption(created, { pending: true });
        closeCatModal();
      } catch (e) {
        const detail = e?.data ? `\n${typeof e.data === "string" ? e.data : JSON.stringify(e.data)}` : "";
        setStatus(catModalStatus, `${e?.message || "Failed to create category."}${detail}`, "error");
      } finally {
        catModalSave.disabled = false;
      }
    });
  }

  if (modalSave) {
    modalSave.addEventListener("click", async () => {
      setStatus(modalStatus, "");
      modalSave.disabled = true;
      try {
        const title = titleInput?.value?.trim() || "";
        const author = authorInput?.value?.trim() || "";
        if (!title) {
          throw new Error("Please enter a title.");
        }
        if (!author) {
          throw new Error("Please enter an author.");
        }
        const lang = (languageInput?.value || "").trim() || "und";
        const isbn = (isbnInput?.value || "").trim() || null;
        const description = (descInput?.value || "").trim() || null;
        const categoryIdRaw = categorySelect?.value || "";
        const category_id = categoryIdRaw ? Number(categoryIdRaw) : null;
        const created = await createBook({
          title,
          author,
          language: lang,
          isbn: isbn || undefined,
          description: description || undefined,
          category_id: Number.isFinite(category_id) ? category_id : undefined,
          is_approved: false
        });
        if (!created?.id) {
          throw new Error("Failed to create book.");
        }
        addBookOption(created, { pending: true });
        closeModal();
      } catch (e) {
        const detail = e?.data ? `\n${typeof e.data === "string" ? e.data : JSON.stringify(e.data)}` : "";
        setStatus(modalStatus, `${e?.message || "Failed to create book."}${detail}`, "error");
      } finally {
        modalSave.disabled = false;
      }
    });
  }

  if (imageFiles) {
    imageFiles.addEventListener("change", () => {
      const names = Array.from(imageFiles.files || []).map((f) => f?.name).filter(Boolean);
      if (imageHint) {
        imageHint.textContent = names.length ? `${names.length} file(s): ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}` : "";
      }
    });
  }

  btn.addEventListener("click", async () => {
    setStatus(statusEl, "");
    btn.disabled = true;
    try {
      const selectedBook = bookId?.value || "";
      if (!selectedBook) {
        throw new Error("Please select a book.");
      }
      if (isEdit && existing?.id) {
        const payload = {
          book_id: Number(selectedBook),
          price: Number(price?.value),
          condition: condition?.value || "",
          status: st?.value || "available"
        };
        await updateListing(existing.id, payload);
        const selectedFiles = Array.from(imageFiles?.files || []);
        if (selectedFiles.length) {
          const urls = await uploadListingImages(selectedFiles);
          await replaceListingImages(existing.id, urls);
        }
        setStatus(statusEl, `Updated listing #${existing.id}.`, "success");
        setTimeout(() => {
          if (navigate) {
            navigate("/sellerdashboard");
            return;
          }
          location.href = "./sellerdashboard.html";
        }, 400);
      } else {
        const urls = await uploadListingImages(imageFiles?.files || []);
        const payload = {
          book_id: Number(selectedBook),
          price: Number(price?.value),
          condition: condition?.value || "",
          status: st?.value || "available",
          is_active: false,
          images: urls
        };
        const out = await createListing(payload);
        setStatus(statusEl, `Created listing #${out.id}. Pending admin approval.`, "success");
        setTimeout(() => {
          if (navigate) {
            navigate("/marketplace");
            return;
          }
          location.href = "./marketplace.html";
        }, 400);
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
      setStatus(statusEl, e.message || "Failed to create listing.", "error");
    } finally {
      btn.disabled = false;
    }
  });
};

document.addEventListener("DOMContentLoaded", () => init());
