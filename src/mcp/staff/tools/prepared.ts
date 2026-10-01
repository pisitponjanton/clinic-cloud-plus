import type { AuthUser } from "@/src/auth/user";
import {
  draftFromAppointment,
  validateUpdateAppointmentDraft,
  type AppointmentChange,
} from "@/src/appointments/update-contract";
import {
  validateCreateAppointmentDraft,
} from "@/src/appointments/create-contract";
import { getCreateAppointmentPageData } from "@/src/appointments/create-options";
import { getAppointmentMutationPageData } from "@/src/appointments/mutation-options";
import {
  assertCanCancelAppointment,
  getAuthorizedAppointmentById,
} from "@/src/authorization/data";
import { AuthorizationError } from "@/src/authorization/permissions";
import type {
  Appointment,
  AppointmentStatus,
} from "@/src/types/private-data";
import type { AppointmentUpdatePatch } from "@/src/local-data/appointment-overlay";
import type { StaffToolFailure } from "@/src/mcp/staff/tools/read";

export const PREPARED_PERSISTENCE = "web-localStorage" as const;
export const PREPARED_MESSAGE = "Prepared only. Not yet saved." as const;

export type PrepareCreateAppointmentInput = {
  patientId: string;
  doctorId: string;
  serviceId: string;
  date: string;
  time: string;
  note?: string;
};

export type PrepareUpdateAppointmentInput = {
  appointmentId: string;
  doctorId?: string | null;
  serviceId?: string | null;
  date?: string;
  time?: string;
  note?: string;
};

export type PrepareCancelAppointmentInput = {
  appointmentId: string;
};

export type PreparedCreateAppointmentAction = {
  type: "CREATE_APPOINTMENT";
  patientId: string;
  doctorId: string;
  serviceId: string;
  date: string;
  time: string;
  note: string;
};

export type PreparedUpdateAppointmentAction = {
  type: "UPDATE_APPOINTMENT";
  appointmentId: string;
  patch: AppointmentUpdatePatch;
};

export type PreparedCancelAppointmentAction = {
  type: "CANCEL_APPOINTMENT";
  appointmentId: string;
};

export type PreparedActionSuccess<
  TAction,
  TPreview,
> = {
  ok: true;
  action: TAction;
  preview: TPreview;
  confirmationRequired: true;
  persistence: typeof PREPARED_PERSISTENCE;
  message: typeof PREPARED_MESSAGE;
  source: "base-json";
};

export type PreparedCreateAppointmentResult =
  | PreparedActionSuccess<
      PreparedCreateAppointmentAction,
      {
        patientLabel: string;
        doctorLabel: string;
        serviceLabel: string;
        status: "SCHEDULED";
      }
    >
  | StaffToolFailure;

export type PreparedUpdateAppointmentResult =
  | PreparedActionSuccess<
      PreparedUpdateAppointmentAction,
      {
        current: Appointment;
        proposed: Appointment;
        changes: AppointmentChange[];
      }
    >
  | StaffToolFailure;

export type PreparedCancelAppointmentResult =
  | PreparedActionSuccess<
      PreparedCancelAppointmentAction,
      {
        appointment: Appointment;
        currentStatus: AppointmentStatus;
        nextStatus: "CANCELLED";
      }
    >
  | StaffToolFailure;

function failure(
  code: StaffToolFailure["error"]["code"],
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

function prepared<TAction, TPreview>(
  action: TAction,
  preview: TPreview,
): PreparedActionSuccess<TAction, TPreview> {
  return {
    ok: true,
    action,
    preview,
    confirmationRequired: true,
    persistence: PREPARED_PERSISTENCE,
    message: PREPARED_MESSAGE,
    source: "base-json",
  };
}

function validationMessage(
  errors: Record<string, string | undefined>,
): string {
  const messages = Object.values(errors).filter(
    (value): value is string => Boolean(value),
  );

  return messages.length > 0
    ? messages.join(" ")
    : "Prepared appointment input is invalid.";
}

export function prepareCreateAppointment(
  user: AuthUser,
  input: PrepareCreateAppointmentInput,
): PreparedCreateAppointmentResult {
  let pageData: ReturnType<typeof getCreateAppointmentPageData>;

  try {
    pageData = getCreateAppointmentPageData(user);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure("FORBIDDEN", error.message);
    }

    throw error;
  }

  const validation = validateCreateAppointmentDraft(
    {
      patientId: input.patientId,
      doctorId: input.doctorId,
      serviceId: input.serviceId,
      date: input.date,
      time: input.time,
      note: input.note ?? "",
    },
    pageData.options,
  );

  if (!validation.ok) {
    return failure(
      "INVALID_REQUEST",
      validationMessage(validation.errors),
    );
  }

  const {
    draft,
    patientLabel,
    doctorLabel,
    serviceLabel,
  } = validation.preview;

  if (!doctorLabel || !serviceLabel) {
    return failure(
      "INVALID_REQUEST",
      "Prepared Staff MCP appointment creation requires an active doctor and service.",
    );
  }

  return prepared(
    {
      type: "CREATE_APPOINTMENT",
      patientId: draft.patientId,
      doctorId: draft.doctorId,
      serviceId: draft.serviceId,
      date: draft.date,
      time: draft.time,
      note: draft.note,
    },
    {
      patientLabel,
      doctorLabel,
      serviceLabel,
      status: "SCHEDULED",
    },
  );
}

export function prepareUpdateAppointment(
  user: AuthUser,
  input: PrepareUpdateAppointmentInput,
): PreparedUpdateAppointmentResult {
  let pageData: ReturnType<typeof getAppointmentMutationPageData>;

  try {
    pageData = getAppointmentMutationPageData(
      user,
      input.appointmentId,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure("FORBIDDEN", error.message);
    }

    throw error;
  }

  if (!pageData) {
    return failure(
      "NOT_FOUND",
      "Appointment not found in the Base Dataset.",
    );
  }

  const current = pageData.baseAppointment;

  if (current.status === "CANCELLED") {
    return failure(
      "INVALID_REQUEST",
      "A cancelled Base appointment cannot be prepared for update.",
    );
  }

  const draft = draftFromAppointment(current);

  if (input.doctorId !== undefined) {
    draft.doctorId = input.doctorId ?? "";
  }

  if (input.serviceId !== undefined) {
    draft.serviceId = input.serviceId ?? "";
  }

  if (input.date !== undefined) {
    draft.date = input.date;
  }

  if (input.time !== undefined) {
    draft.time = input.time;
  }

  if (input.note !== undefined) {
    draft.note = input.note;
  }

  const validation = validateUpdateAppointmentDraft(
    current,
    draft,
    pageData.options,
  );

  if (!validation.ok) {
    return failure(
      "INVALID_REQUEST",
      validationMessage(validation.errors),
    );
  }

  const patch = validation.preview.patch;
  const proposed: Appointment = {
    ...current,
    ...patch,
  };

  return prepared(
    {
      type: "UPDATE_APPOINTMENT",
      appointmentId: current.id,
      patch,
    },
    {
      current,
      proposed,
      changes: validation.preview.changes,
    },
  );
}

export function prepareCancelAppointment(
  user: AuthUser,
  input: PrepareCancelAppointmentInput,
): PreparedCancelAppointmentResult {
  let appointment: Appointment | null;

  try {
    appointment = getAuthorizedAppointmentById(
      user,
      input.appointmentId,
    );

    if (appointment) {
      assertCanCancelAppointment(user, appointment);
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure("FORBIDDEN", error.message);
    }

    throw error;
  }

  if (!appointment) {
    return failure(
      "NOT_FOUND",
      "Appointment not found in the Base Dataset.",
    );
  }

  if (appointment.status === "CANCELLED") {
    return failure(
      "INVALID_REQUEST",
      "Appointment is already CANCELLED in the Base Dataset.",
    );
  }

  return prepared(
    {
      type: "CANCEL_APPOINTMENT",
      appointmentId: appointment.id,
    },
    {
      appointment,
      currentStatus: appointment.status,
      nextStatus: "CANCELLED",
    },
  );
}
