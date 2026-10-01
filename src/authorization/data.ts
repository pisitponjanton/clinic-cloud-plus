import type { AuthUser } from "@/src/auth/user";
import {
  getAppointmentById,
  getAppointments,
  getAppointmentsByDoctor,
  getPatientById,
  getPatientHistory,
  getPatients,
  getQueue,
  searchPatients,
} from "@/src/data-access/private";
import {
  AuthorizationError,
  canCancelAppointment,
  canCreateAppointment,
  canUpdateAppointment,
  canViewAppointment,
  canViewQueueEntry,
  isOwnPatient,
  requireWebCapability,
} from "@/src/authorization/permissions";
import type {
  Appointment,
  Patient,
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";

function getDoctorRelevantPatientIds(user: AuthUser): Set<string> {
  if (user.role !== "DOCTOR" || !user.linkedDoctorId) {
    return new Set();
  }

  const patientIds = new Set(
    getAppointmentsByDoctor(user.linkedDoctorId).map(
      (appointment) => appointment.patientId,
    ),
  );

  for (const entry of getQueue()) {
    if (entry.doctorId === user.linkedDoctorId) {
      patientIds.add(entry.patientId);
    }
  }

  for (const patient of getPatients()) {
    if (
      getPatientHistory(patient.id).some(
        (history) => history.doctorId === user.linkedDoctorId,
      )
    ) {
      patientIds.add(patient.id);
    }
  }

  return patientIds;
}

function canResolvePatient(user: AuthUser, patientId: string): boolean {
  if (user.role === "PATIENT") {
    return isOwnPatient(user, patientId);
  }

  if (user.role === "DOCTOR") {
    return getDoctorRelevantPatientIds(user).has(patientId);
  }

  return user.role === "OWNER" || user.role === "STAFF" || user.role === "NURSE";
}

export function getAuthorizedPatients(user: AuthUser): Patient[] {
  requireWebCapability(user, "VIEW_PATIENT_LIST");

  const patients = getPatients();

  if (user.role !== "DOCTOR") {
    return patients;
  }

  const relevantPatientIds = getDoctorRelevantPatientIds(user);

  return patients.filter((patient) => relevantPatientIds.has(patient.id));
}

export function searchAuthorizedPatients(
  user: AuthUser,
  query: string,
): Patient[] {
  requireWebCapability(user, "SEARCH_PATIENTS");

  const results = searchPatients(query);

  if (user.role !== "DOCTOR") {
    return results;
  }

  const relevantPatientIds = getDoctorRelevantPatientIds(user);

  return results.filter((patient) => relevantPatientIds.has(patient.id));
}

export function getAuthorizedPatientById(
  user: AuthUser,
  patientId: string,
): Patient | null {
  requireWebCapability(user, "VIEW_PATIENT_DETAIL");

  const patient = getPatientById(patientId);

  if (!patient) {
    return null;
  }

  if (!canResolvePatient(user, patient.id)) {
    throw new AuthorizationError();
  }

  return patient;
}

export function getAuthorizedPatientHistory(
  user: AuthUser,
  patientId: string,
): PatientHistory[] {
  requireWebCapability(user, "VIEW_PATIENT_HISTORY");

  const patient = getPatientById(patientId);

  if (!patient) {
    return [];
  }

  if (!canResolvePatient(user, patient.id)) {
    throw new AuthorizationError();
  }

  return getPatientHistory(patientId);
}

export function getAuthorizedAppointments(user: AuthUser): Appointment[] {
  requireWebCapability(user, "VIEW_APPOINTMENTS");

  return getAppointments().filter((appointment) =>
    canViewAppointment(user, appointment),
  );
}

export function getAuthorizedAppointmentById(
  user: AuthUser,
  appointmentId: string,
): Appointment | null {
  requireWebCapability(user, "VIEW_APPOINTMENTS");

  const appointment = getAppointmentById(appointmentId);

  if (!appointment) {
    return null;
  }

  if (!canViewAppointment(user, appointment)) {
    throw new AuthorizationError();
  }

  return appointment;
}

export function getAuthorizedQueue(user: AuthUser): QueueEntry[] {
  requireWebCapability(user, "VIEW_QUEUE");

  return getQueue().filter((entry) => canViewQueueEntry(user, entry));
}

export function assertCanCreateAppointment(user: AuthUser): void {
  if (!canCreateAppointment(user)) {
    throw new AuthorizationError();
  }
}

export function assertCanUpdateAppointment(
  user: AuthUser,
  appointment: Appointment,
): void {
  if (!canUpdateAppointment(user, appointment)) {
    throw new AuthorizationError();
  }
}

export function assertCanCancelAppointment(
  user: AuthUser,
  appointment: Appointment,
): void {
  if (!canCancelAppointment(user, appointment)) {
    throw new AuthorizationError();
  }
}
