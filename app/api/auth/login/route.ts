import { NextResponse } from "next/server";

import {
  getSessionCookieOptions,
  requireSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/src/auth/config";
import { createSessionToken } from "@/src/auth/session-token";
import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";

export const runtime = "nodejs";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง",
        },
      },
      { status: 400 },
    );
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "กรุณากรอกอีเมลและรหัสผ่านให้ครบ",
        },
      },
      { status: 400 },
    );
  }

  const user = authenticateDemoUser(body.email, body.password);

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      },
      { status: 401 },
    );
  }

  try {
    const token = createSessionToken(user, requireSessionSecret(), {
      ttlSeconds: SESSION_TTL_SECONDS,
    });

    const response = NextResponse.json({
      ok: true,
      user: toAuthUser(user),
    });

    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(),
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "AUTH_CONFIGURATION_ERROR",
          message: "ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน",
        },
      },
      { status: 500 },
    );
  }
}
