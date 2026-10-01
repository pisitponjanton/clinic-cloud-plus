import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedAppointmentById,
  getAuthorizedAppointments,
  getAuthorizedPatientById,
  getAuthorizedPatientHistory,
  getAuthorizedPatients,
  getAuthorizedQueue,
} from "@/src/authorization/data";
import { getClinic, getDoctorById, getServiceById } from "@/src/data-access/public";
import type {
  Appointment,
  Patient,
  PatientHistory,
  QueueEntry,
  UserRole,
} from "@/src/types/private-data";

export const DEMO_TODAY = "2026-10-01";

export type DashboardAppointmentItem = {
  id: string;
  time: string;
  status: Appointment["status"];
  patientId: string;
  patientName: string;
  doctorName: string | null;
  serviceName: string | null;
};

export type DashboardQueueItem = {
  id: string;
  queueNumber: string;
  status: QueueEntry["status"];
  patientId: string;
  patientName: string;
};

export type InternalDashboardProjection = {
  kind: "internal";
  role: Exclude<UserRole, "PATIENT">;
  clinicName: string;
  today: string;
  patientCount: number;
  appointmentCount: number;
  queueCount: number;
  attentionCount: number;
  todayAppointments: DashboardAppointmentItem[];
  activeQueue: DashboardQueueItem[];
};

export type PatientDashboardProjection = {
  kind: "patient";
  role: "PATIENT";
  today: string;
  patient: Patient;
  nextAppointment: DashboardAppointmentItem | null;
  currentQueue: DashboardQueueItem | null;
  recentHistory: PatientHistory[];
};

export type DashboardProjection =
  | InternalDashboardProjection
  | PatientDashboardProjection;

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`;
}

function mapAppointment(
  user: AuthUser,
  appointment: Appointment,
): DashboardAppointmentItem {
  const patient = getAuthorizedPatientById(user, appointment.patientId);

  if (!patient) {
    throw new Error(
      `Authorized appointment ${appointment.id} references a missing patient`,
    );
  }

  return {
    id: appointment.id,
    time: appointment.time,
    status: appointment.status,
    patientId: patient.id,
    patientName: patientName(patient),
    doctorName: appointment.doctorId
      ? getDoctorById(appointment.doctorId)?.displayName ?? null
      : null,
    serviceName: appointment.serviceId
      ? getServiceById(appointment.serviceId)?.name ?? null
      : null,
  };
}

function mapQueueEntry(
  user: AuthUser,
  entry: QueueEntry,
): DashboardQueueItem {
  const patient = getAuthorizedPatientById(user, entry.patientId);

  if (!patient) {
    throw new Error(
      `Authorized queue entry ${entry.id} references a missing patient`,
    );
  }

  return {
    id: entry.id,
    queueNumber: entry.queueNumber,
    status: entry.status,
    patientId: patient.id,
    patientName: patientName(patient),
  };
}

function getInternalDashboard(
  user: AuthUser,
): InternalDashboardProjection {
  if (user.role === "PATIENT") {
    throw new Error("Patient identity cannot use internal dashboard projection");
  }

  const appointments = getAuthorizedAppointments(user);
  const queue = getAuthorizedQueue(user);
  const patients = getAuthorizedPatients(user);

  const todayAppointments = appointments
    .filter((appointment) => appointment.date === DEMO_TODAY)
    .sort((left, right) => left.time.localeCompare(right.time))
    .map((appointment) => mapAppointment(user, appointment));

  const activeQueue = queue
    .filter(
      (entry) =>
        entry.date === DEMO_TODAY &&
        entry.status !== "COMPLETED" &&
        entry.status !== "CANCELLED",
    )
    .map((entry) => mapQueueEntry(user, entry));

  const attentionCount =
    todayAppointments.filter(
      (appointment) =>
        appointment.status === "CHECKED_IN" ||
        appointment.status === "CONFIRMED",
    ).length + activeQueue.filter((entry) => entry.status === "CALLED").length;

  return {
    kind: "internal",
    role: user.role,
    clinicName: getClinic().name,
    today: DEMO_TODAY,
    patientCount: patients.length,
    appointmentCount: todayAppointments.length,
    queueCount: activeQueue.length,
    attentionCount,
    todayAppointments,
    activeQueue,
  };
}

function getPatientDashboard(user: AuthUser): PatientDashboardProjection {
  if (user.role !== "PATIENT" || !user.linkedPatientId) {
    throw new Error("Patient dashboard requires a linked patient identity");
  }

  const patient = getAuthorizedPatientById(user, user.linkedPatientId);

  if (!patient) {
    throw new Error("Linked patient record was not found");
  }

  const appointments = getAuthorizedAppointments(user)
    .filter(
      (appointment) =>
        appointment.status !== "CANCELLED" && appointment.date >= DEMO_TODAY,
    )
    .sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(
        `${right.date}T${right.time}`,
      ),
    );

  const queue = getAuthorizedQueue(user)
    .filter(
      (entry) =>
        entry.date === DEMO_TODAY &&
        entry.status !== "COMPLETED" &&
        entry.status !== "CANCELLED",
    )
    .sort((left, right) => left.queueNumber.localeCompare(right.queueNumber));

  return {
    kind: "patient",
    role: "PATIENT",
    today: DEMO_TODAY,
    patient,
    nextAppointment: appointments[0]
      ? mapAppointment(user, appointments[0])
      : null,
    currentQueue: queue[0] ? mapQueueEntry(user, queue[0]) : null,
    recentHistory: getAuthorizedPatientHistory(user, patient.id)
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 3),
  };
}

export function getDashboardProjection(user: AuthUser): DashboardProjection {
  return user.role === "PATIENT"
    ? getPatientDashboard(user)
    : getInternalDashboard(user);
}

export function getDashboardAppointmentById(
  user: AuthUser,
  appointmentId: string,
): DashboardAppointmentItem | null {
  const appointment = getAuthorizedAppointmentById(user, appointmentId);

  return appointment ? mapAppointment(user, appointment) : null;
}
