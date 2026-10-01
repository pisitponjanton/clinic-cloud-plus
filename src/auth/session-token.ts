import { createHmac, timingSafeEqual } from "node:crypto";

import type { DemoUser, UserRole } from "@/src/types/private-data";

export type SessionTokenPayload = {
  version: 1;
  userId: string;
  clinicId: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
};

type CreateSessionTokenOptions = {
  now?: Date;
  ttlSeconds: number;
};

function encodePayload(payload: SessionTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signEncodedPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

function safeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isUserRole(value: unknown): value is UserRole {
  return ["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"].includes(
    String(value),
  );
}

function parsePayload(encodedPayload: string): SessionTokenPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionTokenPayload>;

    if (
      parsed.version !== 1 ||
      typeof parsed.userId !== "string" ||
      typeof parsed.clinicId !== "string" ||
      !isUserRole(parsed.role) ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return parsed as SessionTokenPayload;
  } catch {
    return null;
  }
}

export function createSessionToken(
  user: Pick<DemoUser, "id" | "clinicId" | "role">,
  secret: string,
  options: CreateSessionTokenOptions,
): string {
  const now = options.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1000);

  const payload: SessionTokenPayload = {
    version: 1,
    userId: user.id,
    clinicId: user.clinicId,
    role: user.role,
    issuedAt,
    expiresAt: issuedAt + options.ttlSeconds,
  };

  const encodedPayload = encodePayload(payload);
  const signature = signEncodedPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): SessionTokenPayload | null {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signEncodedPayload(encodedPayload, secret);

  if (!safeEqualText(signature, expectedSignature)) {
    return null;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload) {
    return null;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);

  if (
    payload.issuedAt > nowSeconds ||
    payload.expiresAt <= nowSeconds ||
    payload.expiresAt <= payload.issuedAt
  ) {
    return null;
  }

  return payload;
}
