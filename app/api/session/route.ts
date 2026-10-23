import { NextRequest, NextResponse } from "next/server";
import { getSession, AUTH_COOKIE } from "../../lib/auth";

export const dynamic = "force-dynamic";

/** Who the browser is currently signed in as, for the header line. */
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ role: null });
  // id lets the review dashboard tell a signature of yours from somebody else's
  return NextResponse.json({ role: session.role, name: session.name ?? null, id: session.id ?? null });
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
