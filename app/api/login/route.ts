import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string } | null;

  if (body?.password !== "tulsa") {
    return NextResponse.json({ error: "That password isn’t right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("honeycomb_access", "e83a1f0c32b84f78a15ec9d697c4be6a6d1a97c30187f966a70be2fe0c915b2f", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
