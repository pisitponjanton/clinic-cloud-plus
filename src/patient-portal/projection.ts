import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedAppointments,
  getAuthorizedPatientById,
} from "@/src/authorization/data";
import type { Appointment, Patient } from "@/src/types/private-data";

export type PatientProfileProjection = {
  patient: Patient;
};

export type PatientAppointmentsProjection = {
  patientId: string;
  patientName: string;
  hn: string;
  appointments: Appointment[];
};

function requireLinkedPatient(user: AuthUser): string {
  if (user.role !== "PATIENT" || !user.linkedPatientId) {
    throw new Error("Patient portal requires a linked PATIENT identity");
  }

  return user.linkedPatientId;
}

export function getPatientProfileProjection(
  user: AuthUser,
): PatientProfileProjection {
  const patientId = requireLinkedPatient(user);
  const patient = getAuthorizedPatientById(user, patientId);

  if (!patient) {
    throw new Error("Linked patient record was not found");
  }

  return {
    patient,
  };
}

export function getPatientAppointmentsProjection(
  user: AuthUser,
): PatientAppointmentsProjection {
  const patientId = requireLinkedPatient(user);
  const patient = getAuthorizedPatientById(user, patientId);

  if (!patient) {
    throw new Error("Linked patient record was not found");
  }

  const appointments = getAuthorizedAppointments(user)
    .filter((appointment) => appointment.patientId === patientId)
    .sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(
        `${right.date}T${right.time}`,
      ),
    );

  return {
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hn: patient.hn,
    appointments,
  };
}
