import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

// One shared password unlocks the front gate and the review dashboard.
// Override without a deploy by setting HONEYCOMB_PASSWORD in Netlify env.
const PASSWORD = process.env.HONEYCOMB_PASSWORD || "tulsa";
const COOKIE_NAME = "hc_auth";
const SALT = "hc-archive-v1";

export function authToken(): string {
  return createHash("sha256").update(SALT + PASSWORD).digest("hex");
}

export function checkPassword(password: unknown): boolean {
  return typeof password === "string" && password === PASSWORD;
}

export function isAuthed(request: NextRequest): boolean {
  return request.cookies.get(COOKIE_NAME)?.value === authToken();
}

export const AUTH_COOKIE = COOKIE_NAME;
export const AUTH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matching the gate copy
