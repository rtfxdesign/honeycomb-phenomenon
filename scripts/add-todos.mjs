#!/usr/bin/env node
/**
 * Load a batch of items into the change list through the site's own API.
 *
 *   HONEYCOMB_SITE=https://projecthoneycomb.site \
 *   HONEYCOMB_MODERATOR_PASSWORD=... \
 *   node scripts/add-todos.mjs scripts/todos/2026-09-16-review.json
 *
 * Goes through /api/unlock and /api/todos rather than writing to R2 directly,
 * so it is subject to exactly the same rules as a moderator at the keyboard
 * and cannot produce a record the page would not have made itself.
 *
 * The JSON file is an array of { text, askedBy?, owner?, priority?, area?,
 * due?, notes?, answer? }. Items whose text already exists on the list are
 * skipped, so re-running a file is safe.
 */

import { readFile } from "node:fs/promises";

const SITE = (process.env.HONEYCOMB_SITE || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.HONEYCOMB_MODERATOR_PASSWORD;
const file = process.argv[2];

if (!file) { console.error("usage: add-todos.mjs <items.json>"); process.exit(2); }
if (!PASSWORD) { console.error("HONEYCOMB_MODERATOR_PASSWORD is not set"); process.exit(2); }

const items = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(items)) { console.error("expected a JSON array"); process.exit(2); }

const unlock = await fetch(`${SITE}/api/unlock`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: PASSWORD }),
});
if (!unlock.ok) { console.error(`unlock failed: ${unlock.status}`); process.exit(1); }
const cookie = (unlock.headers.get("set-cookie") || "").split(";")[0];
if (!cookie) { console.error("no session cookie returned"); process.exit(1); }

const headers = { "Content-Type": "application/json", Cookie: cookie };

const existing = await fetch(`${SITE}/api/todos`, { headers });
if (!existing.ok) { console.error(`list failed: ${existing.status} — is that the moderator password?`); process.exit(1); }
const have = new Set(((await existing.json()).todos || []).map((t) => t.text.trim().toLowerCase()));

let added = 0, skipped = 0;
for (const item of items) {
  const text = String(item.text || "").trim();
  if (!text) continue;
  if (have.has(text.toLowerCase())) { skipped++; console.log(`  = ${text.slice(0, 70)}`); continue; }
  const res = await fetch(`${SITE}/api/todos`, { method: "POST", headers, body: JSON.stringify(item) });
  if (!res.ok) {
    console.error(`  ! ${res.status} ${(await res.text()).slice(0, 200)} — ${text.slice(0, 70)}`);
    continue;
  }
  added++;
  console.log(`  + ${text.slice(0, 70)}`);
}
console.log(`\n${added} added, ${skipped} already there → ${SITE}/review/todo`);
