import { me, getMyMessages, sendMessage } from "../api.js";
import { getToken, clearToken } from "../state.js";
import { qs, fmtDateTime, setStatus } from "../ui.js";

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

const render = (container, msgs, myId) => {
  container.innerHTML = "";
  for (const m of msgs) {
    const outgoing = myId && m.sender_id === myId;
    const row = document.createElement("div");
    row.className = "p-4 rounded-xl bg-surface-container-low border border-outline-variant/20";
    const dir = document.createElement("div");
    dir.className = outgoing ? "text-primary text-[10px] font-bold" : "text-on-surface-variant text-[10px] font-bold";
    dir.textContent = outgoing ? "You" : "Them";
    const body = document.createElement("div");
    body.className = "text-on-surface";
    body.textContent = m.body;
    const meta = document.createElement("div");
    meta.className = "text-[10px] text-on-surface-variant mt-2";
    meta.textContent = `${m.listing_id ? `Listing #${m.listing_id} • ` : ""}${fmtDateTime(m.created_at)}`;
    row.appendChild(dir);
    row.appendChild(body);
    row.appendChild(meta);
    container.appendChild(row);
  }
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  const parseId = (raw) => {
    const v = String(raw ?? "").trim();
    if (!v) {
      return null;
    }
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return v;
  };
  const status = qs("#messages-status");
  const list = qs("#messages-list");
  const listingId = qs("#msg-listing-id");
  const receiverId = qs("#msg-receiver-id");
  const body = qs("#msg-body");
  const btn = qs("#msg-send");

  setStatus(status, "");
  try {
    const user = await me();
    const myId = user?.id || null;
    const draftTo = localStorage.getItem("rook_msg_to");
    const draftListing = localStorage.getItem("rook_msg_listing");
    if (receiverId && !receiverId.value && draftTo) {
      receiverId.value = draftTo;
    }
    if (listingId && !listingId.value && draftListing) {
      listingId.value = draftListing;
    }
    const msgs = await getMyMessages();
    if (list) {
      render(list, msgs || [], myId);
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
    setStatus(status, e.message || "Không tải được messages", "error");
  }

  if (btn) {
    btn.addEventListener("click", async () => {
      setStatus(status, "");
      btn.disabled = true;
      try {
        const payload = {
          listing_id: parseId(listingId?.value),
          receiver_id: parseId(receiverId?.value),
          body: body?.value || ""
        };
        if (!payload.receiver_id) {
          setStatus(status, "receiver_id không được trống.", "error");
          return;
        }
        if (payload.receiver_id) {
          localStorage.setItem("rook_msg_to", String(payload.receiver_id));
        }
        if (payload.listing_id != null) {
          localStorage.setItem("rook_msg_listing", String(payload.listing_id));
        }
        await sendMessage(payload);
        const user = await me();
        const myId = user?.id || null;
        const msgs = await getMyMessages();
        if (list) {
          render(list, msgs || [], myId);
        }
        if (body) {
          body.value = "";
        }
        setStatus(status, "Đã gửi", "success");
      } catch (e) {
        setStatus(status, e.message || "Gửi thất bại", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
