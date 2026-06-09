import { listListingsByBook, searchBooks } from "../api.js";
import { qs, setStatus, fmtVnd, setText } from "../ui.js";

const debounce = (fn, waitMs) => {
  let t = null;
  return (...args) => {
    if (t) {
      clearTimeout(t);
    }
    t = setTimeout(() => fn(...args), waitMs);
  };
};

const setModeButton = (btn, active) => {
  if (!btn) {
    return;
  }
  btn.classList.toggle("bg-primary", active);
  btn.classList.toggle("text-on-primary", active);
  btn.classList.toggle("bg-surface-container-low", !active);
  btn.classList.toggle("text-on-surface", !active);
};

export const init = (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  const modeTitle = qs("#search-mode-title");
  const modeIsbn = qs("#search-mode-isbn");
  const input = qs("#search-input");
  const status = qs("#search-status");
  const suggestions = qs("#search-suggestions");
  const selectedLabel = qs("#search-selected");
  const listingsBox = qs("#search-listings");
  const lang = qs("#lang");
  const maxPrice = qs("#price");
  const applyBtn = qs("#search-apply");

  if (!input || !suggestions || !listingsBox) {
    return;
  }

  let mode = "title";
  let selectedBook = null;
  let listings = [];

  const applyMode = (next) => {
    mode = next === "isbn" ? "isbn" : "title";
    setModeButton(modeTitle, mode === "title");
    setModeButton(modeIsbn, mode === "isbn");
    input.placeholder = mode === "isbn" ? "Type ISBN..." : "Type book title...";
    suggestions.innerHTML = "";
    setStatus(status, "");
  };

  const parseMaxPrice = () => {
    const raw = String(maxPrice?.value || "").trim();
    if (!raw) {
      return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const filterListings = () => {
    const selectedLang = String(lang?.value || "Any");
    const max = parseMaxPrice();
    return (listings || []).filter((l) => {
      if (max != null) {
        const p = Number(l?.price);
        if (Number.isFinite(p) && p > max) {
          return false;
        }
      }
      if (selectedLang && selectedLang !== "Any") {
        const bl = String(l?.book?.language || l?.book?.language || "");
        if (bl !== selectedLang) {
          return false;
        }
      }
      return true;
    });
  };

  const renderListings = () => {
    const data = filterListings();
    listingsBox.innerHTML = "";
    if (!selectedBook) {
      if (selectedLabel) {
        setText(selectedLabel, "Select a book to view listings.");
      }
      return;
    }
    if (selectedLabel) {
      const extra = selectedBook.isbn ? ` • ISBN ${selectedBook.isbn}` : "";
      setText(selectedLabel, `${selectedBook.title || ""} — ${selectedBook.author || ""}${extra}`);
    }
    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "text-on-surface-variant text-[12px]";
      empty.textContent = "No listings for this book (or it hasn't been approved yet).";
      listingsBox.appendChild(empty);
      return;
    }
    for (const it of data) {
      const title = it.book?.title || `Book #${it.book_id}`;
      const author = it.book?.author || "";
      const img = it.images?.[0]?.url || "";
      const card = document.createElement("article");
      card.className = "bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden soft-shadow";
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        if (!it?.id) return;
        if (navigate) {
          navigate(`/listing?id=${it.id}`);
          return;
        }
        location.href = `./listing.html?id=${it.id}`;
      });
      const cover = document.createElement("div");
      cover.className = "h-40 bg-surface-container-low flex items-center justify-center text-outline overflow-hidden";
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
      body.className = "p-5";
      const h = document.createElement("div");
      h.className = "font-headline-md text-headline-md text-on-surface";
      setText(h, title);
      const a = document.createElement("div");
      a.className = "text-on-surface-variant mt-1";
      setText(a, author);
      const row = document.createElement("div");
      row.className = "mt-4 flex justify-between items-center";
      const price = document.createElement("div");
      price.className = "font-bold text-primary";
      setText(price, fmtVnd(it.price));
      const link = document.createElement("a");
      link.className = "px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md";
      link.textContent = "Message";
      if (navigate) {
        link.href = "#/messages";
        link.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          try {
            if (it?.seller_id) {
              localStorage.setItem("rook_msg_to", String(it.seller_id));
            }
            if (it?.id != null) {
              localStorage.setItem("rook_msg_listing", String(it.id));
            }
          } catch {}
          navigate("/messages");
        });
      } else {
        link.href = "./messages.html";
        link.addEventListener("click", (ev) => {
          ev.stopPropagation();
          try {
            if (it?.seller_id) {
              localStorage.setItem("rook_msg_to", String(it.seller_id));
            }
            if (it?.id != null) {
              localStorage.setItem("rook_msg_listing", String(it.id));
            }
          } catch {}
        });
      }
      row.appendChild(price);
      row.appendChild(link);
      body.appendChild(h);
      body.appendChild(a);
      body.appendChild(row);
      card.appendChild(cover);
      card.appendChild(body);
      listingsBox.appendChild(card);
    }
  };

  const selectBook = async (book) => {
    selectedBook = book || null;
    suggestions.innerHTML = "";
    listingsBox.innerHTML = "";
    listings = [];
    if (!selectedBook) {
      renderListings();
      return;
    }
    setStatus(status, "");
    try {
      listings = await listListingsByBook(selectedBook.id);
      renderListings();
    } catch (e) {
      setStatus(status, e?.message || "Couldn't load listings.", "error");
    }
  };

  const renderSuggestions = (items) => {
    suggestions.innerHTML = "";
    if (!items.length) {
      return;
    }
    for (const b of items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full text-left p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all";
      const t = document.createElement("div");
      t.className = "font-headline-md text-headline-md";
      t.textContent = b.title || "";
      const sub = document.createElement("div");
      sub.className = "text-on-surface-variant mt-1 text-[12px]";
      const isbnText = b.isbn ? ` • ISBN ${b.isbn}` : "";
      sub.textContent = `${b.author || ""}${isbnText}`;
      row.appendChild(t);
      row.appendChild(sub);
      row.addEventListener("click", () => {
        input.value = mode === "isbn" && b.isbn ? b.isbn : b.title || "";
        void selectBook(b);
      });
      suggestions.appendChild(row);
    }
  };

  const runSuggest = debounce(async () => {
    const q = input.value.trim();
    if (!q) {
      suggestions.innerHTML = "";
      return;
    }
    setStatus(status, "");
    try {
      const items = await searchBooks(q, mode);
      renderSuggestions(items || []);
    } catch (e) {
      suggestions.innerHTML = "";
      setStatus(status, e?.message || "Search failed.", "error");
    }
  }, 200);

  input.addEventListener("input", () => runSuggest());
  input.addEventListener("focus", () => runSuggest());
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      suggestions.innerHTML = "";
    }
  });

  modeTitle?.addEventListener("click", () => applyMode("title"));
  modeIsbn?.addEventListener("click", () => applyMode("isbn"));

  const applyFilters = () => renderListings();
  applyBtn?.addEventListener("click", applyFilters);
  lang?.addEventListener("change", applyFilters);
  maxPrice?.addEventListener("input", applyFilters);

  applyMode("title");
  renderListings();
};

document.addEventListener("DOMContentLoaded", () => init());
