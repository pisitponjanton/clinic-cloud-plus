import { describe, expect, it } from "vitest";

import { toAuthUser } from "@/src/auth/user";
import {
  assertCanCancelAppointment,
  assertCanCreateAppointment,
  assertCanUpdateAppointment,
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
  isPersonnelRole,
} from "@/src/authorization/permissions";
import {
  getAppointmentById,
  getPatients,
  getQueue,
  getUserById,
} from "@/src/data-access/private";

function authUser(userId: string) {
  const user = getUserById(userId);

  if (!user) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(user);
}

const owner = authUser("USR-OWNER-001");
const staff = authUser("USR-STAFF-001");
const doctor = authUser("USR-DOCTOR-001");
const nurse = authUser("USR-NURSE-001");
const patient = authUser("USR-PATIENT-001");

describe("authorization layer", () => {
  it("identifies personnel roles and excludes PATIENT", () => {
    expect(isPersonnelRole(owner.role)).toBe(true);
    expect(isPersonnelRole(staff.role)).toBe(true);
    expect(isPersonnelRole(doctor.role)).toBe(true);
    expect(isPersonnelRole(nurse.role)).toBe(true);
    expect(isPersonnelRole(patient.role)).toBe(false);
  });

  it("implements the minimum Web capability matrix", () => {
    for (const user of [owner, staff, doctor, nurse]) {
      expect(hasWebCapability(user, "VIEW_PATIENT_LIST")).toBe(true);
      expect(hasWebCapability(user, "SEARCH_PATIENTS")).toBe(true);
      expect(hasWebCapability(user, "CREATE_APPOINTMENT")).toBe(true);
    }

    expect(hasWebCapability(patient, "VIEW_PATIENT_LIST")).toBe(false);
    expect(hasWebCapability(patient, "SEARCH_PATIENTS")).toBe(false);
    expect(hasWebCapability(patient, "CREATE_APPOINTMENT")).toBe(false);

    expect(hasWebCapability(owner, "VIEW_SETTINGS")).toBe(true);
    expect(hasWebCapability(owner, "DEMO_RESET")).toBe(true);

    for (const user of [staff, doctor, nurse, patient]) {
      expect(hasWebCapability(user, "VIEW_SETTINGS")).toBe(false);
      expect(hasWebCapability(user, "DEMO_RESET")).toBe(false);
    }
  });

  it("gives OWNER, STAFF, and NURSE the full clinic patient list", () => {
    const expectedCount = getPatients().length;

    expect(getAuthorizedPatients(owner)).toHaveLength(expectedCount);
    expect(getAuthorizedPatients(staff)).toHaveLength(expectedCount);
    expect(getAuthorizedPatients(nurse)).toHaveLength(expectedCount);
  });

  it("scopes DOCTOR patient list/search to linked-doctor relevance", () => {
    const patients = getAuthorizedPatients(doctor);
    const searchResults = searchAuthorizedPatients(doctor, "");

    expect(patients.length).toBeGreaterThan(0);
    expect(patients.length).toBeLessThan(getPatients().length);
    expect(searchResults.map((record) => record.id)).toEqual(
      patients.map((record) => record.id),
    );

    const doctorAppointments = getAuthorizedAppointments(doctor);
    const patientIds = new Set(patients.map((record) => record.id));

    for (const appointment of doctorAppointments) {
      expect(appointment.doctorId).toBe(doctor.linkedDoctorId);
      expect(patientIds.has(appointment.patientId)).toBe(true);
    }
  });

  it("prevents PATIENT from using all-patient list/search capabilities", () => {
    expect(() => getAuthorizedPatients(patient)).toThrow(AuthorizationError);
    expect(() => searchAuthorizedPatients(patient, "สมชาย")).toThrow(
      AuthorizationError,
    );
  });

  it("allows PATIENT to resolve only the linked patient record and history", () => {
    expect(getAuthorizedPatientById(patient, "PAT-001")?.id).toBe("PAT-001");
    expect(getAuthorizedPatientHistory(patient, "PAT-001").length).toBeGreaterThan(
      0,
    );

    expect(() => getAuthorizedPatientById(patient, "PAT-002")).toThrow(
      AuthorizationError,
    );
    expect(() => getAuthorizedPatientHistory(patient, "PAT-002")).toThrow(
      AuthorizationError,
    );
  });

  it("scopes appointments by role", () => {
    const ownerAppointments = getAuthorizedAppointments(owner);
    const staffAppointments = getAuthorizedAppointments(staff);
    const nurseAppointments = getAuthorizedAppointments(nurse);
    const doctorAppointments = getAuthorizedAppointments(doctor);
    const patientAppointments = getAuthorizedAppointments(patient);

    expect(ownerAppointments).toHaveLength(30);
    expect(staffAppointments).toHaveLength(30);
    expect(nurseAppointments).toHaveLength(30);

    expect(doctorAppointments.length).toBeGreaterThan(0);
    expect(
      doctorAppointments.every(
        (appointment) => appointment.doctorId === doctor.linkedDoctorId,
      ),
    ).toBe(true);

    expect(patientAppointments.length).toBeGreaterThan(0);
    expect(
      patientAppointments.every(
        (appointment) => appointment.patientId === patient.linkedPatientId,
      ),
    ).toBe(true);
  });

  it("rejects direct appointment lookup outside patient/doctor scope", () => {
    expect(getAuthorizedAppointmentById(patient, "APT-001")?.patientId).toBe(
      "PAT-001",
    );

    const anotherPatientAppointment = getAppointmentById("APT-004");
    expect(anotherPatientAppointment?.patientId).not.toBe("PAT-001");
    expect(() =>
      getAuthorizedAppointmentById(patient, "APT-004"),
    ).toThrow(AuthorizationError);

    const anotherDoctorAppointment = getAppointmentById("APT-004");
    expect(anotherDoctorAppointment?.doctorId).not.toBe(doctor.linkedDoctorId);
    expect(() =>
      getAuthorizedAppointmentById(doctor, "APT-004"),
    ).toThrow(AuthorizationError);
  });

  it("scopes queue entries by role", () => {
    const rawQueue = getQueue();

    expect(getAuthorizedQueue(owner)).toHaveLength(rawQueue.length);
    expect(getAuthorizedQueue(staff)).toHaveLength(rawQueue.length);
    expect(getAuthorizedQueue(nurse)).toHaveLength(rawQueue.length);

    const doctorQueue = getAuthorizedQueue(doctor);
    expect(
      doctorQueue.every((entry) => entry.doctorId === doctor.linkedDoctorId),
    ).toBe(true);

    const patientQueue = getAuthorizedQueue(patient);
    expect(
      patientQueue.every((entry) => entry.patientId === patient.linkedPatientId),
    ).toBe(true);
  });

  it("allows appointment creation for personnel but not PATIENT", () => {
    for (const user of [owner, staff, doctor, nurse]) {
      expect(() => assertCanCreateAppointment(user)).not.toThrow();
    }

    expect(() => assertCanCreateAppointment(patient)).toThrow(
      AuthorizationError,
    );
  });

  it("limits doctor update/cancel actions to relevant appointments", () => {
    const relevant = getAppointmentById("APT-001");
    const unrelated = getAppointmentById("APT-004");

    expect(relevant?.doctorId).toBe(doctor.linkedDoctorId);
    expect(unrelated?.doctorId).not.toBe(doctor.linkedDoctorId);

    expect(() => assertCanUpdateAppointment(doctor, relevant!)).not.toThrow();
    expect(() => assertCanCancelAppointment(doctor, relevant!)).not.toThrow();

    expect(() => assertCanUpdateAppointment(doctor, unrelated!)).toThrow(
      AuthorizationError,
    );
    expect(() => assertCanCancelAppointment(doctor, unrelated!)).toThrow(
      AuthorizationError,
    );
  });

  it("does not allow PATIENT to update or cancel appointments", () => {
    const ownAppointment = getAppointmentById("APT-001");

    expect(ownAppointment?.patientId).toBe(patient.linkedPatientId);
    expect(() => assertCanUpdateAppointment(patient, ownAppointment!)).toThrow(
      AuthorizationError,
    );
    expect(() => assertCanCancelAppointment(patient, ownAppointment!)).toThrow(
      AuthorizationError,
    );
  });
});
