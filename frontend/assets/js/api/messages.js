import { isSupabaseRest, request } from "./client.js";
import { getApiBase } from "../state.js";
import { me } from "./auth.js";

export const getMyMessages = async () => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      return [];
    }
    const uid = user.id;
    return request(`messages?select=*&or=(sender_id.eq.${uid},receiver_id.eq.${uid})&order=created_at.desc`, { method: "GET" });
  }
  return request("/messages/me", { method: "GET" });
};

export const sendMessage = async (payload) => {
  const base = getApiBase();
  if (isSupabaseRest(base)) {
    const user = await me();
    if (!user?.id) {
      throw new Error("You must be signed in to send messages.");
    }
    const msgPayload = {
      listing_id: payload.listing_id ?? null,
      receiver_id: payload.receiver_id,
      body: payload.body,
      sender_id: user.id
    };
    const rows = await request("messages", { method: "POST", body: JSON.stringify(msgPayload) });
    return Array.isArray(rows) ? rows[0] || null : rows;
  }
  return request("/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
};
