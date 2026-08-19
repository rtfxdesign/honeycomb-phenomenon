import { NextRequest, NextResponse } from "next/server";
import { checkPassword, authToken, AUTH_COOKIE, AUTH_MAX_AGE } from "../../lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!checkPassword(password)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE, authToken(), {
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
