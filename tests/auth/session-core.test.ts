import { describe, expect, it } from "vitest";

import { verifyDemoPassword } from "@/src/auth/password";
import {
  createSessionToken,
  verifySessionToken,
} from "@/src/auth/session-token";
import {
  authenticateDemoUser,
  resolveSessionUser,
} from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";

const TEST_SECRET = "test-session-secret-with-at-least-32-characters";
const DEMO_PASSWORD_HASH =
  "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f";

describe("Web session core", () => {
  it("verifies the seeded demo password representation", () => {
    expect(verifyDemoPassword("12345678", DEMO_PASSWORD_HASH)).toBe(true);
    expect(verifyDemoPassword("wrong-password", DEMO_PASSWORD_HASH)).toBe(
      false,
    );
  });

  it("authenticates a seeded active demo user and rejects invalid credentials", () => {
    expect(
      authenticateDemoUser("owner@cliniccloud.demo", "12345678")?.role,
    ).toBe("OWNER");

    expect(
      authenticateDemoUser("owner@cliniccloud.demo", "wrong-password"),
    ).toBeNull();

    expect(
      authenticateDemoUser("unknown@cliniccloud.demo", "12345678"),
    ).toBeNull();
  });

  it("creates and verifies a signed session token", () => {
    const user = getUserById("USR-STAFF-001");

    expect(user).not.toBeNull();

    const token = createSessionToken(user!, TEST_SECRET, {
      now: new Date("2026-10-01T04:00:00.000Z"),
      ttlSeconds: 3600,
    });

    const payload = verifySessionToken(
      token,
      TEST_SECRET,
      new Date("2026-10-01T04:30:00.000Z"),
    );

    expect(payload).toMatchObject({
      version: 1,
      userId: "USR-STAFF-001",
      clinicId: "CLINIC-001",
      role: "STAFF",
    });
  });

  it("rejects a tampered token", () => {
    const user = getUserById("USR-STAFF-001");
    const token = createSessionToken(user!, TEST_SECRET, {
      now: new Date("2026-10-01T04:00:00.000Z"),
      ttlSeconds: 3600,
    });

    const [payload, signature] = token.split(".");
    const tampered = `${payload}x.${signature}`;

    expect(
      verifySessionToken(
        tampered,
        TEST_SECRET,
        new Date("2026-10-01T04:30:00.000Z"),
      ),
    ).toBeNull();
  });

  it("rejects an expired token", () => {
    const user = getUserById("USR-STAFF-001");
    const token = createSessionToken(user!, TEST_SECRET, {
      now: new Date("2026-10-01T04:00:00.000Z"),
      ttlSeconds: 60,
    });

    expect(
      verifySessionToken(
        token,
        TEST_SECRET,
        new Date("2026-10-01T04:02:00.000Z"),
      ),
    ).toBeNull();
  });

  it("resolves the current user from signed identity and excludes passwordHash", () => {
    const user = getUserById("USR-PATIENT-001");
    const token = createSessionToken(user!, TEST_SECRET, {
      now: new Date("2026-10-01T04:00:00.000Z"),
      ttlSeconds: 3600,
    });

    const resolved = resolveSessionUser(
      token,
      TEST_SECRET,
      new Date("2026-10-01T04:30:00.000Z"),
    );

    expect(resolved).toMatchObject({
      id: "USR-PATIENT-001",
      role: "PATIENT",
      linkedPatientId: "PAT-001",
    });
    expect(resolved).not.toHaveProperty("passwordHash");
  });

  it("rejects a signed token when trusted user identity no longer matches", () => {
    const user = getUserById("USR-STAFF-001");

    const token = createSessionToken(
      {
        ...user!,
        role: "OWNER",
      },
      TEST_SECRET,
      {
        now: new Date("2026-10-01T04:00:00.000Z"),
        ttlSeconds: 3600,
      },
    );

    expect(
      resolveSessionUser(
        token,
        TEST_SECRET,
        new Date("2026-10-01T04:30:00.000Z"),
      ),
    ).toBeNull();
  });
});
