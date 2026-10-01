import type { AuthUser } from "@/src/auth/user";
import type { CreateAppointmentOptions } from "@/src/appointments/create-contract";
import { getCreateAppointmentPageData } from "@/src/appointments/create-options";
import { getAppointmentMutationPageData } from "@/src/appointments/mutation-options";
import type { Appointment } from "@/src/types/private-data";
import {
  verifyAppointmentHandoffToken,
  type AppointmentHandoffAction,
} from "@/src/handoff/appointment-token";
import {
  prepareCancelAppointment,
  prepareCreateAppointment,
  prepareUpdateAppointment,
} from "@/src/mcp/staff/tools/prepared";

export type AppointmentHandoffErrorCode =
  | "INVALID_OR_EXPIRED"
  | "IDENTITY_MISMATCH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_ACTION";

export type AppointmentHandoffError = {
  ok: false;
  error: {
    code: AppointmentHandoffErrorCode;
    message: string;
  };
};

type SharedHandoffData = {
  handoffId: string;
  expiresAt: string;
  baseAppointments: Appointment[];
};

export type CreateAppointmentHandoffData = SharedHandoffData & {
  kind: "create";
  action: Extract<
    AppointmentHandoffAction,
    { type: "CREATE_APPOINTMENT" }
  >;
  options: CreateAppointmentOptions;
  serverPreview: {
    patientLabel: string;
    doctorLabel: string;
    serviceLabel: string;
    status: "SCHEDULED";
  };
};

export type UpdateAppointmentHandoffData = SharedHandoffData & {
  kind: "update";
  action: Extract<
    AppointmentHandoffAction,
    { type: "UPDATE_APPOINTMENT" }
  >;
  options: Pick<CreateAppointmentOptions, "doctors" | "services">;
  serverPreview: {
    current: Appointment;
    proposed: Appointment;
  };
};

export type CancelAppointmentHandoffData = SharedHandoffData & {
  kind: "cancel";
  action: Extract<
    AppointmentHandoffAction,
    { type: "CANCEL_APPOINTMENT" }
  >;
  serverPreview: {
    appointment: Appointment;
    currentStatus: Appointment["status"];
    nextStatus: "CANCELLED";
  };
};

export type AppointmentHandoffWebData =
  | CreateAppointmentHandoffData
  | UpdateAppointmentHandoffData
  | CancelAppointmentHandoffData;

export type AppointmentHandoffResolution =
  | {
      ok: true;
      data: AppointmentHandoffWebData;
    }
  | AppointmentHandoffError;

function failure(
  code: AppointmentHandoffErrorCode,
  message: string,
): AppointmentHandoffError {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function preparedFailure(
  result: {
    ok: false;
    error: {
      code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_REQUEST";
      message: string;
    };
  },
): AppointmentHandoffError {
  const code =
    result.error.code === "INVALID_REQUEST"
      ? "INVALID_ACTION"
      : result.error.code;

  return failure(code, result.error.message);
}

export function resolveAppointmentHandoffForWeb(
  user: AuthUser,
  token: string,
  secret: string,
  now: Date = new Date(),
): AppointmentHandoffResolution {
  const payload = verifyAppointmentHandoffToken(token, secret, now);

  if (!payload) {
    return failure(
      "INVALID_OR_EXPIRED",
      "This prepared-action link is invalid, modified, or expired. Prepare the appointment action again from Staff MCP.",
    );
  }

  if (
    user.id !== payload.userId ||
    user.clinicId !== payload.clinicId ||
    user.role !== payload.role
  ) {
    return failure(
      "IDENTITY_MISMATCH",
      "Sign in to Clinic Cloud + with the same personnel demo account that authorized this Staff MCP action.",
    );
  }

  const expiresAt = new Date(payload.expiresAt * 1000).toISOString();

  switch (payload.action.type) {
    case "CREATE_APPOINTMENT": {
      const prepared = prepareCreateAppointment(user, payload.action);

      if (!prepared.ok) {
        return preparedFailure(prepared);
      }

      const pageData = getCreateAppointmentPageData(user);

      return {
        ok: true,
        data: {
          kind: "create",
          handoffId: payload.handoffId,
          expiresAt,
          action: payload.action,
          options: pageData.options,
          baseAppointments: pageData.baseAppointments,
          serverPreview: prepared.preview,
        },
      };
    }

    case "UPDATE_APPOINTMENT": {
      const prepared = prepareUpdateAppointment(user, {
        appointmentId: payload.action.appointmentId,
        ...payload.action.patch,
      });

      if (!prepared.ok) {
        return preparedFailure(prepared);
      }

      const pageData = getAppointmentMutationPageData(
        user,
        payload.action.appointmentId,
      );

      if (!pageData) {
        return failure(
          "NOT_FOUND",
          "Appointment not found in the Base Dataset.",
        );
      }

      return {
        ok: true,
        data: {
          kind: "update",
          handoffId: payload.handoffId,
          expiresAt,
          action: payload.action,
          options: pageData.options,
          baseAppointments: pageData.baseAppointments,
          serverPreview: {
            current: prepared.preview.current,
            proposed: prepared.preview.proposed,
          },
        },
      };
    }

    case "CANCEL_APPOINTMENT": {
      const prepared = prepareCancelAppointment(user, {
        appointmentId: payload.action.appointmentId,
      });

      if (!prepared.ok) {
        return preparedFailure(prepared);
      }

      const pageData = getAppointmentMutationPageData(
        user,
        payload.action.appointmentId,
      );

      if (!pageData) {
        return failure(
          "NOT_FOUND",
          "Appointment not found in the Base Dataset.",
        );
      }

      return {
        ok: true,
        data: {
          kind: "cancel",
          handoffId: payload.handoffId,
          expiresAt,
          action: payload.action,
          baseAppointments: pageData.baseAppointments,
          serverPreview: prepared.preview,
        },
      };
    }
  }
}
