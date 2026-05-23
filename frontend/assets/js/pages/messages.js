import { getMyMessages, sendMessage } from "../api.js";
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

const render = (container, msgs) => {
  container.innerHTML = "";
  for (const m of msgs) {
    const row = document.createElement("div");
    row.className = "p-4 rounded-xl bg-surface-container-low border border-outline-variant/20";
    const body = document.createElement("div");
    body.className = "text-on-surface";
    body.textContent = m.body;
    const meta = document.createElement("div");
    meta.className = "text-[10px] text-on-surface-variant mt-2";
    meta.textContent = `listing=${m.listing_id} sender=${m.sender_id} receiver=${m.receiver_id} • ${fmtDateTime(m.created_at)}`;
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
    const msgs = await getMyMessages();
    if (list) {
      render(list, msgs || []);
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
        await sendMessage(payload);
        const msgs = await getMyMessages();
        if (list) {
          render(list, msgs || []);
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
