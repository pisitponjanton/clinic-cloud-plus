import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedAppointmentById,
  getAuthorizedAppointments,
  getAuthorizedPatientById,
} from "@/src/authorization/data";
import {
  getDoctorById,
  getServiceById,
} from "@/src/data-access/public";
import type {
  Appointment,
  AppointmentStatus,
  Patient,
} from "@/src/types/private-data";

export const APPOINTMENT_STATUS_FILTERS = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly AppointmentStatus[];

export type AppointmentReadItem = {
  id: string;
  patientId: string;
  patientHn: string;
  patientName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  doctorName: string | null;
  serviceName: string | null;
  note: string;
};

export type AppointmentListProjection = {
  status: AppointmentStatus | null;
  date: string;
  totalInScope: number;
  resultCount: number;
  items: AppointmentReadItem[];
};

export type AppointmentDetailProjection = {
  appointment: AppointmentReadItem;
  patient: Patient;
};

function mapAppointment(
  user: AuthUser,
  appointment: Appointment,
): AppointmentReadItem {
  const patient = getAuthorizedPatientById(user, appointment.patientId);

  if (!patient) {
    throw new Error(
      `Authorized appointment ${appointment.id} references a missing patient`,
    );
  }

  return {
    id: appointment.id,
    patientId: patient.id,
    patientHn: patient.hn,
    patientName: `${patient.firstName} ${patient.lastName}`,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
    doctorName: appointment.doctorId
      ? getDoctorById(appointment.doctorId)?.displayName ?? null
      : null,
    serviceName: appointment.serviceId
      ? getServiceById(appointment.serviceId)?.name ?? null
      : null,
    note: appointment.note,
  };
}

function parseStatus(rawStatus: string | undefined): AppointmentStatus | null {
  const normalized = rawStatus?.trim().toUpperCase();

  if (!normalized || normalized === "ALL") {
    return null;
  }

  return APPOINTMENT_STATUS_FILTERS.includes(
    normalized as AppointmentStatus,
  )
    ? (normalized as AppointmentStatus)
    : null;
}

export function getAppointmentListProjection(
  user: AuthUser,
  filters: {
    status?: string;
    date?: string;
  } = {},
): AppointmentListProjection {
  const status = parseStatus(filters.status);
  const date = filters.date?.trim() ?? "";
  const inScope = getAuthorizedAppointments(user);

  const filtered = inScope
    .filter((appointment) => (status ? appointment.status === status : true))
    .filter((appointment) => (date ? appointment.date === date : true))
    .sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(
        `${right.date}T${right.time}`,
      ),
    );

  return {
    status,
    date,
    totalInScope: inScope.length,
    resultCount: filtered.length,
    items: filtered.map((appointment) => mapAppointment(user, appointment)),
  };
}

export function getAppointmentDetailProjection(
  user: AuthUser,
  appointmentId: string,
): AppointmentDetailProjection | null {
  const appointment = getAuthorizedAppointmentById(user, appointmentId);

  if (!appointment) {
    return null;
  }

  const patient = getAuthorizedPatientById(user, appointment.patientId);

  if (!patient) {
    throw new Error(
      `Authorized appointment ${appointment.id} references a missing patient`,
    );
  }

  return {
    appointment: mapAppointment(user, appointment),
    patient,
  };
}
