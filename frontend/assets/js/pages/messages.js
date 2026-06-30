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
  const moreBtn = qs("#chat-more");
  const menu = qs("#chat-menu");

  setStatus(status, "");
  let myId = null;
  let allMessages = [];
  let conversations = [];
  let selected = null;
  let peerProfiles = new Map();
  let listingSummaries = new Map();
  let blocked = new Set();

  const loadBlocked = () => {
    try {
      const raw = localStorage.getItem("rook_blocked_users") || "[]";
      const arr = JSON.parse(raw);
      blocked = new Set(Array.isArray(arr) ? arr.map((v) => normalizeId(v)).filter(Boolean) : []);
    } catch {
      blocked = new Set();
    }
  };

  const saveBlocked = () => {
    try {
      localStorage.setItem("rook_blocked_users", JSON.stringify(Array.from(blocked)));
    } catch {}
  };

  const isBlocked = (peerId) => blocked.has(normalizeId(peerId));

  const peerLabel = (peerId) => {
    const id = normalizeId(peerId);
    if (!id) {
      return "User";
    }
    const p = peerProfiles.get(id) || null;
    const name = String(p?.name || "").trim();
    const email = String(p?.email || "").trim();
    return name || email || "User";
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

  const hydrateListingSummaries = async (convos) => {
    const ids = Array.from(
      new Set(
        (convos || [])
          .map((c) => normalizeId(c?.listingId))
          .filter(Boolean)
      )
    )
      .map((v) => Number.parseInt(String(v), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .map((n) => String(n));

    if (!ids.length) {
      listingSummaries = new Map();
      return;
    }

    try {
      const results = await Promise.allSettled(ids.map((id) => getListing(id)));
      const map = new Map();
      for (let i = 0; i < results.length; i += 1) {
        const r = results[i];
        if (r.status !== "fulfilled") continue;
        const info = r.value;
        if (!info?.id) continue;
        const title = String(info?.book?.title || "").trim();
        const author = String(info?.book?.author || "").trim();
        const img = String(info?.images?.[0]?.url || "").trim();
        map.set(String(info.id), { title, author, img });
      }
      listingSummaries = map;
    } catch {
      listingSummaries = new Map();
    }
  };

  const listingLabel = (listingIdValue) => {
    const lid = normalizeId(listingIdValue);
    if (!lid) {
      return "";
    }
    const s = listingSummaries.get(lid) || null;
    const t = String(s?.title || "").trim();
    const a = String(s?.author || "").trim();
    if (t) {
      return `${t}${a ? ` — ${a}` : ""}`;
    }
    return `Listing #${lid}`;
  };

  const buildConversations = (msgs) => {
    const map = new Map();
    for (const m of msgs || []) {
      const peer = normalizeId(m.sender_id) === normalizeId(myId) ? normalizeId(m.receiver_id) : normalizeId(m.sender_id);
      if (peer && isBlocked(peer)) {
        continue;
      }
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
      const listing = (listingLabel(c.listingId) || "").toLowerCase();
      const lid = (c.listingId || "").toLowerCase();
      return peer.includes(q) || listing.includes(q) || lid.includes(q);
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

      const row = document.createElement("div");
      row.className = "flex items-start gap-3";
      const thumb = document.createElement("div");
      thumb.className = "w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden shrink-0 flex items-center justify-center text-outline";
      const lid = normalizeId(c.listingId);
      const img = lid ? String(listingSummaries.get(lid)?.img || "") : "";
      if (img) {
        const image = document.createElement("img");
        image.src = img;
        image.alt = listingLabel(lid) || "Listing image";
        image.className = "w-full h-full object-cover";
        thumb.appendChild(image);
      } else {
        thumb.textContent = "BK";
      }

      const content = document.createElement("div");
      content.className = "min-w-0 flex-1";
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
      const listingText = listingLabel(c.listingId);
      const prefix = listingText ? `${listingText} • ` : "";
      sub.textContent = `${prefix}${String(c.last.body || "").slice(0, 80)}`;

      content.appendChild(top);
      content.appendChild(sub);
      row.appendChild(thumb);
      row.appendChild(content);
      btn.appendChild(row);
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
    const blockedPeer = peer ? isBlocked(peer) : false;
    if (chatTitle) {
      chatTitle.textContent = peer ? `Chat with ${peerLabel(peer)}` : "My Messages";
    }
    if (chatSubtitle) {
      chatSubtitle.textContent = lid ? (listingLabel(lid) || `Listing #${lid}`) : "Inbox";
    }
    if (attachBox) {
      attachBox.style.display = lid ? "block" : "none";
      attachBox.style.cursor = lid ? "pointer" : "";
    }
    if (attachTitle) {
      attachTitle.textContent = lid ? (listingLabel(lid) || `Listing #${lid}`) : "";
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

    if (body) {
      body.disabled = blockedPeer;
    }
    if (btn) {
      btn.disabled = blockedPeer;
    }
    if (blockedPeer) {
      setStatus(status, "You have blocked this user.", "error");
    } else {
      setStatus(status, "");
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

  if (attachBox) {
    attachBox.addEventListener("click", () => {
      const lid = selected?.listingId ?? (listingId?.value ? normalizeId(listingId.value) : null);
      const id = lid ? Number.parseInt(String(lid), 10) : null;
      if (!id || !Number.isFinite(id)) {
        return;
      }
      if (navigate) {
        navigate(`/listing?id=${id}`);
        return;
      }
      location.href = `./listing.html?id=${id}`;
    });
  }

  const hideMenu = () => {
    if (!menu) return;
    menu.classList.add("hidden");
    if (moreBtn) {
      moreBtn.setAttribute("aria-expanded", "false");
    }
  };

  const toggleMenu = () => {
    if (!menu) return;
    const willShow = menu.classList.contains("hidden");
    if (willShow) {
      menu.classList.remove("hidden");
      if (moreBtn) moreBtn.setAttribute("aria-expanded", "true");
      return;
    }
    hideMenu();
  };

  try {
    loadBlocked();
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
    await hydrateListingSummaries(conversations);
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
    setStatus(status, e.message || "Couldn't load messages.", "error");
  }

  if (moreBtn) {
    moreBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleMenu();
    });
    document.addEventListener("click", () => hideMenu());
  }

  if (menu) {
    menu.addEventListener("click", async (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.getAttribute("data-chat-action");
      if (!action) return;
      ev.preventDefault();
      ev.stopPropagation();
      hideMenu();

      const peer = selected?.peerId || normalizeId(receiverId?.value);
      const lid = selected?.listingId ?? (listingId?.value ? normalizeId(listingId.value) : null);
      if (!peer) {
        setStatus(status, "No conversation selected.", "error");
        return;
      }

      if (action === "view-profile") {
        const url = navigate ? `/profile?id=${encodeURIComponent(peer)}` : `./profile.html?id=${encodeURIComponent(peer)}`;
        if (navigate) {
          navigate(url);
        } else {
          location.href = url;
        }
        return;
      }

      if (action === "block") {
        if (!confirm(`Block ${peerLabel(peer)}?`)) {
          return;
        }
        blocked.add(normalizeId(peer));
        saveBlocked();
        conversations = buildConversations(allMessages);
        await hydratePeerProfiles(conversations);
        await hydrateListingSummaries(conversations);
        selected = conversations[0] || null;
        if (selected) {
          if (receiverId) receiverId.value = selected.peerId || "";
          if (listingId) listingId.value = selected.listingId || "";
        }
        renderConversations();
        await renderThread();
        return;
      }

      if (action === "report") {
        const reason = prompt("Report reason (optional):", "");
        try {
          const raw = localStorage.getItem("rook_reports") || "[]";
          const arr = JSON.parse(raw);
          const list = Array.isArray(arr) ? arr : [];
          list.unshift({ peerId: peer, listingId: lid || null, reason: (reason || "").trim() || null, at: new Date().toISOString() });
          localStorage.setItem("rook_reports", JSON.stringify(list.slice(0, 50)));
        } catch {}
        setStatus(status, "Reported.", "success");
      }
    });
  }

  if (btn) {
    btn.addEventListener("click", async () => {
      setStatus(status, "");
      btn.disabled = true;
      try {
        const to = normalizeId(receiverId?.value || "");
        if (!to) {
          setStatus(status, "No recipient selected.", "error");
          return;
        }
        if (isBlocked(to)) {
          setStatus(status, "You have blocked this user.", "error");
          return;
        }
        const lid = listingId?.value ? normalizeId(listingId.value) : null;
        const payload = {
          listing_id: lid ? (String(lid).match(/^\d+$/) ? Number(lid) : lid) : null,
          receiver_id: String(to).match(/^\d+$/) ? Number(to) : to,
          body: body?.value || ""
        };
        if (!payload.body.trim()) {
          setStatus(status, "Message can't be empty.", "error");
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
        await hydrateListingSummaries(conversations);
        const key = `${to}::${lid || ""}`;
        selected = conversations.find((c) => c.key === key) || selected;
        renderConversations();
        await renderThread();
        if (body) {
          body.value = "";
        }
        setStatus(status, "Sent.", "success");
      } catch (e) {
        setStatus(status, e.message || "Send failed.", "error");
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
