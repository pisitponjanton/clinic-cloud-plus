import type { Appointment } from "@/src/types/private-data";

export type CreateAppointmentOption = {
  value: string;
  label: string;
  description?: string;
};

export type CreateAppointmentOptions = {
  patients: CreateAppointmentOption[];
  doctors: CreateAppointmentOption[];
  services: CreateAppointmentOption[];
};

export type CreateAppointmentDraft = {
  patientId: string;
  doctorId: string;
  serviceId: string;
  date: string;
  time: string;
  note: string;
};

export type CreateAppointmentErrors = Partial<
  Record<keyof CreateAppointmentDraft, string>
>;

export type CreateAppointmentPreview = {
  draft: CreateAppointmentDraft;
  patientLabel: string;
  doctorLabel: string | null;
  serviceLabel: string | null;
};

export type CreateAppointmentValidation =
  | {
      ok: true;
      preview: CreateAppointmentPreview;
    }
  | {
      ok: false;
      errors: CreateAppointmentErrors;
    };

function findOption(
  options: readonly CreateAppointmentOption[],
  value: string,
): CreateAppointmentOption | undefined {
  return options.find((option) => option.value === value);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(":").map(Number);

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

export function validateCreateAppointmentDraft(
  draft: CreateAppointmentDraft,
  options: CreateAppointmentOptions,
): CreateAppointmentValidation {
  const normalized: CreateAppointmentDraft = {
    patientId: draft.patientId.trim(),
    doctorId: draft.doctorId.trim(),
    serviceId: draft.serviceId.trim(),
    date: draft.date.trim(),
    time: draft.time.trim(),
    note: draft.note.trim(),
  };

  const errors: CreateAppointmentErrors = {};
  const patient = findOption(options.patients, normalized.patientId);
  const doctor = normalized.doctorId
    ? findOption(options.doctors, normalized.doctorId)
    : undefined;
  const service = normalized.serviceId
    ? findOption(options.services, normalized.serviceId)
    : undefined;

  if (!normalized.patientId) {
    errors.patientId = "กรุณาเลือกผู้ป่วย";
  } else if (!patient) {
    errors.patientId = "ผู้ป่วยนี้ไม่อยู่ในสิทธิ์หรือชุดข้อมูลที่เลือกได้";
  }

  if (normalized.doctorId && !doctor) {
    errors.doctorId = "แพทย์นี้ไม่อยู่ในตัวเลือกที่อนุญาต";
  }

  if (normalized.serviceId && !service) {
    errors.serviceId = "บริการนี้ไม่อยู่ในตัวเลือกที่อนุญาต";
  }

  if (!normalized.date) {
    errors.date = "กรุณาเลือกวันที่";
  } else if (!isValidDate(normalized.date)) {
    errors.date = "วันที่ไม่ถูกต้อง";
  }

  if (!normalized.time) {
    errors.time = "กรุณาเลือกเวลา";
  } else if (!isValidTime(normalized.time)) {
    errors.time = "เวลาไม่ถูกต้อง";
  }

  if (Object.keys(errors).length > 0 || !patient) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    preview: {
      draft: normalized,
      patientLabel: patient.label,
      doctorLabel: doctor?.label ?? null,
      serviceLabel: service?.label ?? null,
    },
  };
}

export function createLocalAppointmentFromPreview(
  preview: CreateAppointmentPreview,
  localId: string,
): Appointment {
  return {
    id: localId,
    clinicId: "CLINIC-001",
    patientId: preview.draft.patientId,
    doctorId: preview.draft.doctorId || null,
    serviceId: preview.draft.serviceId || null,
    date: preview.draft.date,
    time: preview.draft.time,
    status: "SCHEDULED",
    note: preview.draft.note,
  };
}

export function createLocalAppointmentId(uuid: string): string {
  const normalized = uuid.trim();

  if (!normalized) {
    throw new TypeError("UUID is required for a local appointment ID.");
  }

  return `APT-LOCAL-${normalized}`;
}
