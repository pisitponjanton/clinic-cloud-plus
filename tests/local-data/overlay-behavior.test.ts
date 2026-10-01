import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { POST as logout } from "@/app/api/auth/logout/route";
import { getAppointments } from "@/src/data-access/private";
import {
  getMergedBrowserAppointments,
  readBrowserLocalData,
  resetBrowserLocalData,
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import {
  LOCAL_DATA_STORAGE_KEY,
  createEmptyLocalDataOverlay,
  mergeAppointments,
  parseLocalDataOverlay,
  withAppointmentCreated,
  withAppointmentDeleted,
  withAppointmentUpdate,
} from "@/src/local-data/appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

const NOW = new Date("2026-10-01T07:00:00.000Z");

type MemoryStorage = BrowserStorageLike & {
  peek(key: string): string | null;
};

function memoryStorage(initial?: Record<string, string>): MemoryStorage {
  const values = new Map(Object.entries(initial ?? {}));

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    peek(key) {
      return values.get(key) ?? null;
    },
  };
}

function localAppointment(
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id: "APT-LOCAL-phase21",
    clinicId: "CLINIC-001",
    patientId: "PAT-001",
    doctorId: "DOC-001",
    serviceId: "SVC-001",
    date: "2026-10-02",
    time: "14:00",
    status: "SCHEDULED",
    note: "Phase 21 local appointment",
    ...overrides,
  };
}

describe("localStorage Base + Overlay behavior", () => {
  it("returns Base-only appointments when no overlay exists", () => {
    const storage = memoryStorage();
    const base = getAppointments();
    const result = getMergedBrowserAppointments(base, storage, NOW);

    expect(result.overlayRead.state).toBe("empty");
    expect(result.overlayRead.issues).toEqual([]);
    expect(result.appointments).toEqual(base);
    expect(result.appointments).not.toBe(base);
  });

  it("appends a locally created appointment without changing Base data", () => {
    const base = getAppointments();
    const baseSnapshot = structuredClone(base);
    const overlay = withAppointmentCreated(
      createEmptyLocalDataOverlay(NOW),
      localAppointment(),
      NOW,
    );

    const merged = mergeAppointments(base, overlay);

    expect(merged).toHaveLength(base.length + 1);
    expect(merged.at(-1)).toEqual(localAppointment());
    expect(base).toEqual(baseSnapshot);
    expect(getAppointments()).toEqual(baseSnapshot);
  });

  it("applies a Base appointment patch by ID without changing the Base record", () => {
    const base = getAppointments();
    const baseApt001 = base.find((record) => record.id === "APT-001");

    expect(baseApt001).toBeDefined();

    const overlay = withAppointmentUpdate(
      createEmptyLocalDataOverlay(NOW),
      "APT-001",
      {
        doctorId: "DOC-002",
        serviceId: "SVC-002",
        date: "2026-10-04",
        time: "15:30",
        note: "Locally updated appointment",
      },
      NOW,
    );

    const merged = mergeAppointments(base, overlay);
    const updated = merged.find((record) => record.id === "APT-001");

    expect(updated).toMatchObject({
      id: "APT-001",
      doctorId: "DOC-002",
      serviceId: "SVC-002",
      date: "2026-10-04",
      time: "15:30",
      note: "Locally updated appointment",
    });

    expect(baseApt001).toEqual(
      getAppointments().find((record) => record.id === "APT-001"),
    );
    expect(baseApt001?.note).toBe("A/B demo current appointment");
  });

  it("cancels a Base appointment by merging status=CANCELLED rather than deleting it", () => {
    const base = getAppointments();
    const overlay = withAppointmentUpdate(
      createEmptyLocalDataOverlay(NOW),
      "APT-001",
      { status: "CANCELLED" },
      NOW,
    );

    const merged = mergeAppointments(base, overlay);
    const cancelled = merged.find((record) => record.id === "APT-001");

    expect(cancelled).toBeDefined();
    expect(cancelled?.status).toBe("CANCELLED");
    expect(overlay.collections.appointments.deletedIds).toEqual([]);
  });

  it("removes a Base record only from the merged browser view when deletedIds is used", () => {
    const base = getAppointments();
    const overlay = withAppointmentDeleted(
      createEmptyLocalDataOverlay(NOW),
      "APT-002",
      NOW,
    );

    const merged = mergeAppointments(base, overlay);

    expect(merged.some((record) => record.id === "APT-002")).toBe(false);
    expect(getAppointments().some((record) => record.id === "APT-002")).toBe(
      true,
    );
  });

  it("recovers malformed JSON to Base-only state with a diagnostic", () => {
    const storage = memoryStorage({
      [LOCAL_DATA_STORAGE_KEY]: "{not-json",
    });

    const base = getAppointments();
    const result = getMergedBrowserAppointments(base, storage, NOW);

    expect(result.overlayRead.state).toBe("recovered");
    expect(result.overlayRead.issues).toEqual([
      expect.objectContaining({ code: "MALFORMED_JSON", path: "$" }),
    ]);
    expect(result.appointments).toEqual(base);
  });

  it("does not reinterpret an incompatible future schema", () => {
    const raw = JSON.stringify({
      schemaVersion: 2,
      clinicId: "CLINIC-001",
      updatedAt: NOW.toISOString(),
      collections: {
        appointments: {
          created: [localAppointment()],
          updated: {
            "APT-001": { status: "CANCELLED" },
          },
          deletedIds: ["APT-002"],
        },
      },
    });

    const parsed = parseLocalDataOverlay(raw, NOW);
    const merged = mergeAppointments(getAppointments(), parsed.overlay);

    expect(parsed.state).toBe("recovered");
    expect(parsed.issues).toEqual([
      expect.objectContaining({
        code: "INCOMPATIBLE_SCHEMA_VERSION",
        path: "$.schemaVersion",
      }),
    ]);
    expect(parsed.overlay.collections.appointments).toEqual({
      created: [],
      updated: {},
      deletedIds: [],
    });
    expect(merged).toEqual(getAppointments());
  });

  it("rejects an overlay for another clinic", () => {
    const parsed = parseLocalDataOverlay(
      JSON.stringify({
        schemaVersion: 1,
        clinicId: "CLINIC-999",
        updatedAt: NOW.toISOString(),
        collections: {
          appointments: {
            created: [localAppointment()],
            updated: {},
            deletedIds: [],
          },
        },
      }),
      NOW,
    );

    expect(parsed.state).toBe("recovered");
    expect(parsed.issues[0]).toMatchObject({ code: "WRONG_CLINIC" });
    expect(parsed.overlay.collections.appointments.created).toEqual([]);
  });

  it("salvages valid records while ignoring malformed created/update/deleted entries", () => {
    const parsed = parseLocalDataOverlay(
      JSON.stringify({
        schemaVersion: 1,
        clinicId: "CLINIC-001",
        updatedAt: NOW.toISOString(),
        collections: {
          appointments: {
            created: [
              localAppointment(),
              {
                ...localAppointment({ id: "BROKEN-ID" }),
              },
              localAppointment(),
            ],
            updated: {
              "APT-001": { status: "CANCELLED" },
              "APT-002": { status: "NOT_A_STATUS" },
              "BROKEN-ID": { note: "invalid appointment id" },
            },
            deletedIds: ["APT-003", "", "APT-003", "BROKEN-ID"],
          },
        },
      }),
      NOW,
    );

    expect(parsed.state).toBe("recovered");
    expect(parsed.overlay.collections.appointments.created).toEqual([
      localAppointment(),
    ]);
    expect(parsed.overlay.collections.appointments.updated).toEqual({
      "APT-001": { status: "CANCELLED" },
    });
    expect(parsed.overlay.collections.appointments.deletedIds).toEqual([
      "APT-003",
    ]);

    expect(parsed.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "INVALID_CREATED_APPOINTMENT",
        "DUPLICATE_CREATED_APPOINTMENT",
        "INVALID_UPDATE_PATCH",
        "INVALID_DELETED_ID",
      ]),
    );
  });

  it("falls back safely when browser storage read throws", () => {
    const storage: BrowserStorageLike = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {},
      removeItem() {},
    };

    const result = getMergedBrowserAppointments(
      getAppointments(),
      storage,
      NOW,
    );

    expect(result.overlayRead).toMatchObject({
      storageAvailable: true,
      state: "recovered",
      storageError: "READ_FAILED",
      issues: [],
    });
    expect(result.appointments).toEqual(getAppointments());
  });

  it("reports write/remove failures instead of claiming persistence", () => {
    const writeFailStorage: BrowserStorageLike = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {},
    };

    const removeFailStorage: BrowserStorageLike = {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(
      writeBrowserLocalData(
        createEmptyLocalDataOverlay(NOW),
        writeFailStorage,
        NOW,
      ),
    ).toMatchObject({
      ok: false,
      error: "WRITE_FAILED",
    });

    expect(resetBrowserLocalData(removeFailStorage)).toEqual({
      ok: false,
      error: "REMOVE_FAILED",
    });
  });

  it("reset removes only the Clinic Cloud overlay and restores Base-only merge", () => {
    const storage = memoryStorage();
    const unrelatedKey = "another-app:data";
    storage.setItem(unrelatedKey, "keep-me");

    const overlay = withAppointmentUpdate(
      createEmptyLocalDataOverlay(NOW),
      "APT-001",
      { status: "CANCELLED" },
      NOW,
    );

    expect(writeBrowserLocalData(overlay, storage, NOW).ok).toBe(true);
    expect(
      getMergedBrowserAppointments(getAppointments(), storage, NOW)
        .appointments.find((record) => record.id === "APT-001")?.status,
    ).toBe("CANCELLED");

    expect(resetBrowserLocalData(storage)).toEqual({ ok: true });

    expect(storage.peek(LOCAL_DATA_STORAGE_KEY)).toBeNull();
    expect(storage.peek(unrelatedKey)).toBe("keep-me");
    expect(
      getMergedBrowserAppointments(getAppointments(), storage, NOW)
        .appointments,
    ).toEqual(getAppointments());
  });

  it("logout expires only the auth cookie and leaves the browser overlay untouched", async () => {
    const storage = memoryStorage();
    const overlay = withAppointmentUpdate(
      createEmptyLocalDataOverlay(NOW),
      "APT-001",
      { status: "CANCELLED" },
      NOW,
    );

    writeBrowserLocalData(overlay, storage, NOW);
    const beforeLogout = storage.peek(LOCAL_DATA_STORAGE_KEY);

    const response = await logout(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(storage.peek(LOCAL_DATA_STORAGE_KEY)).toBe(beforeLogout);

    const afterLogout = readBrowserLocalData(storage, NOW);
    expect(afterLogout.overlay.collections.appointments.updated["APT-001"]).toEqual(
      { status: "CANCELLED" },
    );
  });

  it("does not contain runtime repository/filesystem write code in the overlay implementation", () => {
    const pureSource = readFileSync(
      "src/local-data/appointment-overlay.ts",
      "utf8",
    );
    const browserSource = readFileSync(
      "src/local-data/browser-appointment-overlay.ts",
      "utf8",
    );
    const combined = `${pureSource}\n${browserSource}`;

    expect(combined).not.toMatch(
      /writeFile|writeFileSync|appendFile|createWriteStream|fs\.write/,
    );
    expect(combined).not.toMatch(/src\/data\/private\/.*\.json/);
  });

  it("keeps window.localStorage access isolated to the client browser adapter", () => {
    const pureSource = readFileSync(
      "src/local-data/appointment-overlay.ts",
      "utf8",
    );
    const browserSource = readFileSync(
      "src/local-data/browser-appointment-overlay.ts",
      "utf8",
    );

    expect(pureSource).not.toContain("window");
    expect(pureSource).not.toContain("localStorage");
    expect(browserSource).toContain('"use client"');
    expect(browserSource).toContain("window.localStorage");
  });
});
