import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import { getAppointments } from "@/src/data-access/private";
import { HANDOFF_SECRET_ENV } from "@/src/handoff/config";
import { STAFF_MCP_SECRET_ENV } from "@/src/mcp/staff/config";
import { handleStaffMcpRequest } from "@/src/mcp/staff/http";
import {
  STAFF_MCP_PREPARED_TOOL_NAMES,
  STAFF_MCP_READ_TOOL_NAMES,
} from "@/src/mcp/staff/server";
import { createStaffAccessToken } from "@/src/mcp/staff/tokens";

const TEST_SECRET =
  "phase-33-prepared-action-secret-with-more-than-thirty-two-characters";

function tokenFor(email: string): string {
  const record = authenticateDemoUser(email, "12345678");
  if (!record) throw new Error(`Missing seeded account: ${email}`);
  return createStaffAccessToken(
    toAuthUser(record),
    "phase-33-client",
    TEST_SECRET,
  );
}

async function rpc(
  token: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const response = await handleStaffMcpRequest(
    new Request("http://localhost/mcp/staff", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        host: "localhost",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }),
  );

  expect(response.status).toBe(200);
  const text = await response.text();

  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const line = text.split("\n").find((entry) => entry.startsWith("data:"));
    if (!line) throw new Error("Missing SSE data line");
    return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
  }

  return JSON.parse(text) as Record<string, unknown>;
}

async function callTool(
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return rpc(token, {
    jsonrpc: "2.0",
    id: 33,
    method: "tools/call",
    params: { name, arguments: args },
  });
}

function structured(response: Record<string, unknown>) {
  const result = response.result as
    | { structuredContent?: Record<string, unknown> }
    | undefined;
  if (!result?.structuredContent) {
    throw new Error(`Missing structuredContent: ${JSON.stringify(response)}`);
  }
  return result.structuredContent;
}

function expectPrepared(result: Record<string, unknown>) {
  expect(result).toMatchObject({
    ok: true,
    confirmationRequired: true,
    persistence: "web-localStorage",
    message: "Prepared only. Not yet saved.",
    source: "base-json",
    handoff: {
      url: expect.stringMatching(
        /^http:\/\/localhost\/handoff\/appointment\?token=/,
      ),
      expiresAt: expect.any(String),
    },
  });
  expect(JSON.stringify(result)).not.toContain('"persisted":true');
  expect(JSON.stringify(result)).not.toContain('"saved":true');
}

describe("Staff MCP Phase 33 prepared appointment actions", () => {
  beforeEach(() => {
    process.env[STAFF_MCP_SECRET_ENV] = TEST_SECRET;
    process.env[HANDOFF_SECRET_ENV] = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env[STAFF_MCP_SECRET_ENV];
    delete process.env[HANDOFF_SECRET_ENV];
  });

  it("publishes 8 read tools plus exactly 3 prepared tools", async () => {
    const response = await rpc(tokenFor("staff@cliniccloud.demo"), {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const result = response.result as { tools: Array<{ name: string }> };
    expect(result.tools.map((tool) => tool.name).sort()).toEqual(
      [...STAFF_MCP_READ_TOOL_NAMES, ...STAFF_MCP_PREPARED_TOOL_NAMES].sort(),
    );
    expect(result.tools).toHaveLength(11);
  });

  it("prepares create without creating or mutating Base appointments", async () => {
    const before = getAppointments();
    const result = structured(
      await callTool(tokenFor("staff@cliniccloud.demo"), "prepare_create_appointment", {
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-08",
        time: "14:00",
        note: "Prepared by AI demo",
      }),
    );

    expectPrepared(result);
    expect(result.action).toEqual({
      type: "CREATE_APPOINTMENT",
      patientId: "PAT-001",
      doctorId: "DOC-001",
      serviceId: "SVC-001",
      date: "2026-10-08",
      time: "14:00",
      note: "Prepared by AI demo",
    });
    expect(result.preview).toMatchObject({ status: "SCHEDULED" });
    expect(getAppointments()).toEqual(before);
  });

  it("rejects invalid create references instead of inventing them", async () => {
    const result = structured(
      await callTool(tokenFor("staff@cliniccloud.demo"), "prepare_create_appointment", {
        patientId: "PAT-NOT-FOUND",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-08",
        time: "14:00",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" },
    });
  });

  it("prepares update with current/proposed preview and no Base mutation", async () => {
    const before = getAppointments();
    const result = structured(
      await callTool(tokenFor("staff@cliniccloud.demo"), "prepare_update_appointment", {
        appointmentId: "APT-003",
        note: "Prepared note change",
        time: "10:30",
      }),
    );

    expectPrepared(result);
    expect(result.action).toEqual({
      type: "UPDATE_APPOINTMENT",
      appointmentId: "APT-003",
      patch: {
        time: "10:30",
        note: "Prepared note change",
      },
    });
    expect(result.preview).toMatchObject({
      current: { id: "APT-003", time: "10:00" },
      proposed: { id: "APT-003", time: "10:30", note: "Prepared note change" },
    });
    expect(getAppointments()).toEqual(before);
  });

  it("rejects update when no actual value changes", async () => {
    const result = structured(
      await callTool(tokenFor("staff@cliniccloud.demo"), "prepare_update_appointment", {
        appointmentId: "APT-003",
        note: "A/B demo future appointment",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST" },
    });
  });

  it("enforces DOCTOR relevance when preparing update", async () => {
    const result = structured(
      await callTool(tokenFor("doctor@cliniccloud.demo"), "prepare_update_appointment", {
        appointmentId: "APT-002",
        note: "Should not be allowed",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("prepares cancellation as CANCELLED preview without changing Base status", async () => {
    const before = getAppointments();
    const result = structured(
      await callTool(tokenFor("staff@cliniccloud.demo"), "prepare_cancel_appointment", {
        appointmentId: "APT-001",
      }),
    );

    expectPrepared(result);
    expect(result.action).toEqual({
      type: "CANCEL_APPOINTMENT",
      appointmentId: "APT-001",
    });
    expect(result.preview).toMatchObject({
      currentStatus: "CHECKED_IN",
      nextStatus: "CANCELLED",
    });
    expect(getAppointments()).toEqual(before);
  });

  it("rejects cancellation for an already-cancelled Base appointment", async () => {
    const result = structured(
      await callTool(tokenFor("staff@cliniccloud.demo"), "prepare_cancel_appointment", {
        appointmentId: "APT-012",
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Appointment is already CANCELLED in the Base Dataset.",
      },
    });
  });

  it("strict prepared schemas reject role elevation arguments", async () => {
    for (const [name, args] of [
      ["prepare_create_appointment", {
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-08",
        time: "14:00",
        role: "OWNER",
      }],
      ["prepare_update_appointment", {
        appointmentId: "APT-003",
        note: "x",
        role: "OWNER",
      }],
      ["prepare_cancel_appointment", {
        appointmentId: "APT-001",
        role: "OWNER",
      }],
    ] as Array<[string, Record<string, unknown>]>) {
      const response = await callTool(tokenFor("doctor@cliniccloud.demo"), name, args);
      const result = response.result as { isError?: boolean } | undefined;
      expect(response.error !== undefined || result?.isError === true).toBe(true);
    }
  });
});
