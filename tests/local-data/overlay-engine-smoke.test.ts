import { describe, expect, it } from "vitest";

import {
  getMergedBrowserAppointments,
  readBrowserLocalData,
  resetBrowserLocalData,
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import {
  LOCAL_DATA_CLINIC_ID,
  LOCAL_DATA_SCHEMA_VERSION,
  LOCAL_DATA_STORAGE_KEY,
  createEmptyLocalDataOverlay,
  mergeAppointments,
  withAppointmentCreated,
  withAppointmentDeleted,
  withAppointmentUpdate,
} from "@/src/local-data/appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

const NOW = new Date("2026-10-01T06:00:00.000Z");

const base: Appointment[] = [
  {
    id: "APT-001",
    clinicId: "CLINIC-001",
    patientId: "PAT-001",
    doctorId: "DOC-001",
    serviceId: "SVC-001",
    date: "2026-10-01",
    time: "09:30",
    status: "CONFIRMED",
    note: "Base appointment",
  },
  {
    id: "APT-002",
    clinicId: "CLINIC-001",
    patientId: "PAT-002",
    doctorId: "DOC-002",
    serviceId: "SVC-002",
    date: "2026-10-01",
    time: "10:00",
    status: "SCHEDULED",
    note: "Base appointment two",
  },
];

function memoryStorage(): BrowserStorageLike {
  const values = new Map<string, string>();

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
  };
}

describe("appointment overlay engine smoke", () => {
  it("uses the namespaced versioned Clinic Cloud local-data contract", () => {
    const overlay = createEmptyLocalDataOverlay(NOW);

    expect(LOCAL_DATA_SCHEMA_VERSION).toBe(1);
    expect(LOCAL_DATA_CLINIC_ID).toBe("CLINIC-001");
    expect(LOCAL_DATA_STORAGE_KEY).toBe(
      "clinic-cloud-plus:CLINIC-001:data:v1",
    );
    expect(overlay).toEqual({
      schemaVersion: 1,
      clinicId: "CLINIC-001",
      updatedAt: NOW.toISOString(),
      collections: {
        appointments: {
          created: [],
          updated: {},
          deletedIds: [],
        },
      },
    });
  });

  it("merges base update, base deletion, and local creation without mutating base", () => {
    const originalBase = structuredClone(base);
    let overlay = createEmptyLocalDataOverlay(NOW);

    overlay = withAppointmentUpdate(
      overlay,
      "APT-001",
      {
        status: "CHECKED_IN",
        note: "Local update",
      },
      NOW,
    );

    overlay = withAppointmentDeleted(overlay, "APT-002", NOW);

    overlay = withAppointmentCreated(
      overlay,
      {
        id: "APT-LOCAL-demo",
        clinicId: "CLINIC-001",
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-003",
        date: "2026-10-02",
        time: "11:00",
        status: "SCHEDULED",
        note: "Local appointment",
      },
      NOW,
    );

    expect(mergeAppointments(base, overlay)).toEqual([
      {
        ...base[0],
        status: "CHECKED_IN",
        note: "Local update",
      },
      {
        id: "APT-LOCAL-demo",
        clinicId: "CLINIC-001",
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-003",
        date: "2026-10-02",
        time: "11:00",
        status: "SCHEDULED",
        note: "Local appointment",
      },
    ]);

    expect(base).toEqual(originalBase);
  });

  it("persists and reads the overlay only through the namespaced browser key", () => {
    const storage = memoryStorage();
    const overlay = withAppointmentUpdate(
      createEmptyLocalDataOverlay(NOW),
      "APT-001",
      { status: "CANCELLED" },
      NOW,
    );

    const written = writeBrowserLocalData(overlay, storage, NOW);
    const read = readBrowserLocalData(storage, NOW);
    const merged = getMergedBrowserAppointments(base, storage, NOW);

    expect(written.ok).toBe(true);
    expect(read.state).toBe("valid");
    expect(read.overlay.collections.appointments.updated["APT-001"]).toEqual({
      status: "CANCELLED",
    });
    expect(merged.appointments[0]?.status).toBe("CANCELLED");

    expect(resetBrowserLocalData(storage)).toEqual({ ok: true });
    expect(readBrowserLocalData(storage, NOW).state).toBe("empty");
  });

  it("updates locally created appointments inside created instead of base patches", () => {
    let overlay = withAppointmentCreated(
      createEmptyLocalDataOverlay(NOW),
      {
        id: "APT-LOCAL-editable",
        clinicId: "CLINIC-001",
        patientId: "PAT-001",
        doctorId: null,
        serviceId: "SVC-001",
        date: "2026-10-03",
        time: "13:00",
        status: "SCHEDULED",
        note: "",
      },
      NOW,
    );

    overlay = withAppointmentUpdate(
      overlay,
      "APT-LOCAL-editable",
      {
        doctorId: "DOC-001",
        status: "CONFIRMED",
      },
      NOW,
    );

    expect(overlay.collections.appointments.updated).toEqual({});
    expect(overlay.collections.appointments.created[0]).toMatchObject({
      id: "APT-LOCAL-editable",
      doctorId: "DOC-001",
      status: "CONFIRMED",
    });
  });
});
