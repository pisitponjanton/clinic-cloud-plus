import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppointmentMutationPanel } from "@/components/appointments/appointment-mutation-panel";
import { getAppointmentMutationPageData } from "@/src/appointments/mutation-options";
import {
  draftFromAppointment,
  validateUpdateAppointmentDraft,
} from "@/src/appointments/update-contract";
import { toAuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getUserById } from "@/src/data-access/private";
import {
  readBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

function trackedStorage({
  failWrite = false,
}: {
  failWrite?: boolean;
} = {}): BrowserStorageLike & { writes: () => number } {
  const values = new Map<string, string>();
  let count = 0;

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      count += 1;

      if (failWrite) {
        throw new Error("blocked");
      }

      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    writes() {
      return count;
    },
  };
}

const baseAppointment: Appointment = {
  id: "APT-001",
  clinicId: "CLINIC-001",
  patientId: "PAT-001",
  doctorId: "DOC-001",
  serviceId: "SVC-001",
  date: "2026-10-01",
  time: "09:30",
  status: "CHECKED_IN",
  note: "A/B demo current appointment",
};

const options = {
  doctors: [
    {
      value: "DOC-001",
      label: "นพ. สาธิต เมตตา",
      description: "General Practice",
    },
    {
      value: "DOC-002",
      label: "พญ. ตัวอย่าง สุขใจ",
      description: "Internal Medicine",
    },
  ],
  services: [
    {
      value: "SVC-001",
      label: "ตรวจทั่วไป",
      description: "30 min · ฿500",
    },
    {
      value: "SVC-002",
      label: "ตรวจอายุรกรรม",
      description: "30 min · ฿700",
    },
  ],
};

describe("appointment update contract", () => {
  it("returns only changed fields with current vs new values", () => {
    const result = validateUpdateAppointmentDraft(
      baseAppointment,
      {
        ...draftFromAppointment(baseAppointment),
        serviceId: "SVC-002",
        time: "10:45",
        note: "Updated note",
      },
      options,
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected valid update");
    }

    expect(result.preview.patch).toEqual({
      serviceId: "SVC-002",
      time: "10:45",
      note: "Updated note",
    });
    expect(result.preview.changes).toEqual([
      expect.objectContaining({
        label: "Service",
        currentValue: "ตรวจทั่วไป",
        newValue: "ตรวจอายุรกรรม",
      }),
      expect.objectContaining({
        label: "Time",
        currentValue: "09:30",
        newValue: "10:45",
      }),
      expect.objectContaining({
        label: "Note",
        currentValue: "A/B demo current appointment",
        newValue: "Updated note",
      }),
    ]);
  });

  it("rejects no-op and out-of-scope doctor/service updates", () => {
    const noChange = validateUpdateAppointmentDraft(
      baseAppointment,
      draftFromAppointment(baseAppointment),
      options,
    );
    const invalid = validateUpdateAppointmentDraft(
      baseAppointment,
      {
        ...draftFromAppointment(baseAppointment),
        doctorId: "DOC-999",
        serviceId: "SVC-999",
      },
      options,
    );

    expect(noChange).toEqual({
      ok: false,
      errors: { form: "ยังไม่มีข้อมูลที่เปลี่ยนแปลง" },
    });
    expect(invalid.ok).toBe(false);

    if (invalid.ok) {
      throw new Error("Expected invalid references");
    }

    expect(invalid.errors.doctorId).toBeDefined();
    expect(invalid.errors.serviceId).toBeDefined();
  });
});

describe("appointment mutation role boundary", () => {
  it("limits DOCTOR mutation options and appointment scope", () => {
    const data = getAppointmentMutationPageData(
      user("USR-DOCTOR-001"),
      "APT-001",
    );

    expect(data).not.toBeNull();
    expect(data?.options.doctors).toEqual([
      expect.objectContaining({ value: "DOC-001" }),
    ]);
    expect(
      data?.baseAppointments.every(
        (appointment) => appointment.doctorId === "DOC-001",
      ),
    ).toBe(true);
  });

  it("rejects an unrelated DOCTOR appointment and PATIENT mutation", () => {
    expect(() =>
      getAppointmentMutationPageData(user("USR-DOCTOR-001"), "APT-004"),
    ).toThrow(AuthorizationError);

    expect(() =>
      getAppointmentMutationPageData(user("USR-PATIENT-001"), "APT-001"),
    ).toThrow(AuthorizationError);
  });
});

describe("appointment mutation confirmation flow", () => {
  it("writes update only after confirmation and refreshes effective state", async () => {
    const actor = userEvent.setup();
    const storage = trackedStorage();

    render(
      <AppointmentMutationPanel
        baseAppointment={baseAppointment}
        baseAppointments={[baseAppointment]}
        options={options}
        storage={storage}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Edit appointment" }),
    );

    const note = screen.getByRole("textbox", { name: "Note" });
    await actor.clear(note);
    await actor.type(note, "Updated in browser");

    await actor.click(
      screen.getByRole("button", { name: "Review changes" }),
    );

    expect(storage.writes()).toBe(0);
    expect(screen.getAllByText("A/B demo current appointment").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Updated in browser").length).toBeGreaterThan(0);

    await actor.click(
      screen.getByRole("button", { name: "Confirm update" }),
    );
    expect(storage.writes()).toBe(0);

    await actor.click(
      screen.getByRole("button", { name: "Update appointment" }),
    );

    expect(storage.writes()).toBe(1);
    expect(
      await screen.findByText("Appointment updated in this browser"),
    ).toBeInTheDocument();
    expect(screen.getByText("Updated in browser")).toBeInTheDocument();

    expect(
      readBrowserLocalData(storage).overlay.collections.appointments.updated[
        "APT-001"
      ],
    ).toEqual({
      note: "Updated in browser",
    });
  });

  it("cancels by status patch only after destructive confirmation", async () => {
    const actor = userEvent.setup();
    const storage = trackedStorage();

    render(
      <AppointmentMutationPanel
        baseAppointment={baseAppointment}
        baseAppointments={[baseAppointment]}
        options={options}
        storage={storage}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Cancel appointment" }),
    );

    expect(storage.writes()).toBe(0);
    expect(
      await screen.findByRole("heading", {
        name: "Cancel this appointment?",
      }),
    ).toBeInTheDocument();

    await actor.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );

    expect(storage.writes()).toBe(1);
    expect(
      await screen.findByText("Appointment cancelled in this browser"),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Already cancelled" }),
    ).toBeDisabled();

    expect(
      readBrowserLocalData(storage).overlay.collections.appointments.updated[
        "APT-001"
      ],
    ).toEqual({
      status: "CANCELLED",
    });
  });

  it("does not claim success when an update write fails", async () => {
    const actor = userEvent.setup();
    const storage = trackedStorage({ failWrite: true });

    render(
      <AppointmentMutationPanel
        baseAppointment={baseAppointment}
        baseAppointments={[baseAppointment]}
        options={options}
        storage={storage}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Edit appointment" }),
    );

    const note = screen.getByRole("textbox", { name: "Note" });
    await actor.clear(note);
    await actor.type(note, "Will fail");

    await actor.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Confirm update" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Update appointment" }),
    );

    expect(storage.writes()).toBe(1);
    expect(
      await screen.findByText("Update appointment failed"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Appointment updated in this browser"),
    ).not.toBeInTheDocument();
  });
});
