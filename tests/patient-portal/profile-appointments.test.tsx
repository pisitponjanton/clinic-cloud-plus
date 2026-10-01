import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MyAppointmentsError from "@/app/(protected)/me/appointments/error";
import MyAppointmentsLoading from "@/app/(protected)/me/appointments/loading";
import MyProfileError from "@/app/(protected)/me/profile/error";
import MyProfileLoading from "@/app/(protected)/me/profile/loading";
import { PatientAppointmentsView } from "@/components/patient-portal/patient-appointments-view";
import { PatientProfileView } from "@/components/patient-portal/patient-profile-view";
import { toAuthUser } from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import {
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import {
  createEmptyLocalDataOverlay,
  withAppointmentCreated,
  withAppointmentUpdate,
} from "@/src/local-data/appointment-overlay";
import {
  getPatientAppointmentsProjection,
  getPatientProfileProjection,
} from "@/src/patient-portal/projection";

function authUser(userId: string) {
  const seeded = getUserById(userId);
  if (!seeded) throw new Error("Missing seeded user");
  return toAuthUser(seeded);
}

function memoryStorage(): BrowserStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const patientUser = authUser("USR-PATIENT-001");
const staffUser = authUser("USR-STAFF-001");

describe("patient portal projections", () => {
  it("resolves profile only from the linked PATIENT identity", () => {
    const projection = getPatientProfileProjection(patientUser);
    expect(projection.patient).toMatchObject({
      id: "PAT-001",
      hn: "HN000001",
      firstName: "สมชาย",
      lastName: "ใจดี",
      phone: "0800000001",
    });
  });

  it("returns only PAT-001 Base appointments for the linked patient", () => {
    const projection = getPatientAppointmentsProjection(patientUser);
    expect(projection.patientId).toBe("PAT-001");
    expect(projection.appointments).toHaveLength(4);
    expect(
      projection.appointments.every((appointment) => appointment.patientId === "PAT-001"),
    ).toBe(true);
  });

  it("rejects personnel identities from patient portal projections", () => {
    expect(() => getPatientProfileProjection(staffUser)).toThrow(
      "Patient portal requires a linked PATIENT identity",
    );
    expect(() => getPatientAppointmentsProjection(staffUser)).toThrow(
      "Patient portal requires a linked PATIENT identity",
    );
  });
});

describe("patient portal UI", () => {
  it("renders only the linked patient profile", () => {
    render(
      <PatientProfileView projection={getPatientProfileProjection(patientUser)} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "My profile" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("สมชาย ใจดี").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HN000001").length).toBeGreaterThan(0);
    expect(screen.getByText("0800000001")).toBeInTheDocument();
    expect(screen.queryByText("HN000002")).not.toBeInTheDocument();
  });

  it("shows own Base appointments grouped into upcoming and previous", () => {
    render(
      <PatientAppointmentsView
        projection={getPatientAppointmentsProjection(patientUser)}
        storage={memoryStorage()}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "My appointments" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/สมชาย ใจดี.*HN000001/)).toBeInTheDocument();
    expect(screen.getByText("Upcoming appointments")).toBeInTheDocument();
    expect(screen.getByText("Previous & cancelled")).toBeInTheDocument();
    expect(screen.getByText("APT-003")).toBeInTheDocument();
    expect(screen.getByText("APT-002")).toBeInTheDocument();
  });

  it("merges own local updates but filters another patient's local appointment", async () => {
    const storage = memoryStorage();
    let overlay = createEmptyLocalDataOverlay(
      new Date("2026-10-01T08:00:00.000Z"),
    );

    overlay = withAppointmentUpdate(
      overlay,
      "APT-003",
      { status: "CANCELLED", note: "Own local cancellation" },
      new Date("2026-10-01T08:01:00.000Z"),
    );

    overlay = withAppointmentCreated(
      overlay,
      {
        id: "APT-LOCAL-other-patient",
        clinicId: "CLINIC-001",
        patientId: "PAT-999",
        doctorId: "DOC-001",
        serviceId: "SVC-001",
        date: "2026-10-06",
        time: "12:00",
        status: "SCHEDULED",
        note: "SHOULD_NOT_LEAK",
      },
      new Date("2026-10-01T08:02:00.000Z"),
    );

    writeBrowserLocalData(
      overlay,
      storage,
      new Date("2026-10-01T08:03:00.000Z"),
    );

    render(
      <PatientAppointmentsView
        projection={getPatientAppointmentsProjection(patientUser)}
        storage={storage}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Own local cancellation")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
    expect(screen.queryByText("SHOULD_NOT_LEAK")).not.toBeInTheDocument();
    expect(screen.queryByText("APT-LOCAL-other-patient")).not.toBeInTheDocument();
  });

  it("renders bounded loading and retryable error states", async () => {
    const actor = userEvent.setup();
    const retry = vi.fn();

    const { rerender } = render(<MyProfileLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading my profile");

    rerender(<MyAppointmentsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading my appointments",
    );

    rerender(<MyProfileError reset={retry} />);
    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(<MyAppointmentsError reset={retry} />);
    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(2);
  });
});
