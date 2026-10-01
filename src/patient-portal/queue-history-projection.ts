import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedPatientById,
  getAuthorizedPatientHistory,
  getAuthorizedQueue,
} from "@/src/authorization/data";
import { getDoctorById } from "@/src/data-access/public";
import type {
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";

export type PatientQueueItem = {
  id: string;
  queueNumber: string;
  status: QueueEntry["status"];
  date: string;
  doctorName: string | null;
  appointmentId: string | null;
};

export type PatientQueueProjection = {
  patientId: string;
  patientName: string;
  hn: string;
  queue: PatientQueueItem[];
};

export type PatientHistoryItem = {
  id: string;
  date: string;
  summary: string;
  doctorName: string | null;
  appointmentId: string | null;
};

export type PatientHistoryProjection = {
  patientId: string;
  patientName: string;
  hn: string;
  history: PatientHistoryItem[];
};

function requireLinkedPatient(user: AuthUser): string {
  if (user.role !== "PATIENT" || !user.linkedPatientId) {
    throw new Error("Patient portal requires a linked PATIENT identity");
  }

  return user.linkedPatientId;
}

function patientIdentity(user: AuthUser) {
  const patientId = requireLinkedPatient(user);
  const patient = getAuthorizedPatientById(user, patientId);

  if (!patient) {
    throw new Error("Linked patient record was not found");
  }

  return {
    patientId,
    patientName: `${patient.firstName} ${patient.lastName}`,
    hn: patient.hn,
  };
}

function mapQueue(entry: QueueEntry): PatientQueueItem {
  const doctor = entry.doctorId ? getDoctorById(entry.doctorId) : null;

  if (entry.doctorId && !doctor) {
    throw new Error(
      `Authorized queue entry ${entry.id} references a missing doctor`,
    );
  }

  return {
    id: entry.id,
    queueNumber: entry.queueNumber,
    status: entry.status,
    date: entry.date,
    doctorName: doctor?.displayName ?? null,
    appointmentId: entry.appointmentId,
  };
}

function mapHistory(entry: PatientHistory): PatientHistoryItem {
  const doctor = entry.doctorId ? getDoctorById(entry.doctorId) : null;

  if (entry.doctorId && !doctor) {
    throw new Error(
      `Authorized history entry ${entry.id} references a missing doctor`,
    );
  }

  return {
    id: entry.id,
    date: entry.date,
    summary: entry.summary,
    doctorName: doctor?.displayName ?? null,
    appointmentId: entry.appointmentId,
  };
}

export function getPatientQueueProjection(
  user: AuthUser,
): PatientQueueProjection {
  const identity = patientIdentity(user);

  const queue = getAuthorizedQueue(user)
    .filter((entry) => entry.patientId === identity.patientId)
    .sort((left, right) => {
      const dateCompare = right.date.localeCompare(left.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.queueNumber.localeCompare(right.queueNumber, undefined, {
        numeric: true,
      });
    })
    .map(mapQueue);

  return {
    ...identity,
    queue,
  };
}

export function getPatientHistoryProjection(
  user: AuthUser,
): PatientHistoryProjection {
  const identity = patientIdentity(user);

  const history = getAuthorizedPatientHistory(user, identity.patientId)
    .filter((entry) => entry.patientId === identity.patientId)
    .sort((left, right) => right.date.localeCompare(left.date))
    .map(mapHistory);

  return {
    ...identity,
    history,
  };
}
