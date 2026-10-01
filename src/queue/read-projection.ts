import type { AuthUser } from "@/src/auth/user";
import { getAuthorizedQueue } from "@/src/authorization/data";
import {
  getAppointmentById,
  getPatientById,
} from "@/src/data-access/private";
import { getDoctorById } from "@/src/data-access/public";
import type { QueueStatus } from "@/src/types/private-data";

export const QUEUE_STATUS_FILTERS = [
  "WAITING",
  "CALLED",
  "IN_SERVICE",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly QueueStatus[];

export type QueueReadItem = {
  id: string;
  queueNumber: string;
  status: QueueStatus;
  date: string;
  patientId: string;
  patientHn: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  appointmentId: string | null;
};

export type QueueListProjection = {
  status: QueueStatus | null;
  date: string;
  totalInScope: number;
  resultCount: number;
  items: QueueReadItem[];
  statusCounts: Record<QueueStatus, number>;
};

function parseStatus(rawStatus: string | undefined): QueueStatus | null {
  const normalized = rawStatus?.trim().toUpperCase();

  if (!normalized || normalized === "ALL") {
    return null;
  }

  return QUEUE_STATUS_FILTERS.includes(normalized as QueueStatus)
    ? (normalized as QueueStatus)
    : null;
}

function mapQueueItem(
  entry: ReturnType<typeof getAuthorizedQueue>[number],
): QueueReadItem {
  const patient = getPatientById(entry.patientId);

  if (!patient) {
    throw new Error(
      `Authorized queue entry ${entry.id} references a missing patient`,
    );
  }

  const doctor = entry.doctorId ? getDoctorById(entry.doctorId) : null;

  if (entry.doctorId && !doctor) {
    throw new Error(
      `Authorized queue entry ${entry.id} references a missing doctor`,
    );
  }

  if (entry.appointmentId && !getAppointmentById(entry.appointmentId)) {
    throw new Error(
      `Authorized queue entry ${entry.id} references a missing appointment`,
    );
  }

  return {
    id: entry.id,
    queueNumber: entry.queueNumber,
    status: entry.status,
    date: entry.date,
    patientId: patient.id,
    patientHn: patient.hn,
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorId: doctor?.id ?? null,
    doctorName: doctor?.displayName ?? null,
    appointmentId: entry.appointmentId,
  };
}

export function getQueueListProjection(
  user: AuthUser,
  filters: {
    status?: string;
    date?: string;
  } = {},
): QueueListProjection {
  const status = parseStatus(filters.status);
  const date = filters.date?.trim() ?? "";
  const inScope = getAuthorizedQueue(user);

  const statusCounts = Object.fromEntries(
    QUEUE_STATUS_FILTERS.map((queueStatus) => [
      queueStatus,
      inScope.filter((entry) => entry.status === queueStatus).length,
    ]),
  ) as Record<QueueStatus, number>;

  const filtered = inScope
    .filter((entry) => (status ? entry.status === status : true))
    .filter((entry) => (date ? entry.date === date : true))
    .sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.queueNumber.localeCompare(right.queueNumber, undefined, {
        numeric: true,
      });
    });

  return {
    status,
    date,
    totalInScope: inScope.length,
    resultCount: filtered.length,
    items: filtered.map(mapQueueItem),
    statusCounts,
  };
}
