import type {
  Appointment,
  AppointmentStatus,
} from "@/src/types/private-data";

export const LOCAL_DATA_SCHEMA_VERSION = 1 as const;
export const LOCAL_DATA_CLINIC_ID = "CLINIC-001";
export const LOCAL_DATA_STORAGE_KEY =
  "clinic-cloud-plus:CLINIC-001:data:v1";

const APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
]);

const APPOINTMENT_KEYS = new Set([
  "id",
  "clinicId",
  "patientId",
  "doctorId",
  "serviceId",
  "date",
  "time",
  "status",
  "note",
]);

const APPOINTMENT_UPDATE_KEYS = [
  "patientId",
  "doctorId",
  "serviceId",
  "date",
  "time",
  "status",
  "note",
] as const;

type AppointmentUpdateKey = (typeof APPOINTMENT_UPDATE_KEYS)[number];

export type AppointmentUpdatePatch = Partial<
  Pick<Appointment, AppointmentUpdateKey>
>;

export type AppointmentOverlayCollection = {
  created: Appointment[];
  updated: Record<string, AppointmentUpdatePatch>;
  deletedIds: string[];
};

export type LocalDataOverlay = {
  schemaVersion: typeof LOCAL_DATA_SCHEMA_VERSION;
  clinicId: typeof LOCAL_DATA_CLINIC_ID;
  updatedAt: string;
  collections: {
    appointments: AppointmentOverlayCollection;
  };
};

export type OverlayIssueCode =
  | "MALFORMED_JSON"
  | "INVALID_ROOT"
  | "INCOMPATIBLE_SCHEMA_VERSION"
  | "WRONG_CLINIC"
  | "INVALID_UPDATED_AT"
  | "INVALID_APPOINTMENTS_COLLECTION"
  | "INVALID_CREATED_APPOINTMENT"
  | "DUPLICATE_CREATED_APPOINTMENT"
  | "INVALID_UPDATE_PATCH"
  | "INVALID_DELETED_ID";

export type OverlayIssue = {
  code: OverlayIssueCode;
  path: string;
  message: string;
};

export type OverlayParseState = "empty" | "valid" | "recovered";

export type OverlayParseResult = {
  state: OverlayParseState;
  overlay: LocalDataOverlay;
  issues: OverlayIssue[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function hasOnlyKeys(
  record: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): boolean {
  return Object.keys(record).every((key) => allowedKeys.has(key));
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && APPOINTMENT_STATUSES.has(
    value as AppointmentStatus,
  );
}

export function isValidAppointment(record: unknown): record is Appointment {
  if (!isRecord(record) || !hasOnlyKeys(record, APPOINTMENT_KEYS)) {
    return false;
  }

  return (
    isNonEmptyString(record.id) &&
    record.clinicId === LOCAL_DATA_CLINIC_ID &&
    isNonEmptyString(record.patientId) &&
    isNullableString(record.doctorId) &&
    isNullableString(record.serviceId) &&
    isValidDate(record.date) &&
    isValidTime(record.time) &&
    isAppointmentStatus(record.status) &&
    typeof record.note === "string"
  );
}

function isLocalAppointment(record: unknown): record is Appointment {
  return (
    isValidAppointment(record) &&
    record.id.startsWith("APT-LOCAL-")
  );
}

function isValidPatchValue(
  key: AppointmentUpdateKey,
  value: unknown,
): boolean {
  switch (key) {
    case "patientId":
      return isNonEmptyString(value);
    case "doctorId":
    case "serviceId":
      return isNullableString(value);
    case "date":
      return isValidDate(value);
    case "time":
      return isValidTime(value);
    case "status":
      return isAppointmentStatus(value);
    case "note":
      return typeof value === "string";
  }
}

export function isValidAppointmentUpdatePatch(
  value: unknown,
): value is AppointmentUpdatePatch {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);

  if (keys.length === 0) {
    return false;
  }

  const allowed = new Set<string>(APPOINTMENT_UPDATE_KEYS);

  if (!hasOnlyKeys(value, allowed)) {
    return false;
  }

  return keys.every((key) =>
    isValidPatchValue(key as AppointmentUpdateKey, value[key]),
  );
}

function emptyAppointmentsCollection(): AppointmentOverlayCollection {
  return {
    created: [],
    updated: {},
    deletedIds: [],
  };
}

export function createEmptyLocalDataOverlay(
  now: Date = new Date(),
): LocalDataOverlay {
  return {
    schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
    clinicId: LOCAL_DATA_CLINIC_ID,
    updatedAt: now.toISOString(),
    collections: {
      appointments: emptyAppointmentsCollection(),
    },
  };
}

function incompatibleResult(
  issue: OverlayIssue,
  now: Date,
): OverlayParseResult {
  return {
    state: "recovered",
    overlay: createEmptyLocalDataOverlay(now),
    issues: [issue],
  };
}

export function parseLocalDataOverlay(
  raw: string | null,
  now: Date = new Date(),
): OverlayParseResult {
  if (raw === null) {
    return {
      state: "empty",
      overlay: createEmptyLocalDataOverlay(now),
      issues: [],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return incompatibleResult(
      {
        code: "MALFORMED_JSON",
        path: "$",
        message: "Stored demo data is not valid JSON.",
      },
      now,
    );
  }

  if (!isRecord(parsed)) {
    return incompatibleResult(
      {
        code: "INVALID_ROOT",
        path: "$",
        message: "Stored demo data must be an object.",
      },
      now,
    );
  }

  if (parsed.schemaVersion !== LOCAL_DATA_SCHEMA_VERSION) {
    return incompatibleResult(
      {
        code: "INCOMPATIBLE_SCHEMA_VERSION",
        path: "$.schemaVersion",
        message: "Stored demo data uses an unsupported schema version.",
      },
      now,
    );
  }

  if (parsed.clinicId !== LOCAL_DATA_CLINIC_ID) {
    return incompatibleResult(
      {
        code: "WRONG_CLINIC",
        path: "$.clinicId",
        message: "Stored demo data belongs to a different clinic.",
      },
      now,
    );
  }

  const issues: OverlayIssue[] = [];
  let updatedAt = now.toISOString();

  if (typeof parsed.updatedAt === "string") {
    const timestamp = new Date(parsed.updatedAt);

    if (!Number.isNaN(timestamp.getTime())) {
      updatedAt = timestamp.toISOString();
    } else {
      issues.push({
        code: "INVALID_UPDATED_AT",
        path: "$.updatedAt",
        message: "Stored demo data has an invalid updatedAt timestamp.",
      });
    }
  } else {
    issues.push({
      code: "INVALID_UPDATED_AT",
      path: "$.updatedAt",
      message: "Stored demo data is missing a valid updatedAt timestamp.",
    });
  }

  const appointments = emptyAppointmentsCollection();
  const collections = parsed.collections;

  if (!isRecord(collections) || !isRecord(collections.appointments)) {
    issues.push({
      code: "INVALID_APPOINTMENTS_COLLECTION",
      path: "$.collections.appointments",
      message: "Appointment overlay collection is malformed.",
    });

    return {
      state: "recovered",
      overlay: {
        schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
        clinicId: LOCAL_DATA_CLINIC_ID,
        updatedAt,
        collections: { appointments },
      },
      issues,
    };
  }

  const appointmentCollection = collections.appointments;

  if (Array.isArray(appointmentCollection.created)) {
    const seenCreatedIds = new Set<string>();

    appointmentCollection.created.forEach((record, index) => {
      if (!isLocalAppointment(record)) {
        issues.push({
          code: "INVALID_CREATED_APPOINTMENT",
          path: `$.collections.appointments.created[${index}]`,
          message: "Malformed local appointment was ignored.",
        });
        return;
      }

      if (seenCreatedIds.has(record.id)) {
        issues.push({
          code: "DUPLICATE_CREATED_APPOINTMENT",
          path: `$.collections.appointments.created[${index}]`,
          message: "Duplicate local appointment ID was ignored.",
        });
        return;
      }

      seenCreatedIds.add(record.id);
      appointments.created.push({ ...record });
    });
  } else {
    issues.push({
      code: "INVALID_APPOINTMENTS_COLLECTION",
      path: "$.collections.appointments.created",
      message: "Local appointment created collection must be an array.",
    });
  }

  if (isRecord(appointmentCollection.updated)) {
    for (const [appointmentId, patch] of Object.entries(
      appointmentCollection.updated,
    )) {
      if (
        !appointmentId.startsWith("APT-") ||
        !isValidAppointmentUpdatePatch(patch)
      ) {
        issues.push({
          code: "INVALID_UPDATE_PATCH",
          path: `$.collections.appointments.updated.${appointmentId}`,
          message: "Malformed appointment update patch was ignored.",
        });
        continue;
      }

      appointments.updated[appointmentId] = { ...patch };
    }
  } else {
    issues.push({
      code: "INVALID_APPOINTMENTS_COLLECTION",
      path: "$.collections.appointments.updated",
      message: "Local appointment updated collection must be an object.",
    });
  }

  if (Array.isArray(appointmentCollection.deletedIds)) {
    const seenDeletedIds = new Set<string>();

    appointmentCollection.deletedIds.forEach((appointmentId, index) => {
      if (
        !isNonEmptyString(appointmentId) ||
        !appointmentId.startsWith("APT-") ||
        seenDeletedIds.has(appointmentId)
      ) {
        issues.push({
          code: "INVALID_DELETED_ID",
          path: `$.collections.appointments.deletedIds[${index}]`,
          message: "Malformed or duplicate deleted appointment ID was ignored.",
        });
        return;
      }

      seenDeletedIds.add(appointmentId);
      appointments.deletedIds.push(appointmentId);
    });
  } else {
    issues.push({
      code: "INVALID_APPOINTMENTS_COLLECTION",
      path: "$.collections.appointments.deletedIds",
      message: "Local appointment deletedIds collection must be an array.",
    });
  }

  return {
    state: issues.length === 0 ? "valid" : "recovered",
    overlay: {
      schemaVersion: LOCAL_DATA_SCHEMA_VERSION,
      clinicId: LOCAL_DATA_CLINIC_ID,
      updatedAt,
      collections: { appointments },
    },
    issues,
  };
}

export function serializeLocalDataOverlay(
  overlay: LocalDataOverlay,
): string {
  return JSON.stringify(overlay);
}

export function mergeAppointments(
  baseAppointments: readonly Appointment[],
  overlay: LocalDataOverlay,
): Appointment[] {
  const updates = overlay.collections.appointments.updated;
  const deletedIds = new Set(overlay.collections.appointments.deletedIds);

  const mergedBase = baseAppointments
    .map((baseAppointment) => {
      const patch = updates[baseAppointment.id];

      return patch
        ? {
            ...baseAppointment,
            ...patch,
          }
        : { ...baseAppointment };
    })
    .filter(
      (appointment) =>
        !deletedIds.has(appointment.id) && isValidAppointment(appointment),
    );

  const created = overlay.collections.appointments.created
    .filter(isLocalAppointment)
    .map((appointment) => ({ ...appointment }));

  return [...mergedBase, ...created];
}

export function withAppointmentCreated(
  overlay: LocalDataOverlay,
  appointment: Appointment,
  now: Date = new Date(),
): LocalDataOverlay {
  if (!isLocalAppointment(appointment)) {
    throw new TypeError(
      "Created appointments must be valid CLINIC-001 records with an APT-LOCAL- ID.",
    );
  }

  const exists = overlay.collections.appointments.created.some(
    (record) => record.id === appointment.id,
  );

  if (exists) {
    throw new TypeError("Local appointment ID already exists in the overlay.");
  }

  return {
    ...overlay,
    updatedAt: now.toISOString(),
    collections: {
      ...overlay.collections,
      appointments: {
        ...overlay.collections.appointments,
        created: [
          ...overlay.collections.appointments.created,
          { ...appointment },
        ],
      },
    },
  };
}

export function withAppointmentUpdate(
  overlay: LocalDataOverlay,
  appointmentId: string,
  patch: AppointmentUpdatePatch,
  now: Date = new Date(),
): LocalDataOverlay {
  if (
    !appointmentId.startsWith("APT-") ||
    !isValidAppointmentUpdatePatch(patch)
  ) {
    throw new TypeError("Appointment update patch is invalid.");
  }

  const localIndex = overlay.collections.appointments.created.findIndex(
    (record) => record.id === appointmentId,
  );

  if (localIndex >= 0) {
    const created = overlay.collections.appointments.created.map(
      (record, index) =>
        index === localIndex
          ? {
              ...record,
              ...patch,
            }
          : { ...record },
    );

    return {
      ...overlay,
      updatedAt: now.toISOString(),
      collections: {
        ...overlay.collections,
        appointments: {
          ...overlay.collections.appointments,
          created,
        },
      },
    };
  }

  return {
    ...overlay,
    updatedAt: now.toISOString(),
    collections: {
      ...overlay.collections,
      appointments: {
        ...overlay.collections.appointments,
        updated: {
          ...overlay.collections.appointments.updated,
          [appointmentId]: {
            ...overlay.collections.appointments.updated[appointmentId],
            ...patch,
          },
        },
      },
    },
  };
}

export function withoutLocalCreatedAppointment(
  overlay: LocalDataOverlay,
  appointmentId: string,
  now: Date = new Date(),
): LocalDataOverlay {
  return {
    ...overlay,
    updatedAt: now.toISOString(),
    collections: {
      ...overlay.collections,
      appointments: {
        ...overlay.collections.appointments,
        created: overlay.collections.appointments.created
          .filter((record) => record.id !== appointmentId)
          .map((record) => ({ ...record })),
      },
    },
  };
}

export function withAppointmentDeleted(
  overlay: LocalDataOverlay,
  appointmentId: string,
  now: Date = new Date(),
): LocalDataOverlay {
  if (!appointmentId.startsWith("APT-")) {
    throw new TypeError("Appointment ID is invalid.");
  }

  if (appointmentId.startsWith("APT-LOCAL-")) {
    return withoutLocalCreatedAppointment(overlay, appointmentId, now);
  }

  const deletedIds = new Set(
    overlay.collections.appointments.deletedIds,
  );
  deletedIds.add(appointmentId);

  const updated = { ...overlay.collections.appointments.updated };
  delete updated[appointmentId];

  return {
    ...overlay,
    updatedAt: now.toISOString(),
    collections: {
      ...overlay.collections,
      appointments: {
        ...overlay.collections.appointments,
        updated,
        deletedIds: [...deletedIds],
      },
    },
  };
}

