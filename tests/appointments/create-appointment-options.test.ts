import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { toAuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getCreateAppointmentPageData } from "@/src/appointments/create-options";
import { getUserById } from "@/src/data-access/private";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

describe("create appointment server options", () => {
  it("gives STAFF the authorized clinic patients and active public options", () => {
    const data = getCreateAppointmentPageData(user("USR-STAFF-001"));

    expect(data.options.patients).toHaveLength(20);
    expect(data.options.doctors).toHaveLength(4);
    expect(data.options.services).toHaveLength(8);
    expect(data.baseAppointments).toHaveLength(30);

    expect(data.options.patients[0]).toMatchObject({
      value: "PAT-001",
      label: "HN000001 · สมชาย ใจดี",
    });
  });

  it("limits DOCTOR patient choices and doctor assignment to linked identity", () => {
    const data = getCreateAppointmentPageData(user("USR-DOCTOR-001"));

    expect(data.options.patients.length).toBeGreaterThan(0);
    expect(data.options.patients.length).toBeLessThan(20);
    expect(data.options.doctors).toEqual([
      expect.objectContaining({
        value: "DOC-001",
        label: "นพ. สาธิต เมตตา",
      }),
    ]);
    expect(
      data.baseAppointments.every(
        (appointment) => appointment.doctorId === "DOC-001",
      ),
    ).toBe(true);
  });

  it("rejects PATIENT from create appointment page-data boundary", () => {
    expect(() =>
      getCreateAppointmentPageData(user("USR-PATIENT-001")),
    ).toThrow(AuthorizationError);
  });
});
