import type { AuthUser } from "@/src/auth/user";
import {
  getAuthorizedAppointments,
  getAuthorizedPatientById,
  getAuthorizedPatientHistory,
  getAuthorizedQueue,
  searchAuthorizedPatients,
} from "@/src/authorization/data";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getDoctorById } from "@/src/data-access/public";
import { assertCanReadDoctorSchedule } from "@/src/mcp/staff/permissions";
import type {
  Appointment,
  Patient,
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";
import type { PublicDoctor } from "@/src/types/public-data";

export type StaffToolSuccess<T> = {
  ok: true;
  data: T;
  source: "base-json";
};

export type StaffToolErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_REQUEST";

export type StaffToolFailure = {
  ok: false;
  error: {
    code: StaffToolErrorCode;
    message: string;
  };
};

export type StaffToolResult<T> =
  | StaffToolSuccess<T>
  | StaffToolFailure;

export type StaffContextData = {
  userId: string;
  displayName: string;
  role: AuthUser["role"];
  clinicId: string;
  linkedDoctorId: string | null;
};

export type PatientSearchItem = Pick<
  Patient,
  "id" | "hn" | "firstName" | "lastName"
>;

export type PatientSummaryData = {
  patient: Patient;
  latestAppointment: Appointment | null;
  nextAppointment: Appointment | null;
  queue: QueueEntry[];
  recentHistory: PatientHistory[];
  relevantDoctor: PublicDoctor | null;
};

export type DoctorScheduleData = {
  doctor: PublicDoctor;
  date: string;
  appointments: Appointment[];
};

function success<T>(data: T): StaffToolSuccess<T> {
  return {
    ok: true,
    data,
    source: "base-json",
  };
}

function failure(
  code: StaffToolErrorCode,
  message: string,
): StaffToolFailure {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function dateTimeValue(appointment: Appointment): string {
  return `${appointment.date}T${appointment.time}`;
}

function sortAppointments(
  appointments: Appointment[],
): Appointment[] {
  return [...appointments].sort((left, right) =>
    dateTimeValue(left).localeCompare(dateTimeValue(right)),
  );
}

function latestAppointmentAtOrBefore(
  appointments: Appointment[],
  referenceDate: string,
): Appointment | null {
  const candidates = appointments
    .filter((appointment) => appointment.date <= referenceDate)
    .sort((left, right) =>
      dateTimeValue(right).localeCompare(dateTimeValue(left)),
    );

  return candidates[0] ?? null;
}

function nextAppointmentAtOrAfter(
  appointments: Appointment[],
  referenceDate: string,
): Appointment | null {
  const candidates = appointments
    .filter(
      (appointment) =>
        appointment.date >= referenceDate &&
        appointment.status !== "CANCELLED",
    )
    .sort((left, right) =>
      dateTimeValue(left).localeCompare(dateTimeValue(right)),
    );

  return candidates[0] ?? null;
}

function relevantDoctorFromSummary(
  latestAppointment: Appointment | null,
  nextAppointment: Appointment | null,
): PublicDoctor | null {
  const doctorId =
    nextAppointment?.doctorId ?? latestAppointment?.doctorId ?? null;

  return doctorId ? getDoctorById(doctorId) : null;
}

function safeAuthorized<T>(
  callback: () => T,
): T | StaffToolFailure {
  try {
    return callback();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure("FORBIDDEN", error.message);
    }

    throw error;
  }
}

export function getStaffContext(
  user: AuthUser,
): StaffToolSuccess<StaffContextData> {
  return success({
    userId: user.id,
    displayName: user.displayName,
    role: user.role,
    clinicId: user.clinicId,
    linkedDoctorId: user.linkedDoctorId,
  });
}

export function searchPatient(
  user: AuthUser,
  query: string,
): StaffToolResult<PatientSearchItem[]> {
  const authorized = safeAuthorized(() =>
    searchAuthorizedPatients(user, query),
  );

  if (!Array.isArray(authorized)) {
    return authorized;
  }

  return success(
    authorized.map((patient) => ({
      id: patient.id,
      hn: patient.hn,
      firstName: patient.firstName,
      lastName: patient.lastName,
    })),
  );
}

export function getPatientSummary(
  user: AuthUser,
  patientId: string,
  referenceDate = new Date().toISOString().slice(0, 10),
): StaffToolResult<PatientSummaryData> {
  const patientResult = safeAuthorized(() =>
    getAuthorizedPatientById(user, patientId),
  );

  if (patientResult && "ok" in patientResult) {
    return patientResult;
  }

  if (!patientResult) {
    return failure(
      "NOT_FOUND",
      "Patient not found in the Base Dataset.",
    );
  }

  const appointmentsResult = safeAuthorized(() =>
    getAuthorizedAppointments(user).filter(
      (appointment) => appointment.patientId === patientId,
    ),
  );

  if (!Array.isArray(appointmentsResult)) {
    return appointmentsResult;
  }

  const queueResult = safeAuthorized(() =>
    getAuthorizedQueue(user).filter(
      (entry) => entry.patientId === patientId,
    ),
  );

  if (!Array.isArray(queueResult)) {
    return queueResult;
  }

  const historyResult = safeAuthorized(() =>
    getAuthorizedPatientHistory(user, patientId),
  );

  if (!Array.isArray(historyResult)) {
    return historyResult;
  }

  const appointments = sortAppointments(appointmentsResult);
  const latestAppointment = latestAppointmentAtOrBefore(
    appointments,
    referenceDate,
  );
  const nextAppointment = nextAppointmentAtOrAfter(
    appointments,
    referenceDate,
  );

  return success({
    patient: patientResult,
    latestAppointment,
    nextAppointment,
    queue: [...queueResult].sort((left, right) =>
      left.queueNumber.localeCompare(right.queueNumber, undefined, {
        numeric: true,
      }),
    ),
    recentHistory: [...historyResult]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 3),
    relevantDoctor: relevantDoctorFromSummary(
      latestAppointment,
      nextAppointment,
    ),
  });
}

export function getPatientHistoryTool(
  user: AuthUser,
  patientId: string,
  limit: number,
): StaffToolResult<PatientHistory[]> {
  const patientResult = safeAuthorized(() =>
    getAuthorizedPatientById(user, patientId),
  );

  if (patientResult && "ok" in patientResult) {
    return patientResult;
  }

  if (!patientResult) {
    return failure(
      "NOT_FOUND",
      "Patient not found in the Base Dataset.",
    );
  }

  const histories = safeAuthorized(() =>
    getAuthorizedPatientHistory(user, patientId),
  );

  if (!Array.isArray(histories)) {
    return histories;
  }

  return success(
    [...histories]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, limit),
  );
}

export function getPatientAppointmentsTool(
  user: AuthUser,
  patientId: string,
): StaffToolResult<Appointment[]> {
  const patientResult = safeAuthorized(() =>
    getAuthorizedPatientById(user, patientId),
  );

  if (patientResult && "ok" in patientResult) {
    return patientResult;
  }

  if (!patientResult) {
    return failure(
      "NOT_FOUND",
      "Patient not found in the Base Dataset.",
    );
  }

  const appointments = safeAuthorized(() =>
    getAuthorizedAppointments(user).filter(
      (appointment) => appointment.patientId === patientId,
    ),
  );

  if (!Array.isArray(appointments)) {
    return appointments;
  }

  return success(sortAppointments(appointments));
}

export function getTodayAppointmentsTool(
  user: AuthUser,
  date: string,
): StaffToolResult<Appointment[]> {
  const appointments = safeAuthorized(() =>
    getAuthorizedAppointments(user).filter(
      (appointment) => appointment.date === date,
    ),
  );

  if (!Array.isArray(appointments)) {
    return appointments;
  }

  return success(sortAppointments(appointments));
}

export function getQueueTool(
  user: AuthUser,
  filters: {
    date?: string;
    doctorId?: string;
  },
): StaffToolResult<QueueEntry[]> {
  if (
    user.role === "DOCTOR" &&
    filters.doctorId &&
    filters.doctorId !== user.linkedDoctorId
  ) {
    return failure(
      "FORBIDDEN",
      "Doctor accounts may request only their own queue scope.",
    );
  }

  const queue = safeAuthorized(() =>
    getAuthorizedQueue(user).filter((entry) => {
      if (filters.date && entry.date !== filters.date) {
        return false;
      }

      if (
        filters.doctorId &&
        entry.doctorId !== filters.doctorId
      ) {
        return false;
      }

      return true;
    }),
  );

  if (!Array.isArray(queue)) {
    return queue;
  }

  return success(
    [...queue].sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.queueNumber.localeCompare(
        right.queueNumber,
        undefined,
        { numeric: true },
      );
    }),
  );
}

export function getDoctorScheduleTool(
  user: AuthUser,
  doctorId: string,
  date: string,
): StaffToolResult<DoctorScheduleData> {
  try {
    assertCanReadDoctorSchedule(user, doctorId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure("FORBIDDEN", error.message);
    }

    throw error;
  }

  const doctor = getDoctorById(doctorId);

  if (!doctor) {
    return failure(
      "NOT_FOUND",
      "Doctor not found in the Base Dataset.",
    );
  }

  const appointments = safeAuthorized(() =>
    getAuthorizedAppointments(user).filter(
      (appointment) =>
        appointment.doctorId === doctorId &&
        appointment.date === date,
    ),
  );

  if (!Array.isArray(appointments)) {
    return appointments;
  }

  return success({
    doctor,
    date,
    appointments: sortAppointments(appointments),
  });
}
