import { NextResponse } from "next/server";

import {
  getExpiredSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/src/auth/config";
import { getCurrentUser } from "@/src/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      const response = NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 401 },
      );

      response.headers.set("Cache-Control", "no-store");
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        getExpiredSessionCookieOptions(),
      );

      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      user,
    });

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: {
          code: "AUTH_CONFIGURATION_ERROR",
          message: "ระบบ session ยังไม่พร้อมใช้งาน",
        },
      },
      { status: 500 },
    );
  }
}
