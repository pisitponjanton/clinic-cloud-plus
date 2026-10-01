import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import {
  SESSION_COOKIE_NAME,
  SESSION_SECRET_ENV,
} from "@/src/auth/config";
import { verifySessionToken } from "@/src/auth/session-token";
import {
  authenticateDemoUser,
  verifyDemoUserCredentials,
} from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import type { DemoUser } from "@/src/types/private-data";

const TEST_SECRET =
  "phase-11-test-session-secret-with-more-than-32-characters";

const demoAccounts = [
  ["OWNER", "owner@cliniccloud.demo"],
  ["STAFF", "staff@cliniccloud.demo"],
  ["DOCTOR", "doctor@cliniccloud.demo"],
  ["NURSE", "nurse@cliniccloud.demo"],
  ["PATIENT", "patient@cliniccloud.demo"],
] as const;

function loginRequest(email: string, password: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

describe("authentication boundary", () => {
  beforeEach(() => {
    process.env[SESSION_SECRET_ENV] = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env[SESSION_SECRET_ENV];
  });

  it.each(demoAccounts)(
    "accepts the seeded %s demo account and creates a signed HttpOnly session",
    async (role, email) => {
      const response = await login(loginRequest(email, "12345678"));
      const body = (await response.json()) as {
        ok: boolean;
        user: {
          id: string;
          role: string;
          email: string;
        };
      };

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.user.role).toBe(role);
      expect(body.user.email).toBe(email);
      expect(body.user).not.toHaveProperty("passwordHash");

      const setCookie = response.headers.get("set-cookie") ?? "";

      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie.toLowerCase()).toContain("samesite=lax");
      expect(setCookie).toContain("Path=/");
      expect(setCookie).toContain("Max-Age=28800");
      expect(response.headers.get("cache-control")).toBe("no-store");

      const cookieValue = setCookie
        .split(";")[0]
        ?.slice(`${SESSION_COOKIE_NAME}=`.length);

      expect(cookieValue).toBeTruthy();

      const payload = verifySessionToken(cookieValue!, TEST_SECRET);

      expect(payload).toMatchObject({
        clinicId: "CLINIC-001",
        role,
      });
    },
  );

  it("rejects an incorrect password without creating a session cookie", async () => {
    const response = await login(
      loginRequest("owner@cliniccloud.demo", "wrong-password"),
    );
    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string };
    };

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "INVALID_CREDENTIALS" },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an unknown email without creating a session cookie", async () => {
    const response = await login(
      loginRequest("unknown@cliniccloud.demo", "12345678"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects malformed or incomplete login requests", async () => {
    const malformed = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "{",
      }),
    );

    const incomplete = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "owner@cliniccloud.demo" }),
      }),
    );

    expect(malformed.status).toBe(400);
    expect(incomplete.status).toBe(400);
    expect(malformed.headers.get("set-cookie")).toBeNull();
    expect(incomplete.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an inactive account at the credential-verification boundary", () => {
    const activeUser = getUserById("USR-OWNER-001");

    expect(activeUser).not.toBeNull();

    const inactiveUser: DemoUser = {
      ...activeUser!,
      active: false,
    };

    expect(verifyDemoUserCredentials(inactiveUser, "12345678")).toBe(false);
  });

  it("rejects unknown credentials through the public authentication helper", () => {
    expect(
      authenticateDemoUser("unknown@cliniccloud.demo", "12345678"),
    ).toBeNull();
  });

  it("fails closed when the session signing secret is missing", async () => {
    delete process.env[SESSION_SECRET_ENV];

    const response = await login(
      loginRequest("staff@cliniccloud.demo", "12345678"),
    );
    const body = (await response.json()) as {
      ok: boolean;
      error: { code: string };
    };

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      ok: false,
      error: { code: "AUTH_CONFIGURATION_ERROR" },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("logout expires only the auth cookie and redirects to /login", async () => {
    const response = await logout(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("keeps authentication code independent from browser localStorage", () => {
    const authSources = [
      "src/auth/config.ts",
      "src/auth/password.ts",
      "src/auth/session-token.ts",
      "src/auth/user.ts",
      "src/auth/current-user.ts",
      "app/api/auth/login/route.ts",
      "app/api/auth/logout/route.ts",
      "app/api/auth/session/route.ts",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(authSources).not.toContain("localStorage");
    expect(authSources).not.toContain("sessionStorage");
  });
});
