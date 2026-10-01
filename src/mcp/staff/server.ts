import {
  createMcpHandler,
  McpServer,
  type McpRequestContext,
} from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import { requireHandoffSecret } from "@/src/handoff/config";
import { createAppointmentHandoffLink } from "@/src/handoff/appointment-token";
import { requireStaffAuthUser } from "@/src/mcp/staff/auth";
import {
  prepareCancelAppointment,
  prepareCreateAppointment,
  prepareUpdateAppointment,
} from "@/src/mcp/staff/tools/prepared";
import {
  getDoctorScheduleTool,
  getPatientAppointmentsTool,
  getPatientHistoryTool,
  getPatientSummary,
  getQueueTool,
  getStaffContext,
  getTodayAppointmentsTool,
  searchPatient,
} from "@/src/mcp/staff/tools/read";

export const STAFF_MCP_READ_TOOL_NAMES = [
  "get_staff_context",
  "search_patient",
  "get_patient_summary",
  "get_patient_history",
  "get_patient_appointments",
  "get_today_appointments",
  "get_queue",
  "get_doctor_schedule",
] as const;

export const STAFF_MCP_PREPARED_TOOL_NAMES = [
  "prepare_create_appointment",
  "prepare_update_appointment",
  "prepare_cancel_appointment",
] as const;

export const STAFF_MCP_INSTRUCTIONS = `Clinic Cloud + Staff MCP is an authenticated internal demo interface.
Authenticated identity and role come from the trusted bearer-token context, never from tool arguments.
Use Staff MCP tool output as the source of truth for Clinic Cloud + Base Dataset facts.
Do not invent missing records.
Do not expose credentials, password hashes, signing secrets, or bearer tokens in tool results.
Browser-local Web Appointment changes are not automatically visible to Staff MCP.
Read tools enforce role/relevance from the authenticated personnel identity.
Prepared appointment tools validate and preview intent only.
A prepared action is not persisted.
Never tell the user an appointment was created, updated, or cancelled from a prepared-tool result alone.
The user must continue to Clinic Cloud + Web, review the current/new state, and explicitly confirm before browser localStorage changes.`;

const EMPTY_INPUT = z.object({}).strict();
const DATE_INPUT = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TIME_INPUT = z.string().regex(/^\d{2}:\d{2}$/);

function toolResult<T extends { ok: boolean }>(result: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
    structuredContent: result as unknown as Record<string, unknown>,
    ...(result.ok ? {} : { isError: true }),
  };
}

type PreparedResult =
  | ReturnType<typeof prepareCreateAppointment>
  | ReturnType<typeof prepareUpdateAppointment>
  | ReturnType<typeof prepareCancelAppointment>;

function preparedToolResult(
  user: ReturnType<typeof requireStaffAuthUser>,
  result: PreparedResult,
  origin: string | null,
) {
  if (!result.ok) {
    return toolResult(result);
  }

  if (!origin) {
    return toolResult({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Web handoff is unavailable for this MCP transport.",
      },
    });
  }

  const handoff = createAppointmentHandoffLink(
    user,
    result.action,
    requireHandoffSecret(),
    origin,
  );

  return toolResult({
    ...result,
    handoff: {
      url: handoff.url,
      expiresAt: handoff.expiresAt,
    },
  });
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

const preparedAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function createStaffMcpServer(
  context: McpRequestContext,
): McpServer {
  const user = requireStaffAuthUser(context.authInfo);
  const handoffOrigin = context.requestInfo
    ? new URL(context.requestInfo.url).origin
    : null;
  const server = new McpServer(
    { name: "clinic-cloud-plus-staff", version: "0.1.0" },
    { instructions: STAFF_MCP_INSTRUCTIONS },
  );

  server.registerTool(
    "get_staff_context",
    {
      title: "Get authenticated staff context",
      description:
        "Return the trusted demo personnel identity without credentials or token data.",
      inputSchema: EMPTY_INPUT,
      annotations: readOnlyAnnotations,
    },
    async () => toolResult(getStaffContext(user)),
  );

  server.registerTool(
    "search_patient",
    {
      title: "Search patients",
      description:
        "Search authorized Base Dataset patients. Doctor accounts receive only relevant patients.",
      inputSchema: z.object({ query: z.string().trim().min(1) }).strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ query }) => toolResult(searchPatient(user, query)),
  );

  server.registerTool(
    "get_patient_summary",
    {
      title: "Get patient summary",
      description:
        "Return authorized Base Dataset patient context by stable patient ID.",
      inputSchema: z
        .object({ patientId: z.string().trim().min(1) })
        .strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ patientId }) =>
      toolResult(getPatientSummary(user, patientId)),
  );

  server.registerTool(
    "get_patient_history",
    {
      title: "Get patient history",
      description:
        "Return authorized stored mock history summaries without generated medical interpretation.",
      inputSchema: z
        .object({
          patientId: z.string().trim().min(1),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ patientId, limit }) =>
      toolResult(getPatientHistoryTool(user, patientId, limit)),
  );

  server.registerTool(
    "get_patient_appointments",
    {
      title: "Get patient appointments",
      description:
        "Return authorized Base appointment records. Browser-local Web changes are not included.",
      inputSchema: z
        .object({ patientId: z.string().trim().min(1) })
        .strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ patientId }) =>
      toolResult(getPatientAppointmentsTool(user, patientId)),
  );

  server.registerTool(
    "get_today_appointments",
    {
      title: "Get appointments by date",
      description:
        "Return Base appointments for an explicit date inside the authenticated role scope.",
      inputSchema: z.object({ date: DATE_INPUT }).strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ date }) =>
      toolResult(getTodayAppointmentsTool(user, date)),
  );

  server.registerTool(
    "get_queue",
    {
      title: "Get queue",
      description:
        "Return authorized Base Queue records with optional date and doctor filters.",
      inputSchema: z
        .object({
          date: DATE_INPUT.optional(),
          doctorId: z.string().trim().min(1).optional(),
        })
        .strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ date, doctorId }) =>
      toolResult(getQueueTool(user, { date, doctorId })),
  );

  server.registerTool(
    "get_doctor_schedule",
    {
      title: "Get doctor schedule",
      description:
        "Return Base appointments for one doctor/date. Doctor identities may request only their own linked doctor.",
      inputSchema: z
        .object({
          doctorId: z.string().trim().min(1),
          date: DATE_INPUT,
        })
        .strict(),
      annotations: readOnlyAnnotations,
    },
    async ({ doctorId, date }) =>
      toolResult(getDoctorScheduleTool(user, doctorId, date)),
  );

  server.registerTool(
    "prepare_create_appointment",
    {
      title: "Prepare appointment creation",
      description:
        "Validate and preview a new appointment only. This tool never persists data. Separate Clinic Cloud + Web confirmation is required before browser localStorage changes.",
      inputSchema: z
        .object({
          patientId: z.string().trim().min(1),
          doctorId: z.string().trim().min(1),
          serviceId: z.string().trim().min(1),
          date: DATE_INPUT,
          time: TIME_INPUT,
          note: z.string().max(1000).optional(),
        })
        .strict(),
      annotations: preparedAnnotations,
    },
    async (input) =>
      preparedToolResult(
        user,
        prepareCreateAppointment(user, input),
        handoffOrigin,
      ),
  );

  server.registerTool(
    "prepare_update_appointment",
    {
      title: "Prepare appointment update",
      description:
        "Validate and preview changes to a Base appointment only. This tool never persists data and cannot see browser-local appointment changes. Separate Web confirmation is required.",
      inputSchema: z
        .object({
          appointmentId: z.string().trim().min(1),
          doctorId: z.string().trim().min(1).nullable().optional(),
          serviceId: z.string().trim().min(1).nullable().optional(),
          date: DATE_INPUT.optional(),
          time: TIME_INPUT.optional(),
          note: z.string().max(1000).optional(),
        })
        .strict()
        .refine(
          (input) =>
            input.doctorId !== undefined ||
            input.serviceId !== undefined ||
            input.date !== undefined ||
            input.time !== undefined ||
            input.note !== undefined,
          {
            message:
              "At least one appointment field must be provided for update.",
          },
        ),
      annotations: preparedAnnotations,
    },
    async (input) =>
      preparedToolResult(
        user,
        prepareUpdateAppointment(user, input),
        handoffOrigin,
      ),
  );

  server.registerTool(
    "prepare_cancel_appointment",
    {
      title: "Prepare appointment cancellation",
      description:
        "Validate and preview status CANCELLED for a Base appointment only. This tool never persists cancellation; separate Clinic Cloud + Web confirmation is required.",
      inputSchema: z
        .object({
          appointmentId: z.string().trim().min(1),
        })
        .strict(),
      annotations: preparedAnnotations,
    },
    async ({ appointmentId }) =>
      preparedToolResult(
        user,
        prepareCancelAppointment(user, { appointmentId }),
        handoffOrigin,
      ),
  );

  return server;
}

export const staffMcpHandler = createMcpHandler(createStaffMcpServer);
