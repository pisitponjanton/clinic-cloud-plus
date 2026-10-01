import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedAppointments,
  getAuthorizedPatientById,
  getAuthorizedPatientHistory,
} from "@/src/authorization/data";
import {
  getDoctorById,
  getServiceById,
} from "@/src/data-access/public";
import type {
  Appointment,
  Patient,
  PatientHistory,
} from "@/src/types/private-data";

export type PatientAppointmentContext = {
  id: string;
  date: string;
  time: string;
  status: Appointment["status"];
  doctorName: string | null;
  serviceName: string | null;
  note: string;
};

export type PatientHistoryContext = {
  id: string;
  date: string;
  summary: string;
  doctorName: string | null;
  appointmentId: string | null;
};

export type PatientDetailProjection = {
  patient: Patient;
  appointments: PatientAppointmentContext[];
  history: PatientHistoryContext[];
};

function mapAppointment(
  appointment: Appointment,
): PatientAppointmentContext {
  return {
    id: appointment.id,
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

function mapHistory(history: PatientHistory): PatientHistoryContext {
  return {
    id: history.id,
    date: history.date,
    summary: history.summary,
    doctorName: history.doctorId
      ? getDoctorById(history.doctorId)?.displayName ?? null
      : null,
    appointmentId: history.appointmentId,
  };
}

export function getPatientDetailProjection(
  user: AuthUser,
  patientId: string,
): PatientDetailProjection | null {
  const patient = getAuthorizedPatientById(user, patientId);

  if (!patient) {
    return null;
  }

  const appointments = getAuthorizedAppointments(user)
    .filter((appointment) => appointment.patientId === patient.id)
    .sort((left, right) =>
      `${right.date}T${right.time}`.localeCompare(
        `${left.date}T${left.time}`,
      ),
    )
    .map(mapAppointment);

  const history = getAuthorizedPatientHistory(user, patient.id)
    .sort((left, right) => right.date.localeCompare(left.date))
    .map(mapHistory);

  return {
    patient,
    appointments,
    history,
  };
}
