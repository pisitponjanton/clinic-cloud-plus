import type { Appointment } from "@/src/types/private-data";
import type {
  CreateAppointmentOption,
  CreateAppointmentOptions,
} from "@/src/appointments/create-contract";
import type { AppointmentUpdatePatch } from "@/src/local-data/appointment-overlay";

export type UpdateAppointmentDraft = {
  doctorId: string;
  serviceId: string;
  date: string;
  time: string;
  note: string;
};

export type UpdateAppointmentErrors = Partial<
  Record<keyof UpdateAppointmentDraft | "form", string>
>;

export type AppointmentChange = {
  field: keyof UpdateAppointmentDraft;
  label: string;
  currentValue: string;
  newValue: string;
};

export type UpdateAppointmentPreview = {
  draft: UpdateAppointmentDraft;
  patch: AppointmentUpdatePatch;
  changes: AppointmentChange[];
};

export type UpdateAppointmentValidation =
  | {
      ok: true;
      preview: UpdateAppointmentPreview;
    }
  | {
      ok: false;
      errors: UpdateAppointmentErrors;
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

function optionLabel(
  options: readonly CreateAppointmentOption[],
  value: string | null,
): string {
  if (!value) {
    return "Not assigned";
  }

  return findOption(options, value)?.label ?? value;
}

export function draftFromAppointment(
  appointment: Appointment,
): UpdateAppointmentDraft {
  return {
    doctorId: appointment.doctorId ?? "",
    serviceId: appointment.serviceId ?? "",
    date: appointment.date,
    time: appointment.time,
    note: appointment.note,
  };
}

export function validateUpdateAppointmentDraft(
  current: Appointment,
  draft: UpdateAppointmentDraft,
  options: Pick<CreateAppointmentOptions, "doctors" | "services">,
): UpdateAppointmentValidation {
  const normalized: UpdateAppointmentDraft = {
    doctorId: draft.doctorId.trim(),
    serviceId: draft.serviceId.trim(),
    date: draft.date.trim(),
    time: draft.time.trim(),
    note: draft.note.trim(),
  };

  const errors: UpdateAppointmentErrors = {};
  const doctor = normalized.doctorId
    ? findOption(options.doctors, normalized.doctorId)
    : undefined;
  const service = normalized.serviceId
    ? findOption(options.services, normalized.serviceId)
    : undefined;

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

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  const patch: AppointmentUpdatePatch = {};
  const changes: AppointmentChange[] = [];

  if ((current.doctorId ?? "") !== normalized.doctorId) {
    patch.doctorId = normalized.doctorId || null;
    changes.push({
      field: "doctorId",
      label: "Doctor",
      currentValue: optionLabel(options.doctors, current.doctorId),
      newValue: optionLabel(options.doctors, normalized.doctorId || null),
    });
  }

  if ((current.serviceId ?? "") !== normalized.serviceId) {
    patch.serviceId = normalized.serviceId || null;
    changes.push({
      field: "serviceId",
      label: "Service",
      currentValue: optionLabel(options.services, current.serviceId),
      newValue: optionLabel(options.services, normalized.serviceId || null),
    });
  }

  if (current.date !== normalized.date) {
    patch.date = normalized.date;
    changes.push({
      field: "date",
      label: "Date",
      currentValue: current.date,
      newValue: normalized.date,
    });
  }

  if (current.time !== normalized.time) {
    patch.time = normalized.time;
    changes.push({
      field: "time",
      label: "Time",
      currentValue: current.time,
      newValue: normalized.time,
    });
  }

  if (current.note !== normalized.note) {
    patch.note = normalized.note;
    changes.push({
      field: "note",
      label: "Note",
      currentValue: current.note || "No note",
      newValue: normalized.note || "No note",
    });
  }

  if (changes.length === 0) {
    return {
      ok: false,
      errors: {
        form: "ยังไม่มีข้อมูลที่เปลี่ยนแปลง",
      },
    };
  }

  return {
    ok: true,
    preview: {
      draft: normalized,
      patch,
      changes,
    },
  };
}
