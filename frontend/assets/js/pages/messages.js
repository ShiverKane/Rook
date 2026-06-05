import { getListing, me, getMyMessages, sendMessage, getProfileSummaries } from "../api.js";
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

const renderMessages = (container, msgs, myId) => {
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

const normalizeId = (v) => (v == null ? "" : String(v));
const shortId = (id) => {
  const s = normalizeId(id);
  if (!s) return "";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
};

export const init = async (opts = {}) => {
  const navigate = typeof opts.navigate === "function" ? opts.navigate : null;
  if (!requireAuth(navigate)) {
    return;
  }
  const status = qs("#messages-status");
  const list = qs("#messages-list");
  const listingId = qs("#msg-listing-id");
  const receiverId = qs("#msg-receiver-id");
  const body = qs("#msg-body");
  const btn = qs("#msg-send");
  const convoList = qs("#convo-list");
  const convoSearch = qs("#convo-search");
  const convoEmpty = qs("#convo-empty");
  const chatTitle = qs("#chat-title");
  const chatSubtitle = qs("#chat-subtitle");
  const attachBox = qs("#listing-attach");
  const attachTitle = qs("#listing-attach-title");

  setStatus(status, "");
  let myId = null;
  let allMessages = [];
  let conversations = [];
  let selected = null;
  let peerProfiles = new Map();

  const peerLabel = (peerId) => {
    const id = normalizeId(peerId);
    if (!id) {
      return "User";
    }
    const p = peerProfiles.get(id) || null;
    const name = String(p?.name || "").trim();
    const email = String(p?.email || "").trim();
    return name || email || `User ${shortId(id)}`;
  };

  const hydratePeerProfiles = async (convos) => {
    const ids = Array.from(new Set((convos || []).map((c) => normalizeId(c?.peerId)).filter(Boolean)));
    if (!ids.length) {
      peerProfiles = new Map();
      return;
    }
    try {
      const rows = await getProfileSummaries(ids);
      const map = new Map();
      for (const r of rows || []) {
        const id = normalizeId(r?.id);
        if (!id) continue;
        map.set(id, r);
      }
      peerProfiles = map;
    } catch {
      peerProfiles = new Map();
    }
  };

  const buildConversations = (msgs) => {
    const map = new Map();
    for (const m of msgs || []) {
      const peer = normalizeId(m.sender_id) === normalizeId(myId) ? normalizeId(m.receiver_id) : normalizeId(m.sender_id);
      const lid = m.listing_id == null ? "" : normalizeId(m.listing_id);
      const key = `${peer}::${lid}`;
      const existing = map.get(key);
      if (!existing || new Date(m.created_at).getTime() > new Date(existing.last.created_at).getTime()) {
        map.set(key, { key, peerId: peer, listingId: lid || null, last: m });
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
  };

  const renderConversations = () => {
    if (!convoList) {
      return;
    }
    const q = String(convoSearch?.value || "").trim().toLowerCase();
    const data = (conversations || []).filter((c) => {
      if (!q) {
        return true;
      }
      const peer = (peerLabel(c.peerId) || "").toLowerCase();
      const lid = (c.listingId || "").toLowerCase();
      return peer.includes(q) || lid.includes(q);
    });
    convoList.innerHTML = "";
    if (convoEmpty) {
      convoEmpty.style.display = data.length ? "none" : "block";
    }
    for (const c of data) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = selected && selected.key === c.key;
      btn.className = active
        ? "w-full text-left p-4 rounded-xl bg-surface-container-high border border-outline-variant/20"
        : "w-full text-left p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all border border-outline-variant/20";
      const top = document.createElement("div");
      top.className = "flex items-center justify-between gap-3";
      const title = document.createElement("div");
      title.className = "font-label-md text-label-md text-on-surface";
      title.textContent = peerLabel(c.peerId);
      const time = document.createElement("div");
      time.className = "text-[10px] text-on-surface-variant";
      time.textContent = fmtDateTime(c.last.created_at);
      top.appendChild(title);
      top.appendChild(time);
      const sub = document.createElement("div");
      sub.className = "text-on-surface-variant text-[12px] mt-2";
      const lid = c.listingId ? `Listing #${c.listingId} • ` : "";
      sub.textContent = `${lid}${String(c.last.body || "").slice(0, 80)}`;
      btn.appendChild(top);
      btn.appendChild(sub);
      btn.addEventListener("click", () => {
        selected = c;
        if (receiverId) {
          receiverId.value = c.peerId || "";
        }
        if (listingId) {
          listingId.value = c.listingId || "";
        }
        try {
          if (c.peerId) localStorage.setItem("rook_msg_to", c.peerId);
          if (c.listingId != null) localStorage.setItem("rook_msg_listing", String(c.listingId));
        } catch {}
        void renderThread();
        renderConversations();
      });
      convoList.appendChild(btn);
    }
  };

  const renderThread = async () => {
    if (!list) {
      return;
    }
    const peer = selected?.peerId || normalizeId(receiverId?.value);
    const lid = selected?.listingId ?? (listingId?.value ? normalizeId(listingId.value) : null);
    if (chatTitle) {
      chatTitle.textContent = peer ? `Chat with ${peerLabel(peer)}` : "My Messages";
    }
    if (chatSubtitle) {
      chatSubtitle.textContent = lid ? `Listing #${lid}` : "Inbox";
    }
    if (attachBox) {
      attachBox.style.display = lid ? "block" : "none";
    }
    if (attachTitle) {
      attachTitle.textContent = lid ? `Listing #${lid}` : "";
    }
    if (lid) {
      try {
        const info = await getListing(lid);
        const title = info?.book?.title || (info?.book_id ? `Book #${info.book_id}` : null);
        const author = info?.book?.author || "";
        if (attachTitle) {
          attachTitle.textContent = title ? `${title}${author ? ` — ${author}` : ""}` : `Listing #${lid}`;
        }
      } catch {}
    }

    const filtered = (allMessages || []).filter((m) => {
      const s = normalizeId(m.sender_id);
      const r = normalizeId(m.receiver_id);
      const matchPair = peer ? ((s === normalizeId(myId) && r === peer) || (s === peer && r === normalizeId(myId))) : true;
      if (!matchPair) {
        return false;
      }
      if (lid) {
        return normalizeId(m.listing_id) === normalizeId(lid);
      }
      return true;
    });
    renderMessages(list, filtered, myId);
    list.scrollTop = list.scrollHeight;
  };

  try {
    const user = await me();
    myId = user?.id || null;
    const draftTo = localStorage.getItem("rook_msg_to");
    const draftListing = localStorage.getItem("rook_msg_listing");
    if (receiverId && draftTo) {
      receiverId.value = draftTo;
    }
    if (listingId && draftListing) {
      listingId.value = draftListing;
    }
    allMessages = await getMyMessages();
    conversations = buildConversations(allMessages);
    await hydratePeerProfiles(conversations);
    const initialPeer = normalizeId(draftTo || receiverId?.value || "");
    const initialListing = normalizeId(draftListing || listingId?.value || "");
    if (initialPeer) {
      const key = `${initialPeer}::${initialListing || ""}`;
      selected = conversations.find((c) => c.key === key) || { key, peerId: initialPeer, listingId: initialListing || null, last: { created_at: new Date().toISOString(), body: "" } };
    } else {
      selected = conversations[0] || null;
    }
    if (selected) {
      if (receiverId) receiverId.value = selected.peerId || "";
      if (listingId) listingId.value = selected.listingId || "";
    }
    renderConversations();
    await renderThread();
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
        const to = normalizeId(receiverId?.value || "");
        if (!to) {
          setStatus(status, "Chưa chọn người nhận.", "error");
          return;
        }
        const lid = listingId?.value ? normalizeId(listingId.value) : null;
        const payload = {
          listing_id: lid ? (String(lid).match(/^\d+$/) ? Number(lid) : lid) : null,
          receiver_id: String(to).match(/^\d+$/) ? Number(to) : to,
          body: body?.value || ""
        };
        if (!payload.body.trim()) {
          setStatus(status, "Nội dung không được trống.", "error");
          return;
        }
        try {
          localStorage.setItem("rook_msg_to", String(to));
          if (lid) localStorage.setItem("rook_msg_listing", String(lid));
        } catch {}
        await sendMessage(payload);
        allMessages = await getMyMessages();
        conversations = buildConversations(allMessages);
        await hydratePeerProfiles(conversations);
        const key = `${to}::${lid || ""}`;
        selected = conversations.find((c) => c.key === key) || selected;
        renderConversations();
        await renderThread();
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

  convoSearch?.addEventListener("input", () => renderConversations());
  body?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      btn?.click();
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  init();
});
