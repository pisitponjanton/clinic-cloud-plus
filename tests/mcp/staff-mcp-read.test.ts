import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import {
  STAFF_MCP_SECRET_ENV,
} from "@/src/mcp/staff/config";
import { handleStaffMcpRequest } from "@/src/mcp/staff/http";
import { STAFF_MCP_READ_TOOL_NAMES } from "@/src/mcp/staff/server";
import { createStaffAccessToken } from "@/src/mcp/staff/tokens";

const TEST_SECRET =
  "phase-31-staff-read-secret-with-more-than-thirty-two-characters";

function tokenFor(email: string): string {
  const record = authenticateDemoUser(email, "12345678");

  if (!record) {
    throw new Error(`Missing seeded account: ${email}`);
  }

  return createStaffAccessToken(
    toAuthUser(record),
    "phase-31-read-client",
    TEST_SECRET,
  );
}

function rpcRequest(
  token: string,
  body: unknown,
): Request {
  return new Request("http://localhost/mcp/staff", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "localhost",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function rpc(
  token: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const response = await handleStaffMcpRequest(
    rpcRequest(token, body),
  );

  expect(response.status).toBe(200);

  const text = await response.text();

  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const line = text
      .split("\n")
      .find((entry) => entry.startsWith("data:"));

    if (!line) {
      throw new Error("Missing SSE data line");
    }

    return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
  }

  return JSON.parse(text) as Record<string, unknown>;
}

async function callTool(
  token: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  return rpc(token, {
    jsonrpc: "2.0",
    id: 31,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  });
}

function structured(
  response: Record<string, unknown>,
): Record<string, unknown> {
  const result = response.result as
    | {
        structuredContent?: Record<string, unknown>;
      }
    | undefined;

  if (!result?.structuredContent) {
    throw new Error(
      `Missing structuredContent: ${JSON.stringify(response)}`,
    );
  }

  return result.structuredContent;
}

describe("Staff MCP Phase 31 read tools", () => {
  beforeEach(() => {
    process.env[STAFF_MCP_SECRET_ENV] = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env[STAFF_MCP_SECRET_ENV];
  });

  it("keeps all eight required read tools available after later Staff MCP phases", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const response = await rpc(token, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response.result as {
      tools: Array<{ name: string }>;
    };

    const publishedNames = result.tools.map((tool) => tool.name);

    expect(
      STAFF_MCP_READ_TOOL_NAMES.every((name) => publishedNames.includes(name)),
    ).toBe(true);
    expect(STAFF_MCP_READ_TOOL_NAMES).toHaveLength(8);
  });

  it("returns trusted staff context without credentials or bearer-token material", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const response = structured(
      await callTool(token, "get_staff_context"),
    );

    expect(response).toMatchObject({
      ok: true,
      source: "base-json",
      data: {
        userId: "USR-STAFF-001",
        role: "STAFF",
        clinicId: "CLINIC-001",
        linkedDoctorId: null,
      },
    });

    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain(TEST_SECRET);
    expect(serialized).not.toContain(token);
  });

  it("searches authorized Base patients and returns a minimal search projection", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const response = structured(
      await callTool(token, "search_patient", {
        query: "HN000001",
      }),
    );

    expect(response).toEqual({
      ok: true,
      source: "base-json",
      data: [
        {
          id: "PAT-001",
          hn: "HN000001",
          firstName: "สมชาย",
          lastName: "ใจดี",
        },
      ],
    });
  });

  it("returns Base patient summary and explicit NOT_FOUND semantics", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const found = structured(
      await callTool(token, "get_patient_summary", {
        patientId: "PAT-001",
      }),
    );

    expect(found).toMatchObject({
      ok: true,
      source: "base-json",
      data: {
        patient: {
          id: "PAT-001",
          hn: "HN000001",
        },
      },
    });

    const missing = structured(
      await callTool(token, "get_patient_summary", {
        patientId: "PAT-NOT-FOUND",
      }),
    );

    expect(missing).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Patient not found in the Base Dataset.",
      },
    });
  });

  it("returns stored patient history with limit and no generated interpretation fields", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const response = structured(
      await callTool(token, "get_patient_history", {
        patientId: "PAT-001",
        limit: 1,
      }),
    );

    const data = response.data as Array<Record<string, unknown>>;

    expect(response.ok).toBe(true);
    expect(response.source).toBe("base-json");
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty("summary");
    expect(data[0]).not.toHaveProperty("diagnosis");
    expect(data[0]).not.toHaveProperty("interpretation");
  });

  it("returns Base patient appointments and explicit-date appointments", async () => {
    const token = tokenFor("staff@cliniccloud.demo");

    const patientAppointments = structured(
      await callTool(token, "get_patient_appointments", {
        patientId: "PAT-001",
      }),
    );
    const own = patientAppointments.data as Array<{
      patientId: string;
    }>;

    expect(patientAppointments.ok).toBe(true);
    expect(own.length).toBeGreaterThan(0);
    expect(
      own.every((appointment) => appointment.patientId === "PAT-001"),
    ).toBe(true);

    const today = structured(
      await callTool(token, "get_today_appointments", {
        date: "2026-10-01",
      }),
    );
    const dated = today.data as Array<{ date: string }>;

    expect(today.ok).toBe(true);
    expect(dated.length).toBeGreaterThan(0);
    expect(
      dated.every((appointment) => appointment.date === "2026-10-01"),
    ).toBe(true);
  });

  it("returns authorized Base Queue records with deterministic filters", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const response = structured(
      await callTool(token, "get_queue", {
        date: "2026-10-01",
        doctorId: "DOC-001",
      }),
    );
    const data = response.data as Array<{
      date: string;
      doctorId: string | null;
    }>;

    expect(response.ok).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every(
        (entry) =>
          entry.date === "2026-10-01" &&
          entry.doctorId === "DOC-001",
      ),
    ).toBe(true);
  });

  it("returns a doctor schedule from Base appointments", async () => {
    const token = tokenFor("staff@cliniccloud.demo");
    const response = structured(
      await callTool(token, "get_doctor_schedule", {
        doctorId: "DOC-001",
        date: "2026-10-01",
      }),
    );
    const data = response.data as {
      doctor: { id: string };
      date: string;
      appointments: Array<{
        doctorId: string | null;
        date: string;
      }>;
    };

    expect(response.ok).toBe(true);
    expect(data.doctor.id).toBe("DOC-001");
    expect(data.date).toBe("2026-10-01");
    expect(
      data.appointments.every(
        (appointment) =>
          appointment.doctorId === "DOC-001" &&
          appointment.date === "2026-10-01",
      ),
    ).toBe(true);
  });

  it("limits a DOCTOR schedule request to the authenticated linked doctor", async () => {
    const token = tokenFor("doctor@cliniccloud.demo");
    const response = structured(
      await callTool(token, "get_doctor_schedule", {
        doctorId: "DOC-002",
        date: "2026-10-01",
      }),
    );

    expect(response).toEqual({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message:
          "Doctor accounts may read only their own Staff MCP schedule.",
      },
    });
  });
});
