import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import * as z from "zod/v4";

import type { AuthUser } from "@/src/auth/user";
import {
  APPOINTMENT_HANDOFF_PATH,
  APPOINTMENT_HANDOFF_TTL_SECONDS,
} from "@/src/handoff/config";
import type {
  PreparedCancelAppointmentAction,
  PreparedCreateAppointmentAction,
  PreparedUpdateAppointmentAction,
} from "@/src/mcp/staff/tools/prepared";

const AUDIENCE = "clinic-cloud-plus-appointment-handoff";
const TOKEN_VERSION = 1 as const;

const PERSONNEL_ROLE = z.enum([
  "OWNER",
  "STAFF",
  "DOCTOR",
  "NURSE",
]);

const CREATE_ACTION = z
  .object({
    type: z.literal("CREATE_APPOINTMENT"),
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    serviceId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    note: z.string(),
  })
  .strict();

const UPDATE_PATCH = z
  .object({
    doctorId: z.string().min(1).nullable().optional(),
    serviceId: z.string().min(1).nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    note: z.string().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0);

const UPDATE_ACTION = z
  .object({
    type: z.literal("UPDATE_APPOINTMENT"),
    appointmentId: z.string().min(1),
    patch: UPDATE_PATCH,
  })
  .strict();

const CANCEL_ACTION = z
  .object({
    type: z.literal("CANCEL_APPOINTMENT"),
    appointmentId: z.string().min(1),
  })
  .strict();

export const APPOINTMENT_HANDOFF_ACTION = z.discriminatedUnion("type", [
  CREATE_ACTION,
  UPDATE_ACTION,
  CANCEL_ACTION,
]);

export type AppointmentHandoffAction =
  | PreparedCreateAppointmentAction
  | PreparedUpdateAppointmentAction
  | PreparedCancelAppointmentAction;

const PAYLOAD_SCHEMA = z
  .object({
    version: z.literal(TOKEN_VERSION),
    audience: z.literal(AUDIENCE),
    handoffId: z.string().uuid(),
    userId: z.string().min(1),
    clinicId: z.string().min(1),
    role: PERSONNEL_ROLE,
    action: APPOINTMENT_HANDOFF_ACTION,
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type AppointmentHandoffPayload = z.infer<typeof PAYLOAD_SCHEMA>;

export type AppointmentHandoffLink = {
  token: string;
  url: string;
  expiresAt: string;
};

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function decodeCanonicalBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, "base64url");

  if (decoded.toString("base64url") !== value) {
    return null;
  }

  return decoded;
}

function encodePayload(
  payload: AppointmentHandoffPayload,
  secret: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function createAppointmentHandoffToken(
  user: AuthUser,
  action: AppointmentHandoffAction,
  secret: string,
  now: Date = new Date(),
): {
  token: string;
  expiresAt: Date;
} {
  if (user.role === "PATIENT") {
    throw new Error("Appointment handoff requires a personnel identity.");
  }

  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + APPOINTMENT_HANDOFF_TTL_SECONDS;
  const payload = PAYLOAD_SCHEMA.parse({
    version: TOKEN_VERSION,
    audience: AUDIENCE,
    handoffId: randomUUID(),
    userId: user.id,
    clinicId: user.clinicId,
    role: user.role,
    action,
    issuedAt,
    expiresAt,
  });

  return {
    token: encodePayload(payload, secret),
    expiresAt: new Date(expiresAt * 1000),
  };
}

export function verifyAppointmentHandoffToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): AppointmentHandoffPayload | null {
  const parts = token.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    return null;
  }

  try {
    const iv = decodeCanonicalBase64Url(parts[1]!);
    const encrypted = decodeCanonicalBase64Url(parts[2]!);
    const tag = decodeCanonicalBase64Url(parts[3]!);

    if (!iv || !encrypted || !tag || iv.length !== 12 || tag.length !== 16) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFromSecret(secret),
      iv,
    );
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
    const parsed = PAYLOAD_SCHEMA.safeParse(JSON.parse(plaintext));

    if (!parsed.success) {
      return null;
    }

    const current = Math.floor(now.getTime() / 1000);
    const payload = parsed.data;

    if (
      payload.issuedAt > current + 60 ||
      payload.expiresAt <= current ||
      payload.expiresAt - payload.issuedAt >
        APPOINTMENT_HANDOFF_TTL_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createAppointmentHandoffLink(
  user: AuthUser,
  action: AppointmentHandoffAction,
  secret: string,
  origin: string,
  now: Date = new Date(),
): AppointmentHandoffLink {
  const { token, expiresAt } = createAppointmentHandoffToken(
    user,
    action,
    secret,
    now,
  );
  const url = new URL(APPOINTMENT_HANDOFF_PATH, origin);
  url.searchParams.set("token", token);

  return {
    token,
    url: url.toString(),
    expiresAt: expiresAt.toISOString(),
  };
}
