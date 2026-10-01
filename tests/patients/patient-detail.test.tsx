import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PatientDetailError from "@/app/(protected)/patients/[patientId]/error";
import PatientDetailLoading from "@/app/(protected)/patients/[patientId]/loading";
import PatientDetailNotFound from "@/app/(protected)/patients/[patientId]/not-found";
import { PatientDetailView } from "@/components/patients/patient-detail-view";
import { toAuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getUserById } from "@/src/data-access/private";
import {
  getPatientDetailProjection,
  type PatientDetailProjection,
} from "@/src/patients/detail-projection";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

const staff = user("USR-STAFF-001");
const doctor = user("USR-DOCTOR-001");

describe("patient detail projection", () => {
  it("builds the seeded PAT-001 context for STAFF", () => {
    const projection = getPatientDetailProjection(staff, "PAT-001");

    expect(projection).not.toBeNull();
    expect(projection?.patient).toMatchObject({
      id: "PAT-001",
      hn: "HN000001",
      firstName: "สมชาย",
      lastName: "ใจดี",
    });

    expect(projection?.appointments.map((record) => record.id)).toEqual([
      "APT-003",
      "APT-021",
      "APT-001",
      "APT-002",
    ]);
    expect(projection?.appointments[0]).toMatchObject({
      doctorName: "นพ. สาธิต เมตตา",
      serviceName: "ตรวจติดตามอาการ",
    });

    expect(projection?.history.length).toBeGreaterThan(0);
    expect(
      projection?.history.every((entry) => entry.summary.includes("Synthetic")),
    ).toBe(true);
  });

  it("limits DOCTOR appointment context to assigned appointments", () => {
    const projection = getPatientDetailProjection(doctor, "PAT-001");

    expect(projection).not.toBeNull();
    expect(projection?.appointments.map((record) => record.id)).toEqual([
      "APT-003",
      "APT-021",
      "APT-001",
    ]);
    expect(
      projection?.appointments.every(
        (record) => record.doctorName === "นพ. สาธิต เมตตา",
      ),
    ).toBe(true);
  });

  it("rejects a patient outside DOCTOR relevance scope", () => {
    expect(() => getPatientDetailProjection(doctor, "PAT-002")).toThrow(
      AuthorizationError,
    );
  });

  it("returns null for a missing patient without fabricating context", () => {
    expect(getPatientDetailProjection(staff, "PAT-999")).toBeNull();
  });
});

describe("patient detail UI", () => {
  it("renders patient context, appointment context, history, and back navigation", () => {
    const projection = getPatientDetailProjection(staff, "PAT-001");

    if (!projection) {
      throw new Error("Expected seeded patient projection");
    }

    render(<PatientDetailView role="STAFF" projection={projection} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "สมชาย ใจดี" }),
    ).toBeInTheDocument();
    expect(screen.getByText("HN000001")).toBeInTheDocument();
    expect(screen.getByText("APT-003")).toBeInTheDocument();
    expect(screen.getAllByText("Patient history").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Synthetic demo follow-up history for the A\/B scenario/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Back to patients" }),
    ).toHaveAttribute("href", "/patients");
    expect(
      screen.getByRole("link", { name: "View appointments" }),
    ).toHaveAttribute("href", "/appointments");
  });

  it("explains doctor appointment scope", () => {
    const projection = getPatientDetailProjection(doctor, "PAT-001");

    if (!projection) {
      throw new Error("Expected doctor patient projection");
    }

    render(<PatientDetailView role="DOCTOR" projection={projection} />);

    expect(
      screen.getByText(
        /Only appointments assigned to your linked doctor identity/,
      ),
    ).toBeInTheDocument();
    const appointmentSection = screen.getByRole("region", {
      name: "Appointment context",
    });
    expect(within(appointmentSection).queryByText("APT-002")).not.toBeInTheDocument();
  });

  it("renders explicit empty appointment and history states", () => {
    const projection: PatientDetailProjection = {
      patient: {
        id: "PAT-TEST-001",
        clinicId: "CLINIC-001",
        hn: "HNTEST001",
        firstName: "Demo",
        lastName: "Empty",
        phone: "0800009999",
        dateOfBirth: "2000-01-01",
        gender: "OTHER",
      },
      appointments: [],
      history: [],
    };

    render(<PatientDetailView role="STAFF" projection={projection} />);

    expect(screen.getByText("No appointment context")).toBeInTheDocument();
    expect(screen.getByText("No history available")).toBeInTheDocument();
  });

  it("renders bounded loading and generic not-found states", () => {
    const { rerender } = render(<PatientDetailLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading patient context",
    );

    rerender(<PatientDetailNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Patient context unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not found or is not available in your current role scope/),
    ).toBeInTheDocument();
  });

  it("renders an actionable error state", async () => {
    const userEventInstance = userEvent.setup();
    const reset = vi.fn();

    render(
      <PatientDetailError error={new Error("demo")} reset={reset} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load patient context",
    );

    await userEventInstance.click(
      screen.getByRole("button", { name: "Try again" }),
    );

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
