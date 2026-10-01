import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createSessionToken } from "@/src/auth/session-token";
import { resolveSessionUser, toAuthUser } from "@/src/auth/user";
import {
  getAuthorizedAppointmentById,
  getAuthorizedAppointments,
  getAuthorizedPatientById,
  getAuthorizedPatientHistory,
  getAuthorizedPatients,
  getAuthorizedQueue,
  searchAuthorizedPatients,
} from "@/src/authorization/data";
import {
  AuthorizationError,
  hasWebCapability,
} from "@/src/authorization/permissions";
import {
  getAppointments,
  getPatients,
  getQueue,
  getUserById,
} from "@/src/data-access/private";

const TEST_SECRET =
  "phase-13-isolation-secret-with-at-least-32-characters";

function seededAuthUser(userId: string) {
  const user = getUserById(userId);

  if (!user) {
    throw new Error(`Missing seeded user ${userId}`);
  }

  return toAuthUser(user);
}

const owner = seededAuthUser("USR-OWNER-001");
const staff = seededAuthUser("USR-STAFF-001");
const doctor = seededAuthUser("USR-DOCTOR-001");
const nurse = seededAuthUser("USR-NURSE-001");
const patient = seededAuthUser("USR-PATIENT-001");

describe("Web permission isolation", () => {
  it("blocks PATIENT from all-patient list and search at the data boundary", () => {
    expect(() => getAuthorizedPatients(patient)).toThrow(AuthorizationError);
    expect(() => searchAuthorizedPatients(patient, "")).toThrow(
      AuthorizationError,
    );
    expect(() => searchAuthorizedPatients(patient, "PAT-002")).toThrow(
      AuthorizationError,
    );
  });

  it("blocks PATIENT from another patient when the requested ID is changed", () => {
    expect(getAuthorizedPatientById(patient, "PAT-001")?.id).toBe("PAT-001");

    for (const otherPatientId of ["PAT-002", "PAT-010", "PAT-020"]) {
      expect(() =>
        getAuthorizedPatientById(patient, otherPatientId),
      ).toThrow(AuthorizationError);

      expect(() =>
        getAuthorizedPatientHistory(patient, otherPatientId),
      ).toThrow(AuthorizationError);
    }
  });

  it("returns only PATIENT-owned appointments, history, and queue", () => {
    const appointments = getAuthorizedAppointments(patient);
    const history = getAuthorizedPatientHistory(patient, "PAT-001");
    const queue = getAuthorizedQueue(patient);

    expect(appointments.length).toBeGreaterThan(0);
    expect(history.length).toBeGreaterThan(0);
    expect(queue.length).toBeGreaterThan(0);

    expect(
      appointments.every(
        (appointment) => appointment.patientId === patient.linkedPatientId,
      ),
    ).toBe(true);
    expect(
      history.every(
        (entry) => entry.patientId === patient.linkedPatientId,
      ),
    ).toBe(true);
    expect(
      queue.every((entry) => entry.patientId === patient.linkedPatientId),
    ).toBe(true);
  });

  it("blocks PATIENT from another patient's appointment by direct ID", () => {
    const anotherPatientsAppointment = getAppointments().find(
      (appointment) => appointment.patientId !== patient.linkedPatientId,
    );

    expect(anotherPatientsAppointment).toBeDefined();

    expect(() =>
      getAuthorizedAppointmentById(patient, anotherPatientsAppointment!.id),
    ).toThrow(AuthorizationError);
  });

  it("filters DOCTOR appointment and queue collections to linkedDoctorId", () => {
    const appointments = getAuthorizedAppointments(doctor);
    const queue = getAuthorizedQueue(doctor);

    expect(doctor.linkedDoctorId).toBe("DOC-001");
    expect(appointments.length).toBeGreaterThan(0);
    expect(queue.length).toBeGreaterThan(0);

    expect(
      appointments.every(
        (appointment) => appointment.doctorId === doctor.linkedDoctorId,
      ),
    ).toBe(true);

    expect(
      queue.every((entry) => entry.doctorId === doctor.linkedDoctorId),
    ).toBe(true);

    expect(appointments.length).toBeLessThan(getAppointments().length);
    expect(queue.length).toBeLessThan(getQueue().length);
  });

  it("blocks DOCTOR from direct lookup of another doctor's appointment", () => {
    const unrelated = getAppointments().find(
      (appointment) =>
        appointment.doctorId !== null &&
        appointment.doctorId !== doctor.linkedDoctorId,
    );

    expect(unrelated).toBeDefined();

    expect(() =>
      getAuthorizedAppointmentById(doctor, unrelated!.id),
    ).toThrow(AuthorizationError);
  });

  it("keeps STAFF and NURSE clinic workflow access available", () => {
    const patientCount = getPatients().length;
    const appointmentCount = getAppointments().length;
    const queueCount = getQueue().length;

    for (const user of [staff, nurse]) {
      expect(getAuthorizedPatients(user)).toHaveLength(patientCount);
      expect(getAuthorizedAppointments(user)).toHaveLength(appointmentCount);
      expect(getAuthorizedQueue(user)).toHaveLength(queueCount);
    }
  });

  it("keeps Demo Settings/reset OWNER-only", () => {
    expect(hasWebCapability(owner, "VIEW_SETTINGS")).toBe(true);
    expect(hasWebCapability(owner, "DEMO_RESET")).toBe(true);

    for (const user of [staff, doctor, nurse, patient]) {
      expect(hasWebCapability(user, "VIEW_SETTINGS")).toBe(false);
      expect(hasWebCapability(user, "DEMO_RESET")).toBe(false);
    }
  });

  it("rejects PATIENT-to-OWNER role escalation during trusted session resolution", () => {
    const seededPatient = getUserById("USR-PATIENT-001");

    expect(seededPatient).not.toBeNull();

    const forgedRoleToken = createSessionToken(
      {
        ...seededPatient!,
        role: "OWNER",
      },
      TEST_SECRET,
      {
        now: new Date("2026-10-01T05:00:00.000Z"),
        ttlSeconds: 3600,
      },
    );

    expect(
      resolveSessionUser(
        forgedRoleToken,
        TEST_SECRET,
        new Date("2026-10-01T05:15:00.000Z"),
      ),
    ).toBeNull();
  });

  it("enforces private authorization independently from UI/navigation code", () => {
    const authorizationSource = [
      readFileSync("src/authorization/permissions.ts", "utf8"),
      readFileSync("src/authorization/data.ts", "utf8"),
    ].join("\n");

    expect(authorizationSource).not.toMatch(
      /@\/components|components\/|navigation|sidebar/i,
    );

    expect(() => getAuthorizedPatients(patient)).toThrow(AuthorizationError);
    expect(() => getAuthorizedPatientById(patient, "PAT-002")).toThrow(
      AuthorizationError,
    );
  });
});
