import { afterEach, beforeEach, describe, expect, it } from "vitest";

import appointmentsJson from "@/src/data/private/appointments.json";
import historiesJson from "@/src/data/private/histories.json";
import patientsJson from "@/src/data/private/patients.json";
import queueJson from "@/src/data/private/queue.json";
import usersJson from "@/src/data/private/users.json";
import doctorsJson from "@/src/data/public/doctors.json";
import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import { STAFF_MCP_SECRET_ENV } from "@/src/mcp/staff/config";
import { handleStaffMcpRequest } from "@/src/mcp/staff/http";
import {
  STAFF_MCP_PREPARED_TOOL_NAMES,
  STAFF_MCP_READ_TOOL_NAMES,
} from "@/src/mcp/staff/server";
import { createStaffAccessToken } from "@/src/mcp/staff/tokens";
import type {
  Appointment,
  DemoUser,
  Patient,
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";
import type { PublicDoctor } from "@/src/types/public-data";

const TEST_SECRET =
  "phase-32-staff-permission-secret-with-more-than-thirty-two-characters";

const appointments = appointmentsJson as Appointment[];
const histories = historiesJson as PatientHistory[];
const patients = patientsJson as Patient[];
const queue = queueJson as QueueEntry[];
const users = usersJson as DemoUser[];
const doctors = doctorsJson as PublicDoctor[];

function tokenFor(email: string): string {
  const record = authenticateDemoUser(email, "12345678");

  if (!record) {
    throw new Error(`Missing seeded account: ${email}`);
  }

  return createStaffAccessToken(
    toAuthUser(record),
    "phase-32-permission-client",
    TEST_SECRET,
  );
}

function request(
  body: unknown,
  token?: string,
): Request {
  return new Request("http://localhost/mcp/staff", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "localhost",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function rpc(
  body: unknown,
  token?: string,
): Promise<{
  response: Response;
  payload: Record<string, unknown>;
}> {
  const response = await handleStaffMcpRequest(request(body, token));
  const text = await response.text();

  let payload: Record<string, unknown>;

  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const line = text
      .split("\n")
      .find((entry) => entry.startsWith("data:"));

    if (!line) {
      throw new Error("Missing SSE data line");
    }

    payload = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
  } else {
    payload = text
      ? (JSON.parse(text) as Record<string, unknown>)
      : {};
  }

  return { response, payload };
}

async function callTool(
  token: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { response, payload } = await rpc(
    {
      jsonrpc: "2.0",
      id: 32,
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    },
    token,
  );

  expect(response.status).toBe(200);
  return payload;
}

function structured(
  response: Record<string, unknown>,
): Record<string, unknown> {
  const result = response.result as
    | { structuredContent?: Record<string, unknown> }
    | undefined;

  if (!result?.structuredContent) {
    throw new Error(
      `Missing structuredContent: ${JSON.stringify(response)}`,
    );
  }

  return result.structuredContent;
}

function sortedAppointments(records: Appointment[]): Appointment[] {
  return [...records].sort((left, right) =>
    `${left.date}T${left.time}`.localeCompare(
      `${right.date}T${right.time}`,
    ),
  );
}

describe("Staff MCP Phase 32 permission isolation", () => {
  beforeEach(() => {
    process.env[STAFF_MCP_SECRET_ENV] = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env[STAFF_MCP_SECRET_ENV];
  });

  it("rejects unauthenticated callers before any Staff MCP tool is exposed", async () => {
    const { response, payload } = await rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
    expect(JSON.stringify(payload)).not.toContain("get_patient_summary");
  });

  it("does not allow a PATIENT identity to mint a Staff MCP access token", () => {
    const record = authenticateDemoUser(
      "patient@cliniccloud.demo",
      "12345678",
    );

    if (!record) {
      throw new Error("Missing seeded patient account");
    }

    expect(() =>
      createStaffAccessToken(
        toAuthUser(record),
        "phase-32-permission-client",
        TEST_SECRET,
      ),
    ).toThrow("Staff MCP access requires a personnel identity");
  });

  it("publishes strict schemas with no role or privilege-elevation argument", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const { payload } = await rpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      },
      token,
    );
    const result = payload.result as {
      tools: Array<{
        name: string;
        inputSchema: {
          properties?: Record<string, unknown>;
          additionalProperties?: boolean;
        };
      }>;
    };

    expect(result.tools.map((tool) => tool.name).sort()).toEqual(
      [
        ...STAFF_MCP_READ_TOOL_NAMES,
        ...STAFF_MCP_PREPARED_TOOL_NAMES,
      ].sort(),
    );
    for (const tool of result.tools) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.inputSchema.properties ?? {}).not.toHaveProperty("role");
      expect(tool.inputSchema.properties ?? {}).not.toHaveProperty("userId");
      expect(tool.inputSchema.properties ?? {}).not.toHaveProperty("clinicId");
    }
  });

  it("rejects role elevation attempts passed as extra tool arguments", async () => {
    const token = tokenFor("doctor@cliniccloud.demo");

    const attempts: Array<[string, Record<string, unknown>]> = [
      ["get_staff_context", { role: "OWNER" }],
      ["search_patient", { query: "PAT-", role: "OWNER" }],
      [
        "get_patient_summary",
        { patientId: "PAT-002", role: "OWNER" },
      ],
      [
        "get_patient_history",
        { patientId: "PAT-002", limit: 10, role: "OWNER" },
      ],
      [
        "get_patient_appointments",
        { patientId: "PAT-002", role: "OWNER" },
      ],
      [
        "get_today_appointments",
        { date: "2026-10-01", role: "OWNER" },
      ],
      ["get_queue", { doctorId: "DOC-002", role: "OWNER" }],
      [
        "get_doctor_schedule",
        { doctorId: "DOC-002", date: "2026-10-01", role: "OWNER" },
      ],
    ];

    for (const [name, args] of attempts) {
      const response = await callTool(token, name, args);
      const result = response.result as { isError?: boolean } | undefined;

      expect(
        response.error !== undefined || result?.isError === true,
        `${name} accepted a role-elevation argument`,
      ).toBe(true);
    }
  });

  it("grounds STAFF search and read results exactly in the Base JSON", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const basePatient = patients.find(
      (patient) => patient.id === "PAT-001",
    );

    if (!basePatient) {
      throw new Error("Missing seeded PAT-001");
    }

    expect(
      structured(
        await callTool(token, "search_patient", {
          query: basePatient.hn,
        }),
      ),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: [
        {
          id: basePatient.id,
          hn: basePatient.hn,
          firstName: basePatient.firstName,
          lastName: basePatient.lastName,
        },
      ],
    });

    expect(
      structured(
        await callTool(token, "get_patient_appointments", {
          patientId: basePatient.id,
        }),
      ),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: sortedAppointments(
        appointments.filter(
          (appointment) =>
            appointment.patientId === basePatient.id,
        ),
      ),
    });

    expect(
      structured(
        await callTool(token, "get_patient_history", {
          patientId: basePatient.id,
          limit: 50,
        }),
      ),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: histories
        .filter((history) => history.patientId === basePatient.id)
        .sort((left, right) => right.date.localeCompare(left.date)),
    });
  });

  it("grounds date, queue, and schedule reads exactly in Base JSON", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const date = "2026-10-01";
    const doctorId = "DOC-001";
    const doctor = doctors.find((record) => record.id === doctorId);

    if (!doctor) {
      throw new Error("Missing seeded doctor");
    }

    expect(
      structured(
        await callTool(token, "get_today_appointments", { date }),
      ),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: sortedAppointments(
        appointments.filter(
          (appointment) => appointment.date === date,
        ),
      ),
    });

    expect(
      structured(
        await callTool(token, "get_queue", {
          date,
          doctorId,
        }),
      ),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: queue
        .filter(
          (entry) =>
            entry.date === date && entry.doctorId === doctorId,
        )
        .sort((left, right) =>
          left.queueNumber.localeCompare(
            right.queueNumber,
            undefined,
            { numeric: true },
          ),
        ),
    });

    expect(
      structured(
        await callTool(token, "get_doctor_schedule", {
          doctorId,
          date,
        }),
      ),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: {
        doctor,
        date,
        appointments: sortedAppointments(
          appointments.filter(
            (appointment) =>
              appointment.doctorId === doctorId &&
              appointment.date === date,
          ),
        ),
      },
    });
  });

  it("limits DOCTOR patient search to relevant Base patients", async () => {
    const token = tokenFor("doctor@cliniccloud.demo");
    const response = structured(
      await callTool(token, "search_patient", {
        query: "PAT-",
      }),
    );
    const data = response.data as Array<{ id: string }>;

    expect(data.map((patient) => patient.id).sort()).toEqual([
      "PAT-001",
      "PAT-005",
      "PAT-009",
      "PAT-013",
      "PAT-017",
    ]);
  });

  it.each([
    "get_patient_summary",
    "get_patient_appointments",
  ] as const)(
    "returns FORBIDDEN when DOCTOR uses %s for an unrelated patient",
    async (toolName) => {
      const token = tokenFor("doctor@cliniccloud.demo");
      const response = structured(
        await callTool(token, toolName, {
          patientId: "PAT-002",
        }),
      );

      expect(response).toMatchObject({
        ok: false,
        error: {
          code: "FORBIDDEN",
        },
      });
    },
  );

  it("returns FORBIDDEN when DOCTOR reads unrelated patient history", async () => {
    const token = tokenFor("doctor@cliniccloud.demo");
    const response = structured(
      await callTool(token, "get_patient_history", {
        patientId: "PAT-002",
        limit: 10,
      }),
    );

    expect(response).toMatchObject({
      ok: false,
      error: {
        code: "FORBIDDEN",
      },
    });
  });

  it("filters DOCTOR date and queue reads to linked doctor only", async () => {
    const token = tokenFor("doctor@cliniccloud.demo");

    const appointmentsResponse = structured(
      await callTool(token, "get_today_appointments", {
        date: "2026-10-01",
      }),
    );
    const appointmentData = appointmentsResponse.data as Appointment[];

    expect(
      appointmentData.every(
        (appointment) => appointment.doctorId === "DOC-001",
      ),
    ).toBe(true);

    const queueResponse = structured(
      await callTool(token, "get_queue", {
        date: "2026-10-01",
      }),
    );
    const queueData = queueResponse.data as QueueEntry[];

    expect(
      queueData.every((entry) => entry.doctorId === "DOC-001"),
    ).toBe(true);

    const otherQueue = structured(
      await callTool(token, "get_queue", {
        doctorId: "DOC-002",
      }),
    );

    expect(otherQueue).toMatchObject({
      ok: false,
      error: {
        code: "FORBIDDEN",
      },
    });
  });

  it("allows OWNER, STAFF, and NURSE to read a normal personnel patient scope", async () => {
    for (const email of [
      "owner@cliniccloud.demo",
      "staff@cliniccloud.demo",
      "nurse@cliniccloud.demo",
    ]) {
      const response = structured(
        await callTool(
          tokenFor(email),
          "get_patient_summary",
          { patientId: "PAT-002" },
        ),
      );

      expect(response).toMatchObject({
        ok: true,
        source: "base-json",
        data: {
          patient: {
            id: "PAT-002",
          },
        },
      });
    }
  });

  it("never returns password hashes, signing secret, or bearer token in read-tool results", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const baseUser = users.find(
      (user) => user.id === "USR-STAFF-001",
    );

    if (!baseUser) {
      throw new Error("Missing seeded staff user");
    }

    const responses = await Promise.all([
      callTool(token, "get_staff_context"),
      callTool(token, "search_patient", { query: "PAT-001" }),
      callTool(token, "get_patient_summary", {
        patientId: "PAT-001",
      }),
      callTool(token, "get_patient_history", {
        patientId: "PAT-001",
        limit: 10,
      }),
      callTool(token, "get_patient_appointments", {
        patientId: "PAT-001",
      }),
      callTool(token, "get_today_appointments", {
        date: "2026-10-01",
      }),
      callTool(token, "get_queue", {
        date: "2026-10-01",
      }),
      callTool(token, "get_doctor_schedule", {
        doctorId: "DOC-001",
        date: "2026-10-01",
      }),
    ]);

    const serialized = JSON.stringify(responses);

    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain(baseUser.passwordHash);
    expect(serialized).not.toContain(TEST_SECRET);
    expect(serialized).not.toContain(token);
  });
});
