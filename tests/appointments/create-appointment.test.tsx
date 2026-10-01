import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CreateAppointmentForm } from "@/components/appointments/create-appointment-form";
import {
  createLocalAppointmentFromPreview,
  createLocalAppointmentId,
  validateCreateAppointmentDraft,
  type CreateAppointmentOptions,
} from "@/src/appointments/create-contract";
import { readBrowserLocalData, type BrowserStorageLike } from "@/src/local-data/browser-appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

const options: CreateAppointmentOptions = {
  patients: [
    {
      value: "PAT-001",
      label: "HN000001 · สมชาย ใจดี",
      description: "PAT-001",
    },
  ],
  doctors: [
    {
      value: "DOC-001",
      label: "นพ. สาธิต เมตตา",
      description: "General Practice",
    },
  ],
  services: [
    {
      value: "SVC-001",
      label: "ตรวจทั่วไป",
      description: "30 min · ฿500",
    },
  ],
};

const baseAppointments: Appointment[] = [
  {
    id: "APT-001",
    clinicId: "CLINIC-001",
    patientId: "PAT-001",
    doctorId: "DOC-001",
    serviceId: "SVC-001",
    date: "2026-10-01",
    time: "09:30",
    status: "CHECKED_IN",
    note: "Base appointment",
  },
];

function trackedStorage({
  failWrite = false,
}: {
  failWrite?: boolean;
} = {}): BrowserStorageLike & {
  writes: () => number;
} {
  const values = new Map<string, string>();
  let writeCount = 0;

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      writeCount += 1;

      if (failWrite) {
        throw new Error("write blocked");
      }

      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    writes() {
      return writeCount;
    },
  };
}

describe("create appointment contract", () => {
  it("validates allowed references and normalizes an appointment preview", () => {
    const result = validateCreateAppointmentDraft(
      {
        patientId: " PAT-001 ",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-05",
        time: "10:15",
        note: " Follow up ",
      },
      options,
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected valid create preview");
    }

    expect(result.preview).toEqual({
      draft: {
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-05",
        time: "10:15",
        note: "Follow up",
      },
      patientLabel: "HN000001 · สมชาย ใจดี",
      doctorLabel: "นพ. สาธิต เมตตา",
      serviceLabel: "ตรวจทั่วไป",
    });

    expect(
      createLocalAppointmentFromPreview(
        result.preview,
        createLocalAppointmentId("test-create"),
      ),
    ).toMatchObject({
      id: "APT-LOCAL-test-create",
      clinicId: "CLINIC-001",
      patientId: "PAT-001",
      doctorId: "DOC-001",
      serviceId: "SVC-001",
      status: "SCHEDULED",
    });
  });

  it("rejects missing and out-of-scope references before preview", () => {
    const result = validateCreateAppointmentDraft(
      {
        patientId: "PAT-999",
        doctorId: "DOC-999",
        serviceId: "SVC-999",
        date: "",
        time: "25:99",
        note: "",
      },
      options,
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected validation errors");
    }

    expect(result.errors).toMatchObject({
      patientId: expect.stringContaining("ไม่อยู่ในสิทธิ์"),
      doctorId: expect.stringContaining("ไม่อยู่ในตัวเลือก"),
      serviceId: expect.stringContaining("ไม่อยู่ในตัวเลือก"),
      date: expect.any(String),
      time: expect.any(String),
    });
  });

  it("allows doctor/service to remain unassigned when the patient/date/time are valid", () => {
    const result = validateCreateAppointmentDraft(
      {
        patientId: "PAT-001",
        doctorId: "",
        serviceId: "",
        date: "2026-10-06",
        time: "11:00",
        note: "",
      },
      options,
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected optional doctor/service to be valid");
    }

    expect(result.preview.doctorLabel).toBeNull();
    expect(result.preview.serviceLabel).toBeNull();
  });
});

describe("create appointment confirmation flow", () => {
  it("does not write during Review and writes only after explicit confirmation", async () => {
    const actor = userEvent.setup();
    const storage = trackedStorage();

    render(
      <CreateAppointmentForm
        options={options}
        baseAppointments={baseAppointments}
        storage={storage}
        idFactory={() => "APT-LOCAL-confirmed"}
        initialDraft={{
          patientId: "PAT-001",
          doctorId: "DOC-001",
          serviceId: "SVC-001",
          date: "2026-10-05",
          time: "10:15",
          note: "Confirmed browser-local create",
        }}
      />,
    );

    expect(storage.writes()).toBe(0);

    await actor.click(
      screen.getByRole("button", { name: "Review appointment" }),
    );

    expect(storage.writes()).toBe(0);
    expect(
      screen.getByText("Confirmation preview"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("HN000001 · สมชาย ใจดี").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-10-05").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10:15").length).toBeGreaterThan(0);

    await actor.click(
      screen.getByRole("button", { name: "Confirm & create" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Create this appointment?",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ตรวจทั่วไป").length).toBeGreaterThan(0);
    expect(screen.getAllByText("นพ. สาธิต เมตตา").length).toBeGreaterThan(0);

    expect(storage.writes()).toBe(0);

    await actor.click(
      screen.getByRole("button", { name: "Create appointment" }),
    );

    expect(storage.writes()).toBe(1);
    expect(
      await screen.findByText("Appointment created in this browser"),
    ).toBeInTheDocument();
    expect(screen.getByText(/APT-LOCAL-confirmed/)).toBeInTheDocument();

    const overlay = readBrowserLocalData(storage).overlay;
    expect(overlay.collections.appointments.created).toEqual([
      expect.objectContaining({
        id: "APT-LOCAL-confirmed",
        patientId: "PAT-001",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-05",
        time: "10:15",
        status: "SCHEDULED",
      }),
    ]);
  });

  it("shows inline validation and never opens confirmation for invalid input", async () => {
    const actor = userEvent.setup();
    const storage = trackedStorage();

    render(
      <CreateAppointmentForm
        options={options}
        baseAppointments={baseAppointments}
        storage={storage}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Review appointment" }),
    );

    expect(screen.getByText("กรุณาเลือกผู้ป่วย")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือกวันที่")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือกเวลา")).toBeInTheDocument();

    const patientTrigger = document.getElementById("create-patient");
    expect(patientTrigger).toHaveAttribute("aria-invalid", "true");
    expect(patientTrigger).toHaveAttribute("aria-required", "true");
    expect(patientTrigger).toHaveAttribute(
      "aria-describedby",
      "create-patient-description create-patient-error",
    );
    expect(patientTrigger).toHaveClass("min-h-11");

    expect(
      screen.queryByRole("button", { name: "Confirm & create" }),
    ).not.toBeInTheDocument();
    expect(storage.writes()).toBe(0);
  });

  it("reports storage write failure without claiming success", async () => {
    const actor = userEvent.setup();
    const storage = trackedStorage({ failWrite: true });

    render(
      <CreateAppointmentForm
        options={options}
        baseAppointments={baseAppointments}
        storage={storage}
        idFactory={() => "APT-LOCAL-write-fails"}
        initialDraft={{
          patientId: "PAT-001",
          date: "2026-10-05",
          time: "10:15",
        }}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Review appointment" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Confirm & create" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Create appointment" }),
    );

    expect(storage.writes()).toBe(1);
    expect(
      await screen.findByText("Create appointment failed"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Appointment created in this browser"),
    ).not.toBeInTheDocument();
  });
});
