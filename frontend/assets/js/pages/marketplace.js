import { listCategories, listBooks, listListings } from "../api.js";
import { qs, setText, fmtVnd } from "../ui.js";

const render = (items, navigate) => {
  const grid = qs("#marketplace-grid");
  if (!grid) {
    return;
  }
  grid.innerHTML = "";
  for (const it of items) {
    const title = it.book?.title || `Book #${it.book_id}`;
    const author = it.book?.author || "";
    const img = it.images?.[0]?.url || "";
    const card = document.createElement("article");
    card.className = "bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden soft-shadow";
    const cover = document.createElement("div");
    cover.className = "h-48 bg-surface-container-low flex items-center justify-center text-outline overflow-hidden";
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
    body.className = "p-6";
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
    if (navigate) {
      link.href = "#/messages";
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        navigate("/messages");
      });
    } else {
      link.href = "./messages.html";
    }
    link.textContent = "Message";
    row.appendChild(price);
    row.appendChild(link);
    body.appendChild(h);
    body.appendChild(a);
    body.appendChild(row);
    card.appendChild(cover);
    card.appendChild(body);
    grid.appendChild(card);
  }
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  const status = qs("#marketplace-status");
  const categorySelect = qs("#marketplace-category");
  try {
    const [categories, books, listings] = await Promise.all([listCategories(), listBooks(), listListings()]);
    const bookById = new Map((books || []).map((b) => [b.id, b]));

    if (categorySelect) {
      const current = categorySelect.value;
      categorySelect.innerHTML = `<option value="">All</option>`;
      for (const c of categories || []) {
        const opt = document.createElement("option");
        opt.value = `${c.id}`;
        opt.textContent = c.name || `${c.id}`;
        categorySelect.appendChild(opt);
      }
      if (current) {
        categorySelect.value = current;
      }
    }

    const getCategoryId = (listing) => {
      const fromJoin = listing?.book?.category_id ?? listing?.book?.category?.id ?? null;
      if (fromJoin != null) {
        return Number(fromJoin);
      }
      const b = bookById.get(listing?.book_id);
      if (b?.category_id != null) {
        return Number(b.category_id);
      }
      return null;
    };

    const filterAndRender = () => {
      const selected = categorySelect?.value ? Number(categorySelect.value) : null;
      const data = (listings || []).filter((l) => {
        if (!selected) {
          return true;
        }
        return getCategoryId(l) === selected;
      });
      render(data, navigate);
    };

    categorySelect?.addEventListener("change", () => filterAndRender());
    filterAndRender();
    if (status) {
      status.style.display = "none";
    }
  } catch (e) {
    if (status) {
      status.style.display = "block";
      status.textContent = e.message || "Không tải được listings";
      status.className = "text-error text-[12px] mt-3";
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
