import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DemoSettingsError from "@/app/(protected)/settings/demo/error";
import DemoSettingsLoading from "@/app/(protected)/settings/demo/loading";
import SettingsError from "@/app/(protected)/settings/error";
import SettingsLoading from "@/app/(protected)/settings/loading";
import { DemoResetPanel } from "@/components/settings/demo-reset-panel";
import { SettingsView } from "@/components/settings/settings-view";
import { toAuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getUserById } from "@/src/data-access/private";
import {
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import {
  LOCAL_DATA_STORAGE_KEY,
  createEmptyLocalDataOverlay,
  withAppointmentCreated,
  withAppointmentDeleted,
  withAppointmentUpdate,
} from "@/src/local-data/appointment-overlay";
import {
  assertCanResetDemo,
  getSettingsProjection,
} from "@/src/settings/projection";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

type MemoryStorage = BrowserStorageLike & {
  peek(key: string): string | null;
  removeCalls(): number;
};

function memoryStorage({
  failRemove = false,
}: {
  failRemove?: boolean;
} = {}): MemoryStorage {
  const values = new Map<string, string>();
  let removeCount = 0;

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      removeCount += 1;

      if (failRemove) {
        throw new Error("remove blocked");
      }

      values.delete(key);
    },
    peek(key) {
      return values.get(key) ?? null;
    },
    removeCalls() {
      return removeCount;
    },
  };
}

const owner = user("USR-OWNER-001");
const staff = user("USR-STAFF-001");
const patient = user("USR-PATIENT-001");

describe("settings authorization and projection", () => {
  it("builds OWNER settings from Base data and the versioned overlay contract", () => {
    const projection = getSettingsProjection(owner);

    expect(projection).toMatchObject({
      basePatients: 20,
      baseAppointments: 30,
      storageKey: "clinic-cloud-plus:CLINIC-001:data:v1",
      schemaVersion: 1,
    });
    expect(projection.clinic).toMatchObject({
      id: "CLINIC-001",
      name: "Clinic Cloud + Demo Clinic",
    });
  });

  it("rejects non-OWNER settings and demo-reset capabilities at the boundary", () => {
    expect(() => getSettingsProjection(staff)).toThrow(AuthorizationError);
    expect(() => getSettingsProjection(patient)).toThrow(AuthorizationError);
    expect(() => assertCanResetDemo(staff)).toThrow(AuthorizationError);
    expect(() => assertCanResetDemo(patient)).toThrow(AuthorizationError);
    expect(() => assertCanResetDemo(owner)).not.toThrow();
  });
});

describe("settings UI", () => {
  it("renders read-only clinic/base configuration and Demo Settings navigation", () => {
    render(<SettingsView projection={getSettingsProjection(owner)} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Clinic Cloud + Demo Clinic").length).toBeGreaterThan(0);
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(
      screen.getByText("clinic-cloud-plus:CLINIC-001:data:v1"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Demo settings" }),
    ).toHaveAttribute("href", "/settings/demo");
  });

  it("shows local debug counts, writes nothing before confirmation, and resets only the Clinic Cloud key", async () => {
    const actor = userEvent.setup();
    const storage = memoryStorage();
    storage.setItem("another-app:data", "keep-me");

    let overlay = createEmptyLocalDataOverlay(
      new Date("2026-10-01T08:00:00.000Z"),
    );
    overlay = withAppointmentCreated(
      overlay,
      {
        id: "APT-LOCAL-settings-test",
        clinicId: "CLINIC-001",
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-05",
        time: "10:00",
        status: "SCHEDULED",
        note: "Local create",
      },
      new Date("2026-10-01T08:01:00.000Z"),
    );
    overlay = withAppointmentUpdate(
      overlay,
      "APT-001",
      { note: "Local update" },
      new Date("2026-10-01T08:02:00.000Z"),
    );
    overlay = withAppointmentDeleted(
      overlay,
      "APT-002",
      new Date("2026-10-01T08:03:00.000Z"),
    );

    expect(
      writeBrowserLocalData(
        overlay,
        storage,
        new Date("2026-10-01T08:04:00.000Z"),
      ).ok,
    ).toBe(true);

    render(
      <DemoResetPanel
        basePatients={20}
        baseAppointments={30}
        storageKey={LOCAL_DATA_STORAGE_KEY}
        storage={storage}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Local Created Appointments").nextElementSibling).toHaveTextContent("1");
      expect(screen.getByText("Local Updated Appointments").nextElementSibling).toHaveTextContent("1");
      expect(screen.getByText("Local Deleted Records").nextElementSibling).toHaveTextContent("1");
    });

    expect(storage.removeCalls()).toBe(0);

    await actor.click(
      screen.getByRole("button", { name: "Reset Demo Data" }),
    );

    expect(storage.removeCalls()).toBe(0);
    expect(
      await screen.findByRole("heading", {
        name: "Reset browser demo data?",
      }),
    ).toBeInTheDocument();

    await actor.click(
      screen.getByRole("button", { name: "Reset demo data" }),
    );

    expect(storage.removeCalls()).toBe(1);
    expect(storage.peek(LOCAL_DATA_STORAGE_KEY)).toBeNull();
    expect(storage.peek("another-app:data")).toBe("keep-me");

    expect(
      await screen.findByText("Demo data reset"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you remain signed in/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Local Created Appointments").nextElementSibling).toHaveTextContent("0");
      expect(screen.getByText("Local Updated Appointments").nextElementSibling).toHaveTextContent("0");
      expect(screen.getByText("Local Deleted Records").nextElementSibling).toHaveTextContent("0");
    });
  });

  it("reports reset failure without claiming success", async () => {
    const actor = userEvent.setup();
    const storage = memoryStorage({ failRemove: true });

    render(
      <DemoResetPanel
        basePatients={20}
        baseAppointments={30}
        storageKey={LOCAL_DATA_STORAGE_KEY}
        storage={storage}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Reset Demo Data" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Reset demo data" }),
    );

    expect(
      await screen.findByText("Reset Demo Data failed"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Demo data reset")).not.toBeInTheDocument();
  });

  it("renders loading and retryable error states", async () => {
    const actor = userEvent.setup();
    const retry = vi.fn();

    const { rerender } = render(<SettingsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading settings");

    rerender(<DemoSettingsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading demo settings",
    );

    rerender(<SettingsError reset={retry} />);
    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<DemoSettingsError reset={retry} />);
    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(2);
  });
});
