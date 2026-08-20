#!/usr/bin/env node
// Lightweight, zero-dependency frontend logic tests.
// Run:  node frontend/tests/run.mjs
// Goal: exercise the critical pure-logic helpers and state primitives that
// powers messaging, formatting, and auth storage — without pulling a build
// toolchain or test framework into the main project.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toImportUrl = (...parts) => pathToFileURL(path.join(...parts)).toString();

// ---------- tiny test runner ----------
let passed = 0;
let failed = 0;
const failures = [];

const green = (t) => `\u001B[32m${t}\u001B[39m`;
const red = (t) => `\u001B[31m${t}\u001B[39m`;
const dim = (t) => `\u001B[2m${t}\u001B[22m`;

function test(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") {
      throw new Error("async tests not supported in this tiny runner (synchronous only).");
    }
    passed += 1;
    process.stdout.write(`  ${green("✓")} ${name}\n`);
  } catch (e) {
    failed += 1;
    failures.push({ name, err: e });
    process.stdout.write(`  ${red("✗")} ${name}\n`);
    if (e?.message) process.stdout.write(`      ${dim(e.message)}\n`);
  }
}

// ---------- browser/node mocks ----------
// localStorage mock for state.js
const localStorageStore = new Map();
const mockLocalStorage = {
  getItem(k) {
    const v = localStorageStore.get(String(k));
    return v === undefined ? null : v;
  },
  setItem(k, v) {
    localStorageStore.set(String(k), String(v));
  },
  removeItem(k) {
    localStorageStore.delete(String(k));
  },
  clear() {
    localStorageStore.clear();
  }
};

// document/qs/setText mock (just enough to test setText)
const mockEls = new Map();
class MockEl {
  constructor(sel) {
    this.sel = sel;
    this.textContent = "";
    this._cls = "";
    this._style = new Map();
  }
  set className(v) { this._cls = v; }
  get className() { return this._cls; }
  setAttribute() {}
  get style() {
    return new Proxy({}, {
      get: (_t, k) => this._style.get(k) || "",
      set: (_t, k, v) => { this._style.set(k, v); return true; }
    });
  }
}
function ensureEl(sel) {
  if (!mockEls.has(sel)) mockEls.set(sel, new MockEl(sel));
  return mockEls.get(sel);
}
const mockDocument = {
  querySelector(sel) { return ensureEl(sel); },
  querySelectorAll(sel) { return [ensureEl(sel)]; }
};

// Expose globals BEFORE importing ESM modules that reference them.
globalThis.localStorage = mockLocalStorage;
globalThis.document = mockDocument;
globalThis.location = { protocol: "http:", origin: "http://localhost:8000", hash: "" };
globalThis.fetch = async () => { throw new Error("No network in tests."); };
globalThis.Headers = class {
  constructor() { this._m = new Map(); }
  set(k, v) { this._m.set(String(k).toLowerCase(), String(v)); }
  has(k) { return this._m.has(String(k).toLowerCase()); }
  get(k) { return this._m.get(String(k).toLowerCase()) || null; }
};

// ---------- import modules under test ----------
// NOTE: imports use file:// URLs for Windows ESM compatibility; mocks must be in place before import.
const uiMod = await import(toImportUrl(__dirname, "..", "assets", "js", "ui.js"));
const stateMod = await import(toImportUrl(__dirname, "..", "assets", "js", "state.js"));

// ---------- helpers used across UI (extracts of pure logic) ----------
// Mirror logic from messages.js pages module so we test the pure contract
// without importing network-dependent modules.
const normalizeId = (v) => (v == null ? "" : String(v));
function buildConversations({ messages = [], myId = null, blockedIds = [] }) {
  const blocked = new Set((blockedIds || []).map((v) => normalizeId(v)).filter(Boolean));
  const map = new Map();
  for (const m of messages || []) {
    const peer = normalizeId(m.sender_id) === normalizeId(myId) ? normalizeId(m.receiver_id) : normalizeId(m.sender_id);
    if (peer && blocked.has(peer)) continue;
    const lid = m.listing_id == null ? "" : normalizeId(m.listing_id);
    const key = `${peer}::${lid}`;
    const existing = map.get(key);
    if (!existing || new Date(m.created_at).getTime() > new Date(existing.last.created_at).getTime()) {
      map.set(key, { key, peerId: peer, listingId: lid || null, last: m });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime()
  );
}

// Mirror price parser from marketplace.js
const parsePrice = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

// Mirror simple search debouncer shape (just the contract)
const debounceFactory = (fn, waitMs) => {
  let t = null;
  let lastInvokeAt = -Infinity;
  const wrapper = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      lastInvokeAt = Date.now();
      fn(...args);
    }, waitMs);
  };
  wrapper._peek = () => lastInvokeAt;
  return wrapper;
};

// ---------- test suites ----------
process.stdout.write("ui.js\n");

test("fmtVnd formats whole-number VND correctly", () => {
  const out = uiMod.fmtVnd(120000);
  assert.match(out, /120\.?000/); // allows vi-VN grouping of 120,000 VND
});
test("fmtVnd returns empty string for NaN/null/undefined/invalid", () => {
  assert.equal(uiMod.fmtVnd(NaN), "");
  assert.equal(uiMod.fmtVnd("abc"), "");
  assert.equal(uiMod.fmtVnd(null), "");
  assert.equal(uiMod.fmtVnd(undefined), "");
});
test("fmtDateTime returns empty string for null/empty/garbage", () => {
  assert.equal(uiMod.fmtDateTime(null), "");
  assert.equal(uiMod.fmtDateTime(""), "");
  assert.equal(uiMod.fmtDateTime("not a date"), "");
});
test("fmtDateTime returns non-empty for valid ISO", () => {
  const out = uiMod.fmtDateTime("2025-01-01T00:00:00.000Z");
  assert.ok(typeof out === "string" && out.length > 0);
});
test("setText sets textContent on a selected element", () => {
  ensureEl("#t").textContent = "old";
  uiMod.setText(mockDocument.querySelector("#t"), "new value");
  assert.equal(mockDocument.querySelector("#t").textContent, "new value");
});
test("setText handles null/undefined as empty string", () => {
  uiMod.setText(mockDocument.querySelector("#t2"), null);
  assert.equal(mockDocument.querySelector("#t2").textContent, "");
  uiMod.setText(mockDocument.querySelector("#t2"), undefined);
  assert.equal(mockDocument.querySelector("#t2").textContent, "");
});
test("setText safely ignores missing element", () => {
  // should not throw even with null
  let threw = false;
  try { uiMod.setText(null, "any"); } catch { threw = true; }
  assert.equal(threw, false);
});

process.stdout.write("\nstate.js (localStorage-backed tokens/config)\n");

mockLocalStorage.clear();

test("setToken/getToken round-trips", () => {
  stateMod.setToken("abc123");
  assert.equal(stateMod.getToken(), "abc123");
});
test("clearToken removes both access token AND refresh token", () => {
  stateMod.setToken("a");
  stateMod.setSupabaseRefreshToken("r");
  assert.equal(stateMod.getToken(), "a");
  assert.equal(stateMod.getSupabaseRefreshToken(), "r");
  stateMod.clearToken();
  assert.equal(stateMod.getToken(), null);
  assert.equal(stateMod.getSupabaseRefreshToken(), null);
});
test("getApiBase defaults to location.origin in http(s) page context", () => {
  // our mocked location.origin = http://localhost:8000
  const out = stateMod.getApiBase();
  assert.equal(typeof out, "string");
  assert.ok(out.startsWith("http://") || out.startsWith("https://"));
});
test("api base override survives round-trip", () => {
  mockLocalStorage.clear();
  stateMod.setApiBaseOverride("https://example.supabase.co/rest/v1");
  assert.equal(stateMod.getApiBaseOverride(), "https://example.supabase.co/rest/v1");
  stateMod.setApiBaseOverride(null);
  assert.equal(stateMod.getApiBaseOverride(), null);
});
test("supabase anon key survives round-trip", () => {
  mockLocalStorage.clear();
  stateMod.setSupabaseAnon("public-anon");
  assert.equal(stateMod.getSupabaseAnon(), "public-anon");
  stateMod.setSupabaseAnon(null);
  assert.equal(stateMod.getSupabaseAnon(), null);
});

process.stdout.write("\nmarketplace/search logic (price + filters)\n");

test("parsePrice handles blanks/nulls/undefined as null", () => {
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice(undefined), null);
  assert.equal(parsePrice("   "), null);
});
test("parsePrice returns numeric for valid strings/numbers", () => {
  assert.equal(parsePrice("123"), 123);
  assert.equal(parsePrice(123), 123);
  assert.equal(parsePrice("0"), 0);
});
test("parsePrice rejects non-numeric strings", () => {
  assert.equal(parsePrice("abc"), null);
  assert.equal(parsePrice("123abc"), null);
});

process.stdout.write("\nmessages conversation builder (per-listing scoping)\n");

const uid1 = "uuid-buyer-1";
const uid2 = "uuid-seller-2";
const listingA = 42;
const listingB = 99;
const msgBase = (overrides) => ({
  id: 1, sender_id: uid2, receiver_id: uid1, listing_id: listingA, body: "hi", created_at: "2025-01-01T00:00:00.000Z",
  ...overrides
});

test("empty messages → empty conversations", () => {
  assert.deepEqual(buildConversations({ messages: [], myId: uid1 }), []);
});
test("1 message → 1 conversation (peer + listing keyed)", () => {
  const m = msgBase({ id: 1 });
  const out = buildConversations({ messages: [m], myId: uid1 });
  assert.equal(out.length, 1);
  assert.equal(out[0].peerId, uid2);
  assert.equal(String(out[0].listingId), String(listingA));
  assert.equal(out[0].last.id, 1);
});
test("2 messages, same peer, DIFFERENT listings → 2 threads (per-listing scoping)", () => {
  const m1 = msgBase({ id: 1, listing_id: listingA, created_at: "2025-01-01T00:00:00.000Z" });
  const m2 = msgBase({ id: 2, listing_id: listingB, created_at: "2025-01-02T00:00:00.000Z" });
  const out = buildConversations({ messages: [m1, m2], myId: uid1 });
  assert.equal(out.length, 2);
  // most recent first
  assert.equal(String(out[0].listingId), String(listingB));
  assert.equal(String(out[1].listingId), String(listingA));
});
test("multiple messages, same peer + listing → collapses to 1 conversation picking last created_at", () => {
  const old = msgBase({ id: 1, created_at: "2025-01-01T00:00:00.000Z", body: "ping" });
  const recent = msgBase({ id: 2, created_at: "2025-01-03T00:00:00.000Z", body: "latest" });
  const out = buildConversations({ messages: [old, recent], myId: uid1 });
  assert.equal(out.length, 1);
  assert.equal(out[0].last.id, 2);
  assert.equal(out[0].last.body, "latest");
});
test("blocked peer excluded from conversation list", () => {
  const blocked = "some-malicious-user";
  const m1 = msgBase({ id: 1, sender_id: blocked, receiver_id: uid1, listing_id: listingA });
  const out = buildConversations({ messages: [m1], myId: uid1, blockedIds: [blocked] });
  assert.equal(out.length, 0);
});
test("conversation key builder ignores null listing_id (empty)", () => {
  const m = msgBase({ id: 3, listing_id: null });
  const out = buildConversations({ messages: [m], myId: uid1 });
  assert.equal(out.length, 1);
  assert.equal(out[0].listingId, null);
});

process.stdout.write("\ndebounce helper contract\n");

test("debounceFactory returns callable that exposes _peek (not invoked immediately)", () => {
  let calls = 0;
  const wrapped = debounceFactory(() => { calls += 1; }, 10);
  wrapped();
  // 10ms haven't passed synchronously; ensure _peek exists
  assert.equal(typeof wrapped._peek, "function");
  assert.equal(calls, 0);
});

// ---------- summary ----------
process.stdout.write("\n");
process.stdout.write(`${passed + failed} tests · ${green(`${passed} passed`)} · ${failed ? red(`${failed} failed`) : dim("0 failed")}\n`);
if (failed > 0) {
  process.stdout.write(red("\nFailures:\n"));
  for (const f of failures) {
    process.stdout.write(`  - ${f.name}\n`);
  }
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
