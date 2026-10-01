import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type {
  Appointment,
  DemoUser,
  Patient,
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const users = readJson<DemoUser[]>("src/data/private/users.json");
const patients = readJson<Patient[]>("src/data/private/patients.json");
const appointments = readJson<Appointment[]>(
  "src/data/private/appointments.json",
);
const queue = readJson<QueueEntry[]>("src/data/private/queue.json");
const histories = readJson<PatientHistory[]>(
  "src/data/private/histories.json",
);

describe("private seed dataset", () => {
  it("meets the private minimum seed volume from SPEC", () => {
    expect(users).toHaveLength(5);
    expect(patients).toHaveLength(20);
    expect(appointments).toHaveLength(30);
    expect(queue).toHaveLength(8);
    expect(histories).toHaveLength(30);
  });

  it("seeds exactly one active demo account for every role", () => {
    expect(
      users.map(({ role, email, active }) => ({ role, email, active })),
    ).toEqual([
      { role: "OWNER", email: "owner@cliniccloud.demo", active: true },
      { role: "STAFF", email: "staff@cliniccloud.demo", active: true },
      { role: "DOCTOR", email: "doctor@cliniccloud.demo", active: true },
      { role: "NURSE", email: "nurse@cliniccloud.demo", active: true },
      { role: "PATIENT", email: "patient@cliniccloud.demo", active: true },
    ]);
  });

  it("stores the shared demo credential as a hash rather than plaintext", () => {
    for (const user of users) {
      expect(user.passwordHash).toMatch(/^[a-f0-9]{64}$/);
      expect(user.passwordHash).not.toBe("12345678");
    }
  });

  it("links the patient and doctor demo identities required by SPEC", () => {
    const patientUser = users.find((user) => user.role === "PATIENT");
    const doctorUser = users.find((user) => user.role === "DOCTOR");

    expect(patientUser?.linkedPatientId).toBe("PAT-001");
    expect(doctorUser?.linkedDoctorId).toBe("DOC-001");
  });

  it("contains the deterministic PAT-001 A/B experiment scenario", () => {
    const patient = patients.find((record) => record.id === "PAT-001");
    const patientAppointments = appointments.filter(
      (appointment) => appointment.patientId === "PAT-001",
    );
    const patientQueue = queue.filter((entry) => entry.patientId === "PAT-001");
    const patientHistory = histories.filter(
      (history) => history.patientId === "PAT-001",
    );

    expect(patient).toMatchObject({
      hn: "HN000001",
      firstName: "สมชาย",
      lastName: "ใจดี",
    });
    expect(
      patientAppointments.some(
        (appointment) =>
          appointment.status === "COMPLETED" &&
          appointment.date === "2026-09-15",
      ),
    ).toBe(true);
    expect(
      patientAppointments.some(
        (appointment) =>
          appointment.status === "CONFIRMED" &&
          appointment.date === "2026-10-05",
      ),
    ).toBe(true);
    expect(patientQueue.length).toBeGreaterThan(0);
    expect(patientHistory.length).toBeGreaterThan(0);
  });

  it("uses only appointment and queue status vocabulary from SPEC", () => {
    const appointmentStatuses = new Set([
      "SCHEDULED",
      "CONFIRMED",
      "CHECKED_IN",
      "COMPLETED",
      "CANCELLED",
    ]);
    const queueStatuses = new Set([
      "WAITING",
      "CALLED",
      "IN_SERVICE",
      "COMPLETED",
      "CANCELLED",
    ]);

    expect(
      appointments.every((appointment) =>
        appointmentStatuses.has(appointment.status),
      ),
    ).toBe(true);
    expect(queue.every((entry) => queueStatuses.has(entry.status))).toBe(true);
  });

  it("keeps history summaries explicitly synthetic", () => {
    expect(
      histories.every((history) => history.summary.includes("Synthetic demo")),
    ).toBe(true);
  });
});
