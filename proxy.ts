import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "honeycomb_access";
const COOKIE_VALUE = "e83a1f0c32b84f78a15ec9d697c4be6a6d1a97c30187f966a70be2fe0c915b2f";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/current-honeycomb-mark.jpg"
  ) {
    return NextResponse.next();
  }

  if (request.cookies.get(COOKIE_NAME)?.value === COOKIE_VALUE) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
