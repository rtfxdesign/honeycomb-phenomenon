import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

/**
 * Three tiers of access to the archive.
 *
 *   visitor    — public stories only
 *   member     — public plus "Community only" stories; an approved member with
 *                their own access code, revocable one person at a time
 *   moderator  — everything, including /review
 *
 * The gate takes one password field and works out which of the three it is:
 * the moderator password, the visitor password, or a member's access code.
 *
 * Env:
 *   HONEYCOMB_PASSWORD            visitor password(s); several may be given,
 *                                 comma-separated, and any of them opens the site
 *   HONEYCOMB_MODERATOR_PASSWORD  optional, same form; when unset the visitor
 *                                 password also grants moderator, which is how
 *                                 the site behaved before members existed
 *   HONEYCOMB_SESSION_SECRET      optional; signs session cookies
 */

export type Role = "visitor" | "member" | "moderator";

export interface Session {
  role: Role;
  /** member id, when role is "member" */
  id?: string;
  /** member display name, for the "signed in as" line */
  name?: string;
  exp: number;
}

// No fallback: with HONEYCOMB_PASSWORD unset, no password opens the site.
const VISITOR_PASSWORD = process.env.HONEYCOMB_PASSWORD || "";
const MODERATOR_PASSWORD = process.env.HONEYCOMB_MODERATOR_PASSWORD || "";
// "tulsa, Merida" → ["tulsa", "Merida"]; a password cannot itself contain a comma
const list = (v: string) => v.split(",").map((p) => p.trim()).filter(Boolean);
const VISITOR_PASSWORDS = list(VISITOR_PASSWORD);
const MODERATOR_PASSWORDS = list(MODERATOR_PASSWORD);
// every candidate is compared, so timing does not reveal which one matched
const matchesAny = (password: string, candidates: string[]) =>
  candidates.reduce((hit, c) => safeEqual(password, c) || hit, false);

export const AUTH_COOKIE = "hc_auth";
export const AUTH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matching the gate copy

const secret = () =>
  process.env.HONEYCOMB_SESSION_SECRET ||
  createHash("sha256").update("hc-archive-v1" + VISITOR_PASSWORD + MODERATOR_PASSWORD).digest("hex");

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Constant-time compare that also tolerates length differences. */
export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // still burn a comparison so the timing does not leak the length
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function createSessionToken(session: Omit<Session, "exp">): string {
  const payload: Session = { ...session, exp: Date.now() + AUTH_MAX_AGE * 1000 };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(signature, sign(body))) return null;
  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    if (!session.exp || session.exp < Date.now()) return null;
    if (session.role !== "visitor" && session.role !== "member" && session.role !== "moderator") return null;
    return session;
  } catch {
    return null;
  }
}

export function getSession(request: NextRequest): Session | null {
  return readSessionToken(request.cookies.get(AUTH_COOKIE)?.value);
}

export const isModerator = (request: NextRequest) => getSession(request)?.role === "moderator";

/** Members and moderators can both see "Community only" stories. */
export const canSeeCommunity = (session: Session | null) =>
  session?.role === "member" || session?.role === "moderator";

/**
 * Which tier a password belongs to. Returns null when it matches nothing —
 * member access codes are checked separately, against R2.
 */
export function roleForPassword(password: unknown): Role | null {
  if (typeof password !== "string" || !password) return null;
  if (MODERATOR_PASSWORDS.length) {
    if (matchesAny(password, MODERATOR_PASSWORDS)) return "moderator";
    if (matchesAny(password, VISITOR_PASSWORDS)) return "visitor";
    return null;
  }
  // No separate moderator password configured: the one password still does
  // everything, exactly as before members existed.
  return matchesAny(password, VISITOR_PASSWORDS) ? "moderator" : null;
}
