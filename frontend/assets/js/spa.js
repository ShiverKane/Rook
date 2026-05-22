import { clearToken, getToken } from "./state.js";
import { me, listBooks, createBook, updateBook, deleteBook, listCategories, createCategory, updateCategory, deleteCategory } from "./api.js";
import { qs, setStatus, setText } from "./ui.js";

const normalizeRoute = (hash) => {
  const raw = (hash || "").replace(/^#/, "").trim();
  if (!raw) {
    return "/home";
  }
  if (raw.startsWith("/")) {
    return raw;
  }
  if (raw.startsWith("!/")) {
    return raw.slice(1);
  }
  return `/${raw}`;
};

const navigate = (path) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (location.hash === `#${p}`) {
    void handleRoute();
    return;
  }
  location.hash = `#${p}`;
};

const rewriteLinks = (root) => {
  const anchors = root.querySelectorAll("a[href]");
  for (const a of anchors) {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) {
      continue;
    }
    const m = href.match(/(?:^|\/)([a-z0-9\-]+)\.html$/i);
    if (m) {
      a.setAttribute("href", `#/${m[1]}`);
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        navigate(`/${m[1]}`);
      });
    }
  }
};

const stripScripts = (root) => {
  const scripts = root.querySelectorAll("script");
  for (const s of scripts) {
    s.remove();
  }
};

const loadPageBody = async (relPath) => {
  const resp = await fetch(relPath, { cache: "no-cache" });
  if (!resp.ok) {
    throw new Error(`Không tải được ${relPath}`);
  }
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.querySelector("body");
  const main = doc.querySelector("main");
  const title = doc.querySelector("title")?.textContent || "";
  const container = document.createElement("div");
  if (main) {
    container.innerHTML = main.outerHTML;
  } else {
    container.innerHTML = body ? body.innerHTML : html;
  }
  stripScripts(container);
  rewriteLinks(container);
  return { title, node: container };
};

const setActiveNav = (route) => {
  const links = document.querySelectorAll("[data-nav]");
  for (const l of links) {
    const target = l.getAttribute("data-nav");
    const active = target === route;
    l.classList.toggle("text-primary", active);
    l.classList.toggle("font-bold", active);
    l.classList.toggle("text-on-surface-variant", !active);
  }
};

const renderShellAuth = async () => {
  const who = qs("#spa-who");
  const authBtn = qs("#spa-auth");
  const navAdmin = qs('[data-nav="/admin-dashboard"]');
  const navCrud = qs('[data-nav="/crud"]');

  if (!authBtn || !who) {
    return;
  }

  if (!getToken()) {
    setText(who, "Guest");
    authBtn.textContent = "Sign in";
    authBtn.onclick = () => navigate("/signin");
    if (navAdmin) navAdmin.style.display = "none";
    if (navCrud) navCrud.style.display = "none";
    return;
  }

  try {
    const user = await me();
    setText(who, user.name || user.email || "");
    authBtn.textContent = "Sign out";
    authBtn.onclick = () => {
      clearToken();
      navigate("/signin");
      void renderShellAuth();
    };
    const isAdmin = user.role === "admin";
    if (navAdmin) navAdmin.style.display = isAdmin ? "" : "none";
    if (navCrud) navCrud.style.display = isAdmin ? "" : "none";
  } catch {
    clearToken();
    setText(who, "Guest");
    authBtn.textContent = "Sign in";
    authBtn.onclick = () => navigate("/signin");
    if (navAdmin) navAdmin.style.display = "none";
    if (navCrud) navCrud.style.display = "none";
  }
};

const renderCrud = async (mount) => {
  mount.innerHTML = `
    <main class="max-w-container-max mx-auto px-margin-page py-stack-lg">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-background">Admin CRUD</h1>
          <p class="text-on-surface-variant mt-2">Quản lý categories và books.</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="crud-refresh" class="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:opacity-90">Refresh</button>
        </div>
      </div>
      <div id="crud-status" style="display:none;"></div>

      <section class="mt-stack-lg grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl soft-shadow overflow-hidden">
          <div class="p-6 border-b border-outline-variant/20">
            <div class="font-headline-md text-headline-md text-on-surface">Categories</div>
            <div class="text-on-surface-variant text-[12px] mt-1">Create / Update / Delete</div>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input id="cat-id" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="id (để trống = create)" />
              <input id="cat-name" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="name" />
              <input id="cat-desc" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="description" />
            </div>
            <div class="flex items-center gap-2">
              <button id="cat-save" class="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90">Save</button>
              <button id="cat-clear" class="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:opacity-90">Clear</button>
            </div>
            <div class="overflow-auto border border-outline-variant/20 rounded-lg">
              <table class="w-full text-left">
                <thead class="bg-surface-container-low">
                  <tr>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">ID</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Name</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Description</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody id="cat-rows"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl soft-shadow overflow-hidden">
          <div class="p-6 border-b border-outline-variant/20">
            <div class="font-headline-md text-headline-md text-on-surface">Books</div>
            <div class="text-on-surface-variant text-[12px] mt-1">Create / Update / Delete</div>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input id="book-id" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="id (để trống = create)" />
              <select id="book-category" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3">
                <option value="">category_id (optional)</option>
              </select>
              <input id="book-title" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="title" />
              <input id="book-author" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="author" />
              <input id="book-language" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="language" />
              <input id="book-isbn" class="bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" placeholder="isbn" />
            </div>
            <textarea id="book-desc" class="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3" rows="3" placeholder="description"></textarea>
            <div class="flex items-center gap-2">
              <button id="book-save" class="px-4 py-2 rounded-lg bg-primary text-on-primary hover:opacity-90">Save</button>
              <button id="book-clear" class="px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:opacity-90">Clear</button>
            </div>
            <div class="overflow-auto border border-outline-variant/20 rounded-lg">
              <table class="w-full text-left">
                <thead class="bg-surface-container-low">
                  <tr>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">ID</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Title</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Author</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Category</th>
                    <th class="px-4 py-3 text-[12px] text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody id="book-rows"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

  const status = qs("#crud-status");
  const refreshBtn = qs("#crud-refresh");

  const catId = qs("#cat-id");
  const catName = qs("#cat-name");
  const catDesc = qs("#cat-desc");
  const catSave = qs("#cat-save");
  const catClear = qs("#cat-clear");
  const catRows = qs("#cat-rows");

  const bookId = qs("#book-id");
  const bookCategory = qs("#book-category");
  const bookTitle = qs("#book-title");
  const bookAuthor = qs("#book-author");
  const bookLanguage = qs("#book-language");
  const bookIsbn = qs("#book-isbn");
  const bookDesc = qs("#book-desc");
  const bookSave = qs("#book-save");
  const bookClear = qs("#book-clear");
  const bookRows = qs("#book-rows");

  const safeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const fillCategorySelect = (categories) => {
    if (!bookCategory) {
      return;
    }
    const current = bookCategory.value;
    bookCategory.innerHTML = `<option value="">category_id (optional)</option>`;
    for (const c of categories) {
      const opt = document.createElement("option");
      opt.value = `${c.id}`;
      opt.textContent = `${c.id} • ${c.name}`;
      bookCategory.appendChild(opt);
    }
    if (current) {
      bookCategory.value = current;
    }
  };

  const loadAll = async () => {
    setStatus(status, "");
    try {
      const user = await me();
      if (user.role !== "admin") {
        setStatus(status, "Chỉ admin mới dùng được trang CRUD.", "error");
        return;
      }
      const [categories, books] = await Promise.all([listCategories(), listBooks()]);
      fillCategorySelect(categories || []);

      if (catRows) {
        catRows.innerHTML = "";
        for (const c of categories || []) {
          const tr = document.createElement("tr");
          tr.className = "hover:bg-surface-container-low/30 transition-colors";
          tr.innerHTML = `
            <td class="px-4 py-3 text-body-md text-on-surface">${c.id}</td>
            <td class="px-4 py-3 text-body-md text-on-surface">${c.name || ""}</td>
            <td class="px-4 py-3 text-body-md text-on-surface-variant">${c.description || ""}</td>
            <td class="px-4 py-3 text-body-md">
              <button data-cat-edit="${c.id}" class="text-primary hover:underline">Edit</button>
              <span class="text-outline px-2">|</span>
              <button data-cat-del="${c.id}" class="text-error hover:underline">Delete</button>
            </td>
          `;
          catRows.appendChild(tr);
        }
      }

      if (bookRows) {
        bookRows.innerHTML = "";
        for (const b of books || []) {
          const tr = document.createElement("tr");
          tr.className = "hover:bg-surface-container-low/30 transition-colors";
          tr.innerHTML = `
            <td class="px-4 py-3 text-body-md text-on-surface">${b.id}</td>
            <td class="px-4 py-3 text-body-md text-on-surface">${b.title || ""}</td>
            <td class="px-4 py-3 text-body-md text-on-surface-variant">${b.author || ""}</td>
            <td class="px-4 py-3 text-body-md text-on-surface-variant">${b.category_id ?? ""}</td>
            <td class="px-4 py-3 text-body-md">
              <button data-book-edit="${b.id}" class="text-primary hover:underline">Edit</button>
              <span class="text-outline px-2">|</span>
              <button data-book-del="${b.id}" class="text-error hover:underline">Delete</button>
            </td>
          `;
          bookRows.appendChild(tr);
        }
      }
    } catch (e) {
      setStatus(status, e.message || "Không tải được dữ liệu CRUD", "error");
    }
  };

  const clearCategoryForm = () => {
    if (catId) catId.value = "";
    if (catName) catName.value = "";
    if (catDesc) catDesc.value = "";
  };

  const clearBookForm = () => {
    if (bookId) bookId.value = "";
    if (bookCategory) bookCategory.value = "";
    if (bookTitle) bookTitle.value = "";
    if (bookAuthor) bookAuthor.value = "";
    if (bookLanguage) bookLanguage.value = "";
    if (bookIsbn) bookIsbn.value = "";
    if (bookDesc) bookDesc.value = "";
  };

  refreshBtn?.addEventListener("click", () => void loadAll());
  catClear?.addEventListener("click", clearCategoryForm);
  bookClear?.addEventListener("click", clearBookForm);

  catSave?.addEventListener("click", async () => {
    setStatus(status, "");
    catSave.disabled = true;
    try {
      const id = safeNumber(catId?.value);
      const payload = {
        name: (catName?.value || "").trim(),
        description: (catDesc?.value || "").trim() || null
      };
      if (!payload.name) {
        setStatus(status, "Category name không được trống.", "error");
        return;
      }
      if (id) {
        await updateCategory(id, payload);
      } else {
        await createCategory(payload);
      }
      clearCategoryForm();
      await loadAll();
      setStatus(status, "Đã lưu category.", "success");
    } catch (e) {
      setStatus(status, e.message || "Lưu category thất bại", "error");
    } finally {
      catSave.disabled = false;
    }
  });

  bookSave?.addEventListener("click", async () => {
    setStatus(status, "");
    bookSave.disabled = true;
    try {
      const id = safeNumber(bookId?.value);
      const payload = {
        title: (bookTitle?.value || "").trim(),
        author: (bookAuthor?.value || "").trim(),
        language: (bookLanguage?.value || "").trim() || null,
        isbn: (bookIsbn?.value || "").trim() || null,
        description: (bookDesc?.value || "").trim() || null,
        category_id: bookCategory?.value ? safeNumber(bookCategory.value) : null
      };
      if (!payload.title || !payload.author) {
        setStatus(status, "Book cần có title và author.", "error");
        return;
      }
      if (id) {
        await updateBook(id, payload);
      } else {
        await createBook(payload);
      }
      clearBookForm();
      await loadAll();
      setStatus(status, "Đã lưu book.", "success");
    } catch (e) {
      setStatus(status, e.message || "Lưu book thất bại", "error");
    } finally {
      bookSave.disabled = false;
    }
  });

  mount.addEventListener("click", async (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const editCat = target.getAttribute("data-cat-edit");
    const delCat = target.getAttribute("data-cat-del");
    const editBook = target.getAttribute("data-book-edit");
    const delBook = target.getAttribute("data-book-del");

    if (editCat) {
      setStatus(status, "");
      try {
        const categories = await listCategories();
        const c = (categories || []).find((x) => x.id === Number(editCat));
        if (c) {
          if (catId) catId.value = `${c.id}`;
          if (catName) catName.value = c.name || "";
          if (catDesc) catDesc.value = c.description || "";
        }
      } catch (e) {
        setStatus(status, e.message || "Không load được category", "error");
      }
      return;
    }

    if (delCat) {
      setStatus(status, "");
      if (!confirm(`Delete category #${delCat}?`)) {
        return;
      }
      try {
        await deleteCategory(Number(delCat));
        await loadAll();
        setStatus(status, "Đã xóa category.", "success");
      } catch (e) {
        setStatus(status, e.message || "Xóa category thất bại", "error");
      }
      return;
    }

    if (editBook) {
      setStatus(status, "");
      try {
        const books = await listBooks();
        const b = (books || []).find((x) => x.id === Number(editBook));
        if (b) {
          if (bookId) bookId.value = `${b.id}`;
          if (bookTitle) bookTitle.value = b.title || "";
          if (bookAuthor) bookAuthor.value = b.author || "";
          if (bookLanguage) bookLanguage.value = b.language || "";
          if (bookIsbn) bookIsbn.value = b.isbn || "";
          if (bookDesc) bookDesc.value = b.description || "";
          if (bookCategory) bookCategory.value = b.category_id ? `${b.category_id}` : "";
        }
      } catch (e) {
        setStatus(status, e.message || "Không load được book", "error");
      }
      return;
    }

    if (delBook) {
      setStatus(status, "");
      if (!confirm(`Delete book #${delBook}?`)) {
        return;
      }
      try {
        await deleteBook(Number(delBook));
        await loadAll();
        setStatus(status, "Đã xóa book.", "success");
      } catch (e) {
        setStatus(status, e.message || "Xóa book thất bại", "error");
      }
    }
  });

  await loadAll();
};

const routes = {
  "/home": { type: "html", html: "./pages/home.html", title: "Home" },
  "/search": { type: "html", html: "./pages/search.html", title: "Search" },
  "/signin": { type: "html", html: "./pages/signin.html", module: "./pages/signin.js", title: "Sign In" },
  "/profile": { type: "html", html: "./pages/profile.html", module: "./pages/profile.js", title: "Profile" },
  "/marketplace": { type: "html", html: "./pages/marketplace.html", module: "./pages/marketplace.js", title: "Marketplace" },
  "/sellerdashboard": { type: "html", html: "./pages/sellerdashboard.html", module: "./pages/sellerdashboard.js", title: "Seller Dashboard" },
  "/managelisting": { type: "html", html: "./pages/managelisting.html", module: "./pages/managelisting.js", title: "Manage Listing" },
  "/messages": { type: "html", html: "./pages/messages.html", module: "./pages/messages.js", title: "Messages" },
  "/admin-dashboard": { type: "html", html: "./pages/admin-dashboard.html", module: "./pages/admin-dashboard.js", title: "Admin Dashboard" },
  "/crud": { type: "render", render: renderCrud, title: "Admin CRUD" }
};

const handleRoute = async () => {
  const route = normalizeRoute(location.hash);
  const def = routes[route] || routes["/home"];
  await renderShellAuth();
  setActiveNav(route);

  const mount = qs("#spa-view");
  if (!mount) {
    return;
  }

  document.title = def.title ? `Rook • ${def.title}` : "Rook";

  if (def.type === "render") {
    await def.render(mount);
    return;
  }

  try {
    const { node } = await loadPageBody(def.html);
    mount.innerHTML = "";
    while (node.firstChild) {
      mount.appendChild(node.firstChild);
    }
  } catch (e) {
    mount.innerHTML = `
      <main class="max-w-container-max mx-auto px-margin-page py-stack-lg">
        <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6">
          <div class="font-headline-md text-headline-md text-on-surface">Không load được view</div>
          <div class="text-on-surface-variant mt-2">${e.message || ""}</div>
          <div class="mt-4">
            <a class="text-primary hover:underline" href="./pages/home.html">Mở bản multi-page</a>
          </div>
        </div>
      </main>
    `;
    return;
  }

  if (def.module) {
    const mod = await import(def.module);
    if (typeof mod.init === "function") {
      await mod.init({ navigate });
    }
  }
};

const start = () => {
  window.addEventListener("hashchange", () => void handleRoute());
  const links = document.querySelectorAll("[data-nav]");
  for (const l of links) {
    l.addEventListener("click", (ev) => {
      ev.preventDefault();
      const target = l.getAttribute("data-nav") || "/home";
      navigate(target);
    });
  }
  void handleRoute();
};

start();
