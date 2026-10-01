import { NextResponse } from "next/server";

import {
  getExpiredSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/src/auth/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    getExpiredSessionCookieOptions(),
  );

  return response;
}
