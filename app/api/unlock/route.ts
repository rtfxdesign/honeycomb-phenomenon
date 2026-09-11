import { NextRequest, NextResponse } from "next/server";
import {
  roleForPassword, createSessionToken, AUTH_COOKIE, AUTH_MAX_AGE,
} from "../../lib/auth";
import { memberForCode, touchLastSeen } from "../../lib/members";

/**
 * One field, three outcomes: the moderator password, the visitor password, or
 * a member's access code.
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || !password.trim()) {
      return NextResponse.json({ error: "Enter a password or access code" }, { status: 400 });
    }

    let token: string | null = null;
    let role: string | null = null;
    let name: string | undefined;

    const passwordRole = roleForPassword(password);
    if (passwordRole) {
      role = passwordRole;
      token = createSessionToken({ role: passwordRole });
    } else {
      const member = await memberForCode(password);
      if (member) {
        role = "member";
        name = member.name;
        token = createSessionToken({ role: "member", id: member.id, name: member.name });
        await touchLastSeen(member);
      }
    }

    if (!token || !role) {
      return NextResponse.json({ error: "Not recognized" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, role, name });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_MAX_AGE,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
