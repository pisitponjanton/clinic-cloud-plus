import appointmentsJson from "@/src/data/private/appointments.json";
import historiesJson from "@/src/data/private/histories.json";
import patientsJson from "@/src/data/private/patients.json";
import queueJson from "@/src/data/private/queue.json";
import usersJson from "@/src/data/private/users.json";

import {
  getDoctorById,
  getServiceById,
} from "@/src/data-access/public";
import type {
  Appointment,
  DemoUser,
  Patient,
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";
import type {
  PublicDoctor,
  Service,
} from "@/src/types/public-data";

const appointments = appointmentsJson as Appointment[];
const histories = historiesJson as PatientHistory[];
const patients = patientsJson as Patient[];
const queue = queueJson as QueueEntry[];
const users = usersJson as DemoUser[];

function cloneUser(record: DemoUser): DemoUser {
  return { ...record };
}

function clonePatient(record: Patient): Patient {
  return { ...record };
}

function cloneAppointment(record: Appointment): Appointment {
  return { ...record };
}

function cloneQueueEntry(record: QueueEntry): QueueEntry {
  return { ...record };
}

function cloneHistory(record: PatientHistory): PatientHistory {
  return { ...record };
}

export type AppointmentContext = {
  appointment: Appointment;
  patient: Patient;
  doctor: PublicDoctor | null;
  service: Service | null;
};

export type QueueContext = {
  entry: QueueEntry;
  patient: Patient;
  appointment: Appointment | null;
  doctor: PublicDoctor | null;
};

export type PatientHistoryContext = {
  history: PatientHistory;
  patient: Patient;
  appointment: Appointment | null;
  doctor: PublicDoctor | null;
};

export function getUsers(): DemoUser[] {
  return users.map(cloneUser);
}

export function getUserById(userId: string): DemoUser | null {
  const user = users.find((record) => record.id === userId);
  return user ? cloneUser(user) : null;
}

export function getUserByEmail(email: string): DemoUser | null {
  const normalized = email.trim().toLocaleLowerCase();
  const user = users.find(
    (record) => record.email.toLocaleLowerCase() === normalized,
  );

  return user ? cloneUser(user) : null;
}

export function getPatients(): Patient[] {
  return patients.map(clonePatient);
}

export function getPatientById(patientId: string): Patient | null {
  const patient = patients.find((record) => record.id === patientId);
  return patient ? clonePatient(patient) : null;
}

export function searchPatients(query: string): Patient[] {
  const normalized = query.trim().toLocaleLowerCase();

  if (!normalized) {
    return getPatients();
  }

  return patients
    .filter((patient) =>
      [
        patient.id,
        patient.hn,
        patient.firstName,
        patient.lastName,
        `${patient.firstName} ${patient.lastName}`,
        patient.phone,
      ].some((value) => value.toLocaleLowerCase().includes(normalized)),
    )
    .map(clonePatient);
}

export function getAppointments(): Appointment[] {
  return appointments.map(cloneAppointment);
}

export function getAppointmentById(
  appointmentId: string,
): Appointment | null {
  const appointment = appointments.find(
    (record) => record.id === appointmentId,
  );

  return appointment ? cloneAppointment(appointment) : null;
}

export function getAppointmentsByPatient(patientId: string): Appointment[] {
  return appointments
    .filter((appointment) => appointment.patientId === patientId)
    .map(cloneAppointment);
}

export function getAppointmentsByDoctor(doctorId: string): Appointment[] {
  return appointments
    .filter((appointment) => appointment.doctorId === doctorId)
    .map(cloneAppointment);
}

export function getAppointmentContextById(
  appointmentId: string,
): AppointmentContext | null {
  const appointment = getAppointmentById(appointmentId);

  if (!appointment) {
    return null;
  }

  const patient = getPatientById(appointment.patientId);

  if (!patient) {
    return null;
  }

  return {
    appointment,
    patient,
    doctor: appointment.doctorId
      ? getDoctorById(appointment.doctorId)
      : null,
    service: appointment.serviceId
      ? getServiceById(appointment.serviceId)
      : null,
  };
}

export function getQueue(): QueueEntry[] {
  return queue.map(cloneQueueEntry);
}

export function getQueueByPatient(patientId: string): QueueEntry[] {
  return queue
    .filter((entry) => entry.patientId === patientId)
    .map(cloneQueueEntry);
}

export function getQueueContext(entryId: string): QueueContext | null {
  const entry = queue.find((record) => record.id === entryId);

  if (!entry) {
    return null;
  }

  const patient = getPatientById(entry.patientId);

  if (!patient) {
    return null;
  }

  return {
    entry: cloneQueueEntry(entry),
    patient,
    appointment: entry.appointmentId
      ? getAppointmentById(entry.appointmentId)
      : null,
    doctor: entry.doctorId ? getDoctorById(entry.doctorId) : null,
  };
}

export function getPatientHistory(patientId: string): PatientHistory[] {
  return histories
    .filter((history) => history.patientId === patientId)
    .map(cloneHistory);
}

export function getPatientHistoryContext(
  historyId: string,
): PatientHistoryContext | null {
  const history = histories.find((record) => record.id === historyId);

  if (!history) {
    return null;
  }

  const patient = getPatientById(history.patientId);

  if (!patient) {
    return null;
  }

  return {
    history: cloneHistory(history),
    patient,
    appointment: history.appointmentId
      ? getAppointmentById(history.appointmentId)
      : null,
    doctor: history.doctorId ? getDoctorById(history.doctorId) : null,
  };
}
