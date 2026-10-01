import type { AuthUser } from "@/src/auth/user";
import type {
  Appointment,
  Patient,
  PatientHistory,
  QueueEntry,
  UserRole,
} from "@/src/types/private-data";

export type WebCapability =
  | "VIEW_DASHBOARD"
  | "VIEW_PATIENT_LIST"
  | "SEARCH_PATIENTS"
  | "VIEW_PATIENT_DETAIL"
  | "VIEW_PATIENT_HISTORY"
  | "VIEW_APPOINTMENTS"
  | "CREATE_APPOINTMENT"
  | "UPDATE_APPOINTMENT"
  | "CANCEL_APPOINTMENT"
  | "VIEW_QUEUE"
  | "VIEW_SETTINGS"
  | "DEMO_RESET";

const PERSONNEL_ROLES = new Set<UserRole>([
  "OWNER",
  "STAFF",
  "DOCTOR",
  "NURSE",
]);

const CAPABILITY_ROLES: Record<WebCapability, ReadonlySet<UserRole>> = {
  VIEW_DASHBOARD: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"]),
  VIEW_PATIENT_LIST: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE"]),
  SEARCH_PATIENTS: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE"]),
  VIEW_PATIENT_DETAIL: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"]),
  VIEW_PATIENT_HISTORY: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"]),
  VIEW_APPOINTMENTS: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"]),
  CREATE_APPOINTMENT: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE"]),
  UPDATE_APPOINTMENT: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE"]),
  CANCEL_APPOINTMENT: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE"]),
  VIEW_QUEUE: new Set(["OWNER", "STAFF", "DOCTOR", "NURSE", "PATIENT"]),
  VIEW_SETTINGS: new Set(["OWNER"]),
  DEMO_RESET: new Set(["OWNER"]),
};

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to access this resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isPersonnelRole(role: UserRole): boolean {
  return PERSONNEL_ROLES.has(role);
}

export function hasWebCapability(
  user: Pick<AuthUser, "role">,
  capability: WebCapability,
): boolean {
  return CAPABILITY_ROLES[capability].has(user.role);
}

export function requireWebCapability(
  user: Pick<AuthUser, "role">,
  capability: WebCapability,
): void {
  if (!hasWebCapability(user, capability)) {
    throw new AuthorizationError();
  }
}

export function isOwnPatient(
  user: Pick<AuthUser, "role" | "linkedPatientId">,
  patientId: string,
): boolean {
  return user.role === "PATIENT" && user.linkedPatientId === patientId;
}

export function isRelevantDoctorAppointment(
  user: Pick<AuthUser, "role" | "linkedDoctorId">,
  appointment: Pick<Appointment, "doctorId">,
): boolean {
  return (
    user.role === "DOCTOR" &&
    user.linkedDoctorId !== null &&
    appointment.doctorId === user.linkedDoctorId
  );
}

export function isRelevantDoctorQueueEntry(
  user: Pick<AuthUser, "role" | "linkedDoctorId">,
  entry: Pick<QueueEntry, "doctorId">,
): boolean {
  return (
    user.role === "DOCTOR" &&
    user.linkedDoctorId !== null &&
    entry.doctorId === user.linkedDoctorId
  );
}

export function canViewPatient(
  user: AuthUser,
  patient: Pick<Patient, "id">,
): boolean {
  if (isPersonnelRole(user.role)) {
    return true;
  }

  return isOwnPatient(user, patient.id);
}

export function canViewPatientHistory(
  user: AuthUser,
  history: Pick<PatientHistory, "patientId">,
): boolean {
  if (isPersonnelRole(user.role)) {
    return true;
  }

  return isOwnPatient(user, history.patientId);
}

export function canViewAppointment(
  user: AuthUser,
  appointment: Pick<Appointment, "patientId" | "doctorId">,
): boolean {
  if (user.role === "OWNER" || user.role === "STAFF" || user.role === "NURSE") {
    return true;
  }

  if (user.role === "DOCTOR") {
    return isRelevantDoctorAppointment(user, appointment);
  }

  return isOwnPatient(user, appointment.patientId);
}

export function canCreateAppointment(user: AuthUser): boolean {
  return hasWebCapability(user, "CREATE_APPOINTMENT");
}

export function canUpdateAppointment(
  user: AuthUser,
  appointment: Pick<Appointment, "patientId" | "doctorId">,
): boolean {
  if (!hasWebCapability(user, "UPDATE_APPOINTMENT")) {
    return false;
  }

  if (user.role === "DOCTOR") {
    return isRelevantDoctorAppointment(user, appointment);
  }

  return user.role !== "PATIENT";
}

export function canCancelAppointment(
  user: AuthUser,
  appointment: Pick<Appointment, "patientId" | "doctorId">,
): boolean {
  if (!hasWebCapability(user, "CANCEL_APPOINTMENT")) {
    return false;
  }

  if (user.role === "DOCTOR") {
    return isRelevantDoctorAppointment(user, appointment);
  }

  return user.role !== "PATIENT";
}

export function canViewQueueEntry(
  user: AuthUser,
  entry: Pick<QueueEntry, "patientId" | "doctorId">,
): boolean {
  if (user.role === "OWNER" || user.role === "STAFF" || user.role === "NURSE") {
    return true;
  }

  if (user.role === "DOCTOR") {
    return isRelevantDoctorQueueEntry(user, entry);
  }

  return isOwnPatient(user, entry.patientId);
}
