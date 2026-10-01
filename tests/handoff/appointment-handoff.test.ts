import { describe, expect, it } from "vitest";

import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import {
  createAppointmentHandoffLink,
  createAppointmentHandoffToken,
  verifyAppointmentHandoffToken,
} from "@/src/handoff/appointment-token";
import { resolveAppointmentHandoffForWeb } from "@/src/handoff/appointment-web";

const SECRET =
  "phase-34-handoff-secret-with-more-than-thirty-two-characters";
const NOW = new Date("2026-10-01T07:00:00.000Z");

function user(email: string) {
  const record = authenticateDemoUser(email, "12345678");

  if (!record) {
    throw new Error(`Missing seeded account: ${email}`);
  }

  return toAuthUser(record);
}

describe("appointment handoff token and Web revalidation", () => {
  it("creates an opaque five-minute handoff bound to identity and action", () => {
    const action = {
      type: "CREATE_APPOINTMENT" as const,
      patientId: "PAT-001",
      doctorId: "DOC-001",
      serviceId: "SVC-001",
      date: "2026-10-08",
      time: "14:00",
      note: "Sensitive synthetic handoff note",
    };

    const link = createAppointmentHandoffLink(
      user("staff@cliniccloud.demo"),
      action,
      SECRET,
      "https://clinic.example",
      NOW,
    );

    expect(link.url).toMatch(
      /^https:\/\/clinic\.example\/handoff\/appointment\?token=/,
    );
    expect(link.token).not.toContain("PAT-001");
    expect(link.token).not.toContain("Sensitive");
    expect(link.expiresAt).toBe("2026-10-01T07:05:00.000Z");

    const payload = verifyAppointmentHandoffToken(
      link.token,
      SECRET,
      new Date("2026-10-01T07:04:59.000Z"),
    );

    expect(payload).toMatchObject({
      userId: "USR-STAFF-001",
      clinicId: "CLINIC-001",
      role: "STAFF",
      action,
    });
    expect(payload?.handoffId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("rejects modified and expired handoff tokens", () => {
    const { token } = createAppointmentHandoffToken(
      user("staff@cliniccloud.demo"),
      {
        type: "CANCEL_APPOINTMENT",
        appointmentId: "APT-001",
      },
      SECRET,
      NOW,
    );

    const parts = token.split(".");
    const encrypted = parts[2]!;
    const first = encrypted[0]!;
    parts[2] = `${first === "A" ? "B" : "A"}${encrypted.slice(1)}`;
    const tampered = parts.join(".");

    expect(
      verifyAppointmentHandoffToken(tampered, SECRET, NOW),
    ).toBeNull();
    expect(
      verifyAppointmentHandoffToken(
        token,
        SECRET,
        new Date("2026-10-01T07:05:00.000Z"),
      ),
    ).toBeNull();
  });

  it("rejects non-canonical Base64URL aliases even when bytes are unchanged", () => {
    const { token } = createAppointmentHandoffToken(
      user("staff@cliniccloud.demo"),
      {
        type: "CANCEL_APPOINTMENT",
        appointmentId: "APT-001",
      },
      SECRET,
      NOW,
    );

    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const parts = token.split(".");
    const tag = parts[3]!;
    const last = tag.at(-1)!;
    const lastIndex = alphabet.indexOf(last);
    const aliasIndex = (lastIndex & 0b110000) | 0b000001;
    const aliasTag = `${tag.slice(0, -1)}${alphabet[aliasIndex]}`;

    expect(Buffer.from(aliasTag, "base64url")).toEqual(
      Buffer.from(tag, "base64url"),
    );

    parts[3] = aliasTag;
    expect(
      verifyAppointmentHandoffToken(parts.join("."), SECRET, NOW),
    ).toBeNull();
  });

  it("rejects a Web session that is not the same personnel identity", () => {
    const { token } = createAppointmentHandoffToken(
      user("staff@cliniccloud.demo"),
      {
        type: "CANCEL_APPOINTMENT",
        appointmentId: "APT-001",
      },
      SECRET,
      NOW,
    );

    const resolution = resolveAppointmentHandoffForWeb(
      user("owner@cliniccloud.demo"),
      token,
      SECRET,
      NOW,
    );

    expect(resolution).toMatchObject({
      ok: false,
      error: {
        code: "IDENTITY_MISMATCH",
      },
    });
  });

  it("revalidates a valid create handoff against current Web permissions and Base options", () => {
    const staff = user("staff@cliniccloud.demo");
    const { token } = createAppointmentHandoffToken(
      staff,
      {
        type: "CREATE_APPOINTMENT",
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-08",
        time: "14:00",
        note: "Prepared by Staff MCP",
      },
      SECRET,
      NOW,
    );

    const resolution = resolveAppointmentHandoffForWeb(
      staff,
      token,
      SECRET,
      NOW,
    );

    expect(resolution).toMatchObject({
      ok: true,
      data: {
        kind: "create",
        action: {
          patientId: "PAT-001",
          doctorId: "DOC-001",
          serviceId: "SVC-001",
        },
        serverPreview: {
          status: "SCHEDULED",
        },
      },
    });
  });

  it("revalidates permissions instead of trusting a signed foreign DOCTOR action", () => {
    const doctor = user("doctor@cliniccloud.demo");
    const { token } = createAppointmentHandoffToken(
      doctor,
      {
        type: "UPDATE_APPOINTMENT",
        appointmentId: "APT-002",
        patch: {
          note: "Foreign appointment update",
        },
      },
      SECRET,
      NOW,
    );

    const resolution = resolveAppointmentHandoffForWeb(
      doctor,
      token,
      SECRET,
      NOW,
    );

    expect(resolution).toMatchObject({
      ok: false,
      error: {
        code: "FORBIDDEN",
      },
    });
  });

  it("fails closed for malformed prepared actions before a token is issued", () => {
    expect(() =>
      createAppointmentHandoffToken(
        user("staff@cliniccloud.demo"),
        {
          type: "CREATE_APPOINTMENT",
          patientId: "PAT-001",
          doctorId: "DOC-NOT-FOUND",
          serviceId: "SVC-001",
          date: "not-a-date",
          time: "14:00",
          note: "",
        },
        SECRET,
        NOW,
      ),
    ).toThrow();
  });
});
