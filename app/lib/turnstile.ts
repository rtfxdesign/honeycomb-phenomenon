import { NextRequest } from "next/server";

/**
 * Cloudflare Turnstile: a bot check with no puzzles. The widget on the page
 * hands the browser a token; this checks it with Cloudflare before anything
 * is saved or unlocked.
 *
 * Env:
 *   TURNSTILE_SECRET_KEY            server side; when unset, every request
 *                                   passes, so a site without keys works as
 *                                   it did before
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  the widget's key; when unset the widget
 *                                   is not rendered at all
 *
 * The two go together: a secret with no site key would fail every request,
 * since no browser could produce a token. Set both or neither.
 */
export const turnstileConfigured = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(request: NextRequest, token: unknown): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  if (typeof token !== "string" || !token) return { ok: false, reason: "missing" };

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-nf-client-connection-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const body = await res.json().catch(() => ({}));
    if (body?.success === true) return { ok: true };
    const codes: string[] = Array.isArray(body?.["error-codes"]) ? body["error-codes"] : [];
    return { ok: false, reason: codes.join(",") || "rejected" };
  } catch (err) {
    // Cloudflare unreachable: fail closed on submit would lock everyone out
    // over a blip, so this is logged and allowed. The moderation queue is
    // still behind every submission.
    console.error("turnstile verify failed:", err);
    return { ok: true };
  }
}
