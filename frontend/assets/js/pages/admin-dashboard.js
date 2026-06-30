import { me, adminUsers, adminLockedUsers, lockUser, unlockUser, listListings, listPendingBooks, listPendingCategories, listPendingListings, approveBook, approveCategory, approveListing } from "../api.js";
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

const renderPendingBooks = (rows, books, onApprove) => {
  rows.innerHTML = "";
  for (const b of books) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-surface-container-low/30 transition-colors";
    const tdTitle = document.createElement("td");
    tdTitle.className = "px-8 py-6 text-on-surface text-body-md";
    tdTitle.textContent = b.title || "";
    const tdAuthor = document.createElement("td");
    tdAuthor.className = "px-8 py-6 text-on-surface-variant text-body-md";
    tdAuthor.textContent = b.author || "";
    const tdAction = document.createElement("td");
    tdAction.className = "px-8 py-6";
    const btn = document.createElement("button");
    btn.className = "text-primary font-label-md text-label-md hover:underline";
    btn.textContent = "Approve";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await onApprove(b.id);
      } finally {
        btn.disabled = false;
      }
    });
    tdAction.appendChild(btn);
    tr.appendChild(tdTitle);
    tr.appendChild(tdAuthor);
    tr.appendChild(tdAction);
    rows.appendChild(tr);
  }
};

const renderPendingCategories = (rows, categories, onApprove) => {
  rows.innerHTML = "";
  for (const c of categories) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-surface-container-low/30 transition-colors";
    const tdName = document.createElement("td");
    tdName.className = "px-8 py-6 text-on-surface text-body-md";
    tdName.textContent = c.name || "";
    const tdDesc = document.createElement("td");
    tdDesc.className = "px-8 py-6 text-on-surface-variant text-body-md";
    tdDesc.textContent = c.description || "";
    const tdAction = document.createElement("td");
    tdAction.className = "px-8 py-6";
    const btn = document.createElement("button");
    btn.className = "text-primary font-label-md text-label-md hover:underline";
    btn.textContent = "Approve";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await onApprove(c.id);
      } finally {
        btn.disabled = false;
      }
    });
    tdAction.appendChild(btn);
    tr.appendChild(tdName);
    tr.appendChild(tdDesc);
    tr.appendChild(tdAction);
    rows.appendChild(tr);
  }
};

const renderPendingListings = (rows, listings, onApprove) => {
  rows.innerHTML = "";
  for (const l of listings) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-surface-container-low/30 transition-colors";
    const tdId = document.createElement("td");
    tdId.className = "px-8 py-6 text-on-surface text-body-md";
    tdId.textContent = `#${l.id}`;
    const tdBook = document.createElement("td");
    tdBook.className = "px-8 py-6 text-on-surface-variant text-body-md";
    tdBook.textContent = l.book?.title || String(l.book_id || "");
    const tdAction = document.createElement("td");
    tdAction.className = "px-8 py-6";
    const btn = document.createElement("button");
    btn.className = "text-primary font-label-md text-label-md hover:underline";
    btn.textContent = "Approve";
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await onApprove(l.id);
      } finally {
        btn.disabled = false;
      }
    });
    tdAction.appendChild(btn);
    tr.appendChild(tdId);
    tr.appendChild(tdBook);
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
  const pendingListingsCount = qs("#admin-pending-listings-count");
  const lockedCount = qs("#admin-locked-count");
  const pendingBooksCount = qs("#admin-pending-books-count");
  const pendingCategoriesCount = qs("#admin-pending-categories-count");
  const usersBody = qs("#admin-users-body");
  const pendingCategoriesBody = qs("#admin-pending-categories-body");
  const pendingBooksBody = qs("#admin-pending-books-body");
  const pendingListingsBody = qs("#admin-pending-listings-body");

  setStatus(status, "");
  try {
    const user = await me();
    if (!user || user.role !== "admin") {
      setStatus(status, "You don't have permission to access this page.", "error");
      return;
    }
    const [users, locked, listings, pendingCategories, pendingBooks, pendingListings] = await Promise.all([
      adminUsers(),
      adminLockedUsers(),
      listListings(),
      listPendingCategories(),
      listPendingBooks(),
      listPendingListings()
    ]);
    setText(usersCount, `${(users || []).length}`);
    setText(lockedCount, `${(locked || []).length}`);
    setText(listingsCount, `${(listings || []).length}`);
    setText(pendingBooksCount, `${(pendingBooks || []).length}`);
    setText(pendingCategoriesCount, `${(pendingCategories || []).length}`);
    setText(pendingListingsCount, `${(pendingListings || []).length}`);
    if (usersBody) {
      renderUsers(usersBody, users || []);
    }
    let pendingCategoriesState = pendingCategories || [];
    if (pendingCategoriesBody) {
      const refreshPendingCategories = () => {
        setText(pendingCategoriesCount, `${pendingCategoriesState.length}`);
        renderPendingCategories(pendingCategoriesBody, pendingCategoriesState, async (categoryId) => {
          await approveCategory(categoryId);
          pendingCategoriesState = pendingCategoriesState.filter((c) => c.id !== categoryId);
          refreshPendingCategories();
        });
      };
      refreshPendingCategories();
    }
    let pendingBooksState = pendingBooks || [];
    if (pendingBooksBody) {
      const refreshPendingBooks = () => {
        setText(pendingBooksCount, `${pendingBooksState.length}`);
        renderPendingBooks(pendingBooksBody, pendingBooksState, async (bookId) => {
          await approveBook(bookId);
          pendingBooksState = pendingBooksState.filter((b) => b.id !== bookId);
          refreshPendingBooks();
        });
      };
      refreshPendingBooks();
    }

    let pendingListingsState = pendingListings || [];
    if (pendingListingsBody) {
      const refreshPendingListings = () => {
        setText(pendingListingsCount, `${pendingListingsState.length}`);
        renderPendingListings(pendingListingsBody, pendingListingsState, async (listingId) => {
          await approveListing(listingId);
          pendingListingsState = pendingListingsState.filter((l) => l.id !== listingId);
          refreshPendingListings();
        });
      };
      refreshPendingListings();
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
    setStatus(status, e.message || "Couldn't load admin data.", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
