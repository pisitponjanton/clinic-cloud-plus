import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { CreateAppointmentForm } from "@/components/appointments/create-appointment-form";
import { AppointmentHandoffConfirmation } from "@/components/handoff/appointment-handoff-confirmation";
import {
  authenticateDemoUser,
  resolveSessionUser,
  toAuthUser,
} from "@/src/auth/user";
import { createSessionToken } from "@/src/auth/session-token";
import { getCreateAppointmentPageData } from "@/src/appointments/create-options";
import { getAppointments } from "@/src/data-access/private";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getPatientDetailProjection } from "@/src/patients/detail-projection";
import { getPatientListProjection } from "@/src/patients/list-projection";
import { HANDOFF_SECRET_ENV } from "@/src/handoff/config";
import { resolveAppointmentHandoffForWeb } from "@/src/handoff/appointment-web";
import {
  LOCAL_DATA_STORAGE_KEY,
  parseLocalDataOverlay,
} from "@/src/local-data/appointment-overlay";
import { STAFF_MCP_SECRET_ENV } from "@/src/mcp/staff/config";
import { handleStaffMcpRequest } from "@/src/mcp/staff/http";
import { createStaffAccessToken } from "@/src/mcp/staff/tokens";
import type { Appointment } from "@/src/types/private-data";

const STAFF_SECRET =
  "phase-35-staff-secret-with-more-than-thirty-two-characters";
const HANDOFF_SECRET =
  "phase-35-handoff-secret-with-more-than-thirty-two-characters";
const SESSION_SECRET =
  "phase-35-session-secret-with-more-than-thirty-two-characters";
const STANDARD_NOW = new Date();

const TARGET = {
  patientId: "PAT-001",
  doctorId: "DOC-001",
  serviceId: "SVC-001",
  date: "2026-10-08",
  time: "14:00",
  note: "A/B primary workflow",
} as const;

class MemoryStorage {
  private values = new Map<string, string>();

  getItem = vi.fn((key: string) => this.values.get(key) ?? null);
  setItem = vi.fn((key: string, value: string) => {
    this.values.set(key, value);
  });
  removeItem = vi.fn((key: string) => {
    this.values.delete(key);
  });
}

function seededUser(email: string) {
  const record = authenticateDemoUser(email, "12345678");

  if (!record) {
    throw new Error(`Missing seeded account: ${email}`);
  }

  return record;
}

function standardizedWebUser(email = "staff@cliniccloud.demo") {
  const record = seededUser(email);
  const token = createSessionToken(record, SESSION_SECRET, {
    now: STANDARD_NOW,
    ttlSeconds: 60 * 60,
  });
  const user = resolveSessionUser(token, SESSION_SECRET, STANDARD_NOW);

  if (!user) {
    throw new Error("Failed to resolve standardized Web session");
  }

  return user;
}

function staffBearer(email = "staff@cliniccloud.demo") {
  return createStaffAccessToken(
    toAuthUser(seededUser(email)),
    "phase-35-integration-client",
    STAFF_SECRET,
    STANDARD_NOW,
  );
}

async function rpc(
  bearer: string,
  name: string,
  args: Record<string, unknown>,
) {
  const response = await handleStaffMcpRequest(
    new Request("http://localhost/mcp/staff", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        host: "localhost",
        authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 35,
        method: "tools/call",
        params: {
          name,
          arguments: args,
        },
      }),
    }),
  );

  expect(response.status).toBe(200);

  const text = await response.text();
  const payload = response.headers
    .get("content-type")
    ?.includes("text/event-stream")
    ? JSON.parse(
        text
          .split("\n")
          .find((line) => line.startsWith("data:"))
          ?.slice(5)
          .trim() ?? "{}",
      )
    : JSON.parse(text);

  const result = payload.result as
    | {
        structuredContent?: Record<string, unknown>;
      }
    | undefined;

  if (!result?.structuredContent) {
    throw new Error(
      `Missing structuredContent: ${JSON.stringify(payload)}`,
    );
  }

  return result.structuredContent;
}

function createdAppointment(storage: MemoryStorage): Appointment {
  const parsed = parseLocalDataOverlay(
    storage.getItem(LOCAL_DATA_STORAGE_KEY),
    STANDARD_NOW,
  );
  const appointment =
    parsed.overlay.collections.appointments.created[0];

  if (!appointment) {
    throw new Error("Expected one created browser-local appointment");
  }

  return appointment;
}

function businessFields(appointment: Appointment) {
  return {
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    serviceId: appointment.serviceId,
    date: appointment.date,
    time: appointment.time,
    note: appointment.note,
    status: appointment.status,
  };
}

async function runWebOnlyCreate(
  webUser: ReturnType<typeof standardizedWebUser>,
  storage: MemoryStorage,
) {
  const pageData = getCreateAppointmentPageData(webUser);
  const actor = userEvent.setup();

  render(
    <CreateAppointmentForm
      options={pageData.options}
      baseAppointments={pageData.baseAppointments}
      storage={storage}
      idFactory={() => "APT-LOCAL-web-primary-flow"}
      initialDraft={TARGET}
    />,
  );

  expect(storage.setItem).not.toHaveBeenCalled();

  await actor.click(
    screen.getByRole("button", { name: "Review appointment" }),
  );
  expect(storage.setItem).not.toHaveBeenCalled();

  await actor.click(
    screen.getByRole("button", { name: "Confirm & create" }),
  );
  await actor.click(
    await screen.findByRole("button", {
      name: "Create appointment",
    }),
  );

  expect(
    await screen.findByText("Appointment created in this browser"),
  ).toBeInTheDocument();
  expect(storage.setItem).toHaveBeenCalledTimes(1);

  return createdAppointment(storage);
}

async function runAiMcpCreate(
  webUser: ReturnType<typeof standardizedWebUser>,
  storage: MemoryStorage,
) {
  const bearer = staffBearer();

  const search = await rpc(bearer, "search_patient", {
    query: "HN000001",
  });
  expect(search).toEqual({
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

  const summary = await rpc(bearer, "get_patient_summary", {
    patientId: "PAT-001",
  });

  expect(summary).toMatchObject({
    ok: true,
    source: "base-json",
    data: {
      patient: {
        id: "PAT-001",
        hn: "HN000001",
      },
    },
  });

  const prepared = await rpc(
    bearer,
    "prepare_create_appointment",
    TARGET,
  );

  expect(prepared).toMatchObject({
    ok: true,
    confirmationRequired: true,
    persistence: "web-localStorage",
    message: "Prepared only. Not yet saved.",
    action: {
      type: "CREATE_APPOINTMENT",
      ...TARGET,
    },
    handoff: {
      url: expect.stringContaining(
        "http://localhost/handoff/appointment?token=",
      ),
    },
  });
  expect(storage.setItem).not.toHaveBeenCalled();

  const handoffUrl = new URL(
    (prepared.handoff as { url: string }).url,
  );
  const token = handoffUrl.searchParams.get("token");

  if (!token) {
    throw new Error("Prepared action did not provide a handoff token");
  }

  const resolution = resolveAppointmentHandoffForWeb(
    webUser,
    token,
    HANDOFF_SECRET,
    STANDARD_NOW,
  );

  if (!resolution.ok) {
    throw new Error(resolution.error.message);
  }

  const actor = userEvent.setup();

  render(
    <AppointmentHandoffConfirmation
      data={resolution.data}
      storage={storage}
    />,
  );

  expect(
    await screen.findByText("Review new appointment"),
  ).toBeInTheDocument();
  expect(storage.setItem).not.toHaveBeenCalled();

  await actor.click(
    screen.getByRole("button", {
      name: "Review and confirm",
    }),
  );
  expect(storage.setItem).not.toHaveBeenCalled();

  await actor.click(
    await screen.findByRole("button", {
      name: "Confirm browser-local change",
    }),
  );

  expect(
    await screen.findByText("Confirmed in this browser"),
  ).toBeInTheDocument();
  expect(storage.setItem).toHaveBeenCalledTimes(1);

  return {
    appointment: createdAppointment(storage),
    summary,
  };
}

describe("Phase 35 primary workflow integration", () => {
  beforeEach(() => {
    process.env[STAFF_MCP_SECRET_ENV] = STAFF_SECRET;
    process.env[HANDOFF_SECRET_ENV] = HANDOFF_SECRET;
  });

  afterEach(() => {
    delete process.env[STAFF_MCP_SECRET_ENV];
    delete process.env[HANDOFF_SECRET_ENV];
  });

  it("runs equivalent Web-only and AI + Staff MCP flows on the same seeded scenario", async () => {
    const webUser = standardizedWebUser();
    const baseBefore = getAppointments();

    const webSearch = getPatientListProjection(
      webUser,
      "HN000001",
    );
    expect(webSearch.items).toEqual([
      expect.objectContaining({
        id: "PAT-001",
        hn: "HN000001",
        fullName: "สมชาย ใจดี",
      }),
    ]);

    const webContext = getPatientDetailProjection(
      webUser,
      "PAT-001",
    );

    expect(webContext).not.toBeNull();
    expect(webContext?.patient).toMatchObject({
      id: "PAT-001",
      hn: "HN000001",
    });
    expect(webContext?.appointments.length).toBeGreaterThan(0);
    expect(webContext?.history.length).toBeGreaterThan(0);

    const webStorage = new MemoryStorage();
    const webAppointment = await runWebOnlyCreate(
      webUser,
      webStorage,
    );

    cleanup();

    const aiStorage = new MemoryStorage();
    const aiFlow = await runAiMcpCreate(webUser, aiStorage);

    expect(
      (aiFlow.summary.data as {
        patient: { id: string; hn: string };
        nextAppointment: Appointment | null;
      }).patient,
    ).toMatchObject({
      id: webContext?.patient.id,
      hn: webContext?.patient.hn,
    });

    const nextAppointment = (
      aiFlow.summary.data as {
        nextAppointment: Appointment | null;
      }
    ).nextAppointment;

    if (nextAppointment) {
      expect(
        webContext?.appointments.some(
          (appointment) =>
            appointment.id === nextAppointment.id &&
            appointment.date === nextAppointment.date &&
            appointment.time === nextAppointment.time,
        ),
      ).toBe(true);
    }

    expect(businessFields(webAppointment)).toEqual({
      ...TARGET,
      status: "SCHEDULED",
    });
    expect(businessFields(aiFlow.appointment)).toEqual(
      businessFields(webAppointment),
    );

    expect(webAppointment.id).toBe(
      "APT-LOCAL-web-primary-flow",
    );
    expect(aiFlow.appointment.id).toMatch(
      /^APT-LOCAL-handoff-/,
    );

    expect(getAppointments()).toEqual(baseBefore);

    const mcpAfterConfirm = await rpc(
      staffBearer(),
      "get_patient_appointments",
      { patientId: "PAT-001" },
    );
    const mcpAppointments = mcpAfterConfirm.data as Appointment[];

    expect(
      mcpAppointments.every(
        (appointment) => !appointment.id.startsWith("APT-LOCAL-"),
      ),
    ).toBe(true);
    expect(
      mcpAppointments.map((appointment) => appointment.id).sort(),
    ).toEqual(
      baseBefore
        .filter((appointment) => appointment.patientId === "PAT-001")
        .map((appointment) => appointment.id)
        .sort(),
    );
  });

  it("returns empty/not-found results instead of inventing missing clinic records", async () => {
    const webUser = standardizedWebUser();
    const bearer = staffBearer();

    expect(
      getPatientListProjection(
        webUser,
        "definitely-not-a-real-patient",
      ).items,
    ).toEqual([]);

    expect(
      await rpc(bearer, "search_patient", {
        query: "definitely-not-a-real-patient",
      }),
    ).toEqual({
      ok: true,
      source: "base-json",
      data: [],
    });

    expect(
      await rpc(bearer, "get_patient_summary", {
        patientId: "PAT-NOT-FOUND",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Patient not found in the Base Dataset.",
      },
    });

    expect(
      await rpc(bearer, "prepare_update_appointment", {
        appointmentId: "APT-NOT-FOUND",
        note: "Do not invent this appointment",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Appointment not found in the Base Dataset.",
      },
    });
  });

  it("keeps patient-role isolation at both Web and Staff MCP boundaries", () => {
    const patientWebUser = standardizedWebUser(
      "patient@cliniccloud.demo",
    );

    expect(() =>
      getPatientListProjection(patientWebUser, "HN000001"),
    ).toThrow(AuthorizationError);

    expect(() =>
      createStaffAccessToken(
        patientWebUser,
        "phase-35-integration-client",
        STAFF_SECRET,
        STANDARD_NOW,
      ),
    ).toThrow(
      "Staff MCP access requires a personnel identity",
    );
  });
});
