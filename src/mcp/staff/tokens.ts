import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { AuthInfo, OAuthTokenVerifier } from "@modelcontextprotocol/server";
import {
  OAuthError,
  OAuthErrorCode,
} from "@modelcontextprotocol/server";

import type { AuthUser } from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import { isPersonnelRole } from "@/src/authorization/permissions";
import {
  STAFF_ACCESS_TOKEN_TTL_SECONDS,
  STAFF_AUTH_CODE_TTL_SECONDS,
  STAFF_CLIENT_ID_TTL_SECONDS,
  STAFF_MCP_AUDIENCE,
  STAFF_MCP_SCOPE,
  STAFF_REFRESH_TOKEN_TTL_SECONDS,
} from "@/src/mcp/staff/config";
import type { UserRole } from "@/src/types/private-data";

type SignedEnvelope<T> = T & {
  version: 1;
  issuedAt: number;
  expiresAt: number;
};

type RegisteredClientPayload = SignedEnvelope<{
  kind: "client";
  redirectUris: string[];
  clientName: string | null;
  grantTypes: Array<"authorization_code" | "refresh_token">;
}>;

type AuthorizationCodePayload = SignedEnvelope<{
  kind: "authorization_code";
  sub: string;
  clinicId: string;
  role: UserRole;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: typeof STAFF_MCP_SCOPE;
  offlineAccess: boolean;
}>;

export type StaffAccessTokenPayload = SignedEnvelope<{
  kind: "access_token";
  sub: string;
  clinicId: string;
  role: UserRole;
  aud: typeof STAFF_MCP_AUDIENCE;
  clientId: string;
  scopes: [typeof STAFF_MCP_SCOPE];
}>;

export type StaffRefreshTokenPayload = SignedEnvelope<{
  kind: "refresh_token";
  sub: string;
  clinicId: string;
  role: UserRole;
  aud: typeof STAFF_MCP_AUDIENCE;
  clientId: string;
  scopes: [typeof STAFF_MCP_SCOPE];
  nonce: string;
}>;

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encode<T extends object>(payload: T, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return `${body}.${sign(body, secret)}`;
}

function decode(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [body, signature] = parts;

  if (!body || !signature || !safeEqual(signature, sign(body, secret))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );

    return payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function epochSeconds(now: Date): number {
  return Math.floor(now.getTime() / 1000);
}

function validWindow(
  payload: Record<string, unknown>,
  now: Date,
): payload is Record<string, unknown> & {
  version: 1;
  issuedAt: number;
  expiresAt: number;
} {
  if (
    payload.version !== 1 ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.expiresAt !== "number"
  ) {
    return false;
  }

  const nowSeconds = epochSeconds(now);

  return (
    payload.issuedAt <= nowSeconds &&
    payload.expiresAt > nowSeconds &&
    payload.expiresAt > payload.issuedAt
  );
}

function isUserRole(value: unknown): value is UserRole {
  return ["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"].includes(
    String(value),
  );
}

function toTrustedPersonnel(
  userId: string,
  clinicId: string,
  role: UserRole,
): AuthUser | null {
  const record = getUserById(userId);

  if (
    !record ||
    !record.active ||
    record.clinicId !== clinicId ||
    record.role !== role ||
    !isPersonnelRole(record.role)
  ) {
    return null;
  }

  return {
    id: record.id,
    clinicId: record.clinicId,
    email: record.email,
    displayName: record.displayName,
    role: record.role,
    linkedPatientId: record.linkedPatientId,
    linkedDoctorId: record.linkedDoctorId,
    active: record.active,
  };
}

export function createRegisteredClientId(
  input: {
    redirectUris: string[];
    clientName?: string | null;
    grantTypes?: Array<"authorization_code" | "refresh_token">;
  },
  secret: string,
  now = new Date(),
): string {
  const issuedAt = epochSeconds(now);

  return encode<RegisteredClientPayload>(
    {
      version: 1,
      kind: "client",
      redirectUris: [...input.redirectUris],
      clientName: input.clientName?.trim() || null,
      grantTypes: [...(input.grantTypes ?? ["authorization_code"])],
      issuedAt,
      expiresAt: issuedAt + STAFF_CLIENT_ID_TTL_SECONDS,
    },
    secret,
  );
}

export function verifyRegisteredClientId(
  clientId: string,
  secret: string,
  now = new Date(),
): RegisteredClientPayload | null {
  const payload = decode(clientId, secret);

  if (
    !payload ||
    !validWindow(payload, now) ||
    payload.kind !== "client" ||
    !Array.isArray(payload.redirectUris) ||
    !payload.redirectUris.every((uri) => typeof uri === "string") ||
    !(
      payload.clientName === null ||
      typeof payload.clientName === "string"
    ) ||
    !Array.isArray(payload.grantTypes) ||
    !payload.grantTypes.includes("authorization_code") ||
    !payload.grantTypes.every(
      (grantType) =>
        grantType === "authorization_code" || grantType === "refresh_token",
    )
  ) {
    return null;
  }

  return payload as RegisteredClientPayload;
}

export function createAuthorizationCode(
  user: AuthUser,
  input: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    offlineAccess?: boolean;
  },
  secret: string,
  now = new Date(),
): string {
  if (!isPersonnelRole(user.role)) {
    throw new Error("Staff MCP authorization requires a personnel identity");
  }

  const issuedAt = epochSeconds(now);

  return encode<AuthorizationCodePayload>(
    {
      version: 1,
      kind: "authorization_code",
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      scope: STAFF_MCP_SCOPE,
      offlineAccess: input.offlineAccess === true,
      issuedAt,
      expiresAt: issuedAt + STAFF_AUTH_CODE_TTL_SECONDS,
    },
    secret,
  );
}

export function verifyAuthorizationCode(
  code: string,
  secret: string,
  now = new Date(),
): AuthorizationCodePayload | null {
  const payload = decode(code, secret);

  if (
    !payload ||
    !validWindow(payload, now) ||
    payload.kind !== "authorization_code" ||
    typeof payload.sub !== "string" ||
    typeof payload.clinicId !== "string" ||
    !isUserRole(payload.role) ||
    typeof payload.clientId !== "string" ||
    typeof payload.redirectUri !== "string" ||
    typeof payload.codeChallenge !== "string" ||
    payload.scope !== STAFF_MCP_SCOPE ||
    typeof payload.offlineAccess !== "boolean"
  ) {
    return null;
  }

  if (
    !toTrustedPersonnel(
      payload.sub,
      payload.clinicId,
      payload.role,
    )
  ) {
    return null;
  }

  return payload as AuthorizationCodePayload;
}

export function createStaffAccessToken(
  user: AuthUser,
  clientId: string,
  secret: string,
  now = new Date(),
): string {
  if (!isPersonnelRole(user.role)) {
    throw new Error("Staff MCP access requires a personnel identity");
  }

  const issuedAt = epochSeconds(now);

  return encode<StaffAccessTokenPayload>(
    {
      version: 1,
      kind: "access_token",
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
      aud: STAFF_MCP_AUDIENCE,
      clientId,
      scopes: [STAFF_MCP_SCOPE],
      issuedAt,
      expiresAt: issuedAt + STAFF_ACCESS_TOKEN_TTL_SECONDS,
    },
    secret,
  );
}

export function verifyStaffAccessToken(
  token: string,
  secret: string,
  now = new Date(),
): {
  payload: StaffAccessTokenPayload;
  user: AuthUser;
} | null {
  const payload = decode(token, secret);

  if (
    !payload ||
    !validWindow(payload, now) ||
    payload.kind !== "access_token" ||
    typeof payload.sub !== "string" ||
    typeof payload.clinicId !== "string" ||
    !isUserRole(payload.role) ||
    payload.aud !== STAFF_MCP_AUDIENCE ||
    typeof payload.clientId !== "string" ||
    !Array.isArray(payload.scopes) ||
    payload.scopes.length !== 1 ||
    payload.scopes[0] !== STAFF_MCP_SCOPE
  ) {
    return null;
  }

  const user = toTrustedPersonnel(
    payload.sub,
    payload.clinicId,
    payload.role,
  );

  if (!user) {
    return null;
  }

  return {
    payload: payload as StaffAccessTokenPayload,
    user,
  };
}

export function createStaffRefreshToken(
  user: AuthUser,
  clientId: string,
  secret: string,
  now = new Date(),
): string {
  if (!isPersonnelRole(user.role)) {
    throw new Error("Staff MCP refresh requires a personnel identity");
  }

  const issuedAt = epochSeconds(now);

  return encode<StaffRefreshTokenPayload>(
    {
      version: 1,
      kind: "refresh_token",
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
      aud: STAFF_MCP_AUDIENCE,
      clientId,
      scopes: [STAFF_MCP_SCOPE],
      nonce: randomBytes(16).toString("base64url"),
      issuedAt,
      expiresAt: issuedAt + STAFF_REFRESH_TOKEN_TTL_SECONDS,
    },
    secret,
  );
}

export function verifyStaffRefreshToken(
  token: string,
  secret: string,
  now = new Date(),
): {
  payload: StaffRefreshTokenPayload;
  user: AuthUser;
} | null {
  const payload = decode(token, secret);

  if (
    !payload ||
    !validWindow(payload, now) ||
    payload.kind !== "refresh_token" ||
    typeof payload.sub !== "string" ||
    typeof payload.clinicId !== "string" ||
    !isUserRole(payload.role) ||
    payload.aud !== STAFF_MCP_AUDIENCE ||
    typeof payload.clientId !== "string" ||
    !Array.isArray(payload.scopes) ||
    payload.scopes.length !== 1 ||
    payload.scopes[0] !== STAFF_MCP_SCOPE ||
    typeof payload.nonce !== "string" ||
    payload.nonce.length < 16
  ) {
    return null;
  }

  const user = toTrustedPersonnel(
    payload.sub,
    payload.clinicId,
    payload.role,
  );

  if (!user) {
    return null;
  }

  return {
    payload: payload as StaffRefreshTokenPayload,
    user,
  };
}

export function verifyPkceS256(
  codeVerifier: string,
  expectedChallenge: string,
): boolean {
  const actualChallenge = createHash("sha256")
    .update(codeVerifier, "utf8")
    .digest("base64url");

  return safeEqual(actualChallenge, expectedChallenge);
}

export function createStaffMcpTokenVerifier(
  secret: string,
): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const verified = verifyStaffAccessToken(token, secret);

      if (!verified) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "Invalid or expired Staff MCP access token.",
        );
      }

      return {
        token,
        clientId: verified.payload.clientId,
        scopes: [...verified.payload.scopes],
        expiresAt: verified.payload.expiresAt,
        extra: {
          userId: verified.user.id,
          clinicId: verified.user.clinicId,
          role: verified.user.role,
          linkedDoctorId: verified.user.linkedDoctorId,
        },
      };
    },
  };
}
