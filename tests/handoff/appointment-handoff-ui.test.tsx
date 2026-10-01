import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppointmentHandoffConfirmation } from "@/components/handoff/appointment-handoff-confirmation";
import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import {
  createAppointmentHandoffToken,
  type AppointmentHandoffAction,
} from "@/src/handoff/appointment-token";
import {
  resolveAppointmentHandoffForWeb,
  type AppointmentHandoffWebData,
} from "@/src/handoff/appointment-web";
import {
  LOCAL_DATA_STORAGE_KEY,
  parseLocalDataOverlay,
} from "@/src/local-data/appointment-overlay";

const SECRET =
  "phase-34-ui-handoff-secret-with-more-than-thirty-two-characters";
const NOW = new Date("2026-10-01T07:00:00.000Z");

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

function staffUser() {
  const record = authenticateDemoUser(
    "staff@cliniccloud.demo",
    "12345678",
  );

  if (!record) {
    throw new Error("Missing seeded staff account");
  }

  return toAuthUser(record);
}

function webData(action: AppointmentHandoffAction): AppointmentHandoffWebData {
  const staff = staffUser();
  const { token } = createAppointmentHandoffToken(
    staff,
    action,
    SECRET,
    NOW,
  );
  const resolution = resolveAppointmentHandoffForWeb(
    staff,
    token,
    SECRET,
    NOW,
  );

  if (!resolution.ok) {
    throw new Error(resolution.error.message);
  }

  return resolution.data;
}

async function confirmDefaultDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", {
      name: "Review and confirm",
    }),
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Confirm browser-local change",
    }),
  );
}

describe("prepared appointment Web confirmation UI", () => {
  it("does not write before create confirmation, writes after confirm, and blocks replay", async () => {
    const storage = new MemoryStorage();
    const user = userEvent.setup();
    const data = webData({
      type: "CREATE_APPOINTMENT",
      patientId: "PAT-001",
      doctorId: "DOC-001",
      serviceId: "SVC-001",
      date: "2026-10-08",
      time: "14:00",
      note: "Handoff create",
    });

    const rendered = render(
      <AppointmentHandoffConfirmation
        data={data}
        storage={storage}
      />,
    );

    expect(
      await screen.findByText("Review new appointment"),
    ).toBeInTheDocument();
    expect(storage.setItem).not.toHaveBeenCalled();

    await confirmDefaultDialog(user);

    expect(
      await screen.findByText("Confirmed in this browser"),
    ).toBeInTheDocument();
    expect(storage.setItem).toHaveBeenCalledTimes(1);

    const raw = storage.getItem(LOCAL_DATA_STORAGE_KEY);
    const parsed = parseLocalDataOverlay(raw, NOW);

    expect(parsed.overlay.collections.appointments.created).toEqual([
      expect.objectContaining({
        id: `APT-LOCAL-handoff-${data.handoffId}`,
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-08",
        time: "14:00",
      }),
    ]);

    rendered.unmount();

    render(
      <AppointmentHandoffConfirmation
        data={data}
        storage={storage}
      />,
    );

    expect(
      await screen.findByText("No additional write is required"),
    ).toBeInTheDocument();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("revalidates update against browser state and writes only after confirmation", async () => {
    const storage = new MemoryStorage();
    const user = userEvent.setup();
    const data = webData({
      type: "UPDATE_APPOINTMENT",
      appointmentId: "APT-003",
      patch: {
        time: "10:30",
        note: "Confirmed through handoff",
      },
    });

    render(
      <AppointmentHandoffConfirmation
        data={data}
        storage={storage}
      />,
    );

    expect(
      await screen.findByText("Review appointment changes"),
    ).toBeInTheDocument();
    expect(storage.setItem).not.toHaveBeenCalled();

    await confirmDefaultDialog(user);

    expect(
      await screen.findByText("Confirmed in this browser"),
    ).toBeInTheDocument();

    const parsed = parseLocalDataOverlay(
      storage.getItem(LOCAL_DATA_STORAGE_KEY),
      NOW,
    );

    expect(
      parsed.overlay.collections.appointments.updated["APT-003"],
    ).toMatchObject({
      time: "10:30",
      note: "Confirmed through handoff",
    });
  });

  it("requires destructive confirmation before writing CANCELLED", async () => {
    const storage = new MemoryStorage();
    const user = userEvent.setup();
    const data = webData({
      type: "CANCEL_APPOINTMENT",
      appointmentId: "APT-001",
    });

    render(
      <AppointmentHandoffConfirmation
        data={data}
        storage={storage}
      />,
    );

    expect(
      await screen.findByText("Review appointment cancellation"),
    ).toBeInTheDocument();
    expect(storage.setItem).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", {
        name: "Review cancellation",
      }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Confirm cancellation",
      }),
    );

    expect(
      await screen.findByText("Confirmed in this browser"),
    ).toBeInTheDocument();

    const parsed = parseLocalDataOverlay(
      storage.getItem(LOCAL_DATA_STORAGE_KEY),
      NOW,
    );

    expect(
      parsed.overlay.collections.appointments.updated["APT-001"],
    ).toMatchObject({
      status: "CANCELLED",
    });
  });
});
