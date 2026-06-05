import { me, myListings, markListingSold } from "../api.js";
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
  const totalCount = qs("#seller-total-count");
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
    const renderListings = (listings) => {
      if (totalCount) {
        setText(totalCount, `${(listings || []).length}`);
      }
      const active = (listings || []).filter((l) => l.is_active).length;
      setText(activeCount, `${active}`);
      if (!listingsBox) {
        return;
      }
      listingsBox.innerHTML = "";
      for (const l of (listings || []).slice(0, 8)) {
        const row = document.createElement("div");
        row.className = "p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all flex items-center justify-between gap-4";
        const left = document.createElement("div");
        left.className = "min-w-0";
        const t = document.createElement("div");
        t.className = "font-label-md text-label-md text-on-surface truncate";
        t.textContent = l.book?.title || `Listing #${l.id}`;
        const s = document.createElement("div");
        s.className = "text-on-surface-variant text-[12px] mt-1";
        s.textContent = `${l.status} • ${l.price}`;
        left.appendChild(t);
        left.appendChild(s);

        const actions = document.createElement("div");
        actions.className = "flex items-center gap-3 shrink-0";

        const edit = document.createElement("a");
        edit.className = "text-primary font-label-md text-label-md hover:underline";
        if (navigate) {
          edit.href = `#/managelisting?id=${l.id}`;
          edit.addEventListener("click", (ev) => {
            ev.preventDefault();
            navigate(`/managelisting?id=${l.id}`);
          });
        } else {
          edit.href = `./managelisting.html?id=${l.id}`;
        }
        edit.textContent = "Edit";
        actions.appendChild(edit);

        if (l.status !== "sold") {
          const soldBtn = document.createElement("button");
          soldBtn.type = "button";
          soldBtn.className = "text-on-surface-variant font-label-md text-label-md hover:underline";
          soldBtn.textContent = "Mark sold";
          soldBtn.addEventListener("click", async () => {
            setStatus(status, "");
            soldBtn.disabled = true;
            try {
              await markListingSold(l.id);
              const fresh = await myListings();
              renderListings(fresh);
              setStatus(status, `Đã chuyển listing #${l.id} sang sold.`, "success");
            } catch (e) {
              setStatus(status, e.message || "Cập nhật sold thất bại", "error");
            } finally {
              soldBtn.disabled = false;
            }
          });
          actions.appendChild(soldBtn);
        }

        row.appendChild(left);
        row.appendChild(actions);
        listingsBox.appendChild(row);
      }
    };

    const listings = await myListings();
    renderListings(listings);
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
