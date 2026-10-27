import { NextRequest, NextResponse } from "next/server";
import {
  roleForPassword, partnerForPassword, createSessionToken, AUTH_COOKIE, maxAgeFor, Role,
} from "../../lib/auth";
import { memberForCode, touchLastSeen } from "../../lib/members";
import { verifyTurnstile } from "../../lib/turnstile";

/**
 * One field, four outcomes: the moderator password, the visitor password, a
 * partner's password (a visitor session marked with that partner), or a
 * member's access code.
 */
export async function POST(request: NextRequest) {
  try {
    const { password, turnstileToken } = await request.json();
    if (typeof password !== "string" || !password.trim()) {
      return NextResponse.json({ error: "Enter a password or access code" }, { status: 400 });
    }
    // the bot check runs before the password is even looked at, so a script
    // guessing passwords gets nothing back about them
    const bot = await verifyTurnstile(request, turnstileToken);
    if (!bot.ok) {
      return NextResponse.json({ error: "We could not confirm this is a person. Reload and try again." }, { status: 403 });
    }

    let token: string | null = null;
    let role: Role | null = null;
    let name: string | undefined;
    let origin: string | undefined;

    const passwordRole = roleForPassword(password);
    const partner = passwordRole ? null : partnerForPassword(password);
    if (passwordRole) {
      role = passwordRole;
      token = createSessionToken({ role: passwordRole });
    } else if (partner) {
      // A partner's password opens the archive as a visitor, and the session
      // remembers which partner it came through: whatever is submitted in it
      // is stamped with that origin.
      role = "visitor";
      origin = partner;
      token = createSessionToken({ role, origin });
    } else {
      const member = await memberForCode(password);
      if (member) {
        // A member whose record carries the moderator role gets a moderator
        // session under their own name — that name is what the audit log records.
        role = member.role === "moderator" ? "moderator" : "member";
        name = member.name;
        token = createSessionToken({ role, id: member.id, name: member.name });
        await touchLastSeen(member);
      }
    }

    if (!token || !role) {
      // A wrong guess waits a second before it hears so. Not a rate limit —
      // there is no shared counter on a serverless host — but it makes a
      // dictionary run against the gate slow and loud in the function logs.
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json({ error: "Not recognized" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, role, name, origin: origin ?? null });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAgeFor(role),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
