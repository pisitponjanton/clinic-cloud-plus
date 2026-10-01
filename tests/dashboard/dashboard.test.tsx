import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DashboardError from "@/app/(protected)/dashboard/error";
import DashboardLoading from "@/app/(protected)/dashboard/loading";
import { InternalDashboard } from "@/components/dashboard/internal-dashboard";
import { PatientDashboard } from "@/components/dashboard/patient-dashboard";
import { toAuthUser } from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import {
  DEMO_TODAY,
  getDashboardProjection,
} from "@/src/dashboard/projection";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

const owner = user("USR-OWNER-001");
const staff = user("USR-STAFF-001");
const doctor = user("USR-DOCTOR-001");
const patient = user("USR-PATIENT-001");

describe("dashboard projections", () => {
  it("uses the deterministic seeded demo day", () => {
    expect(DEMO_TODAY).toBe("2026-10-01");
  });

  it("gives OWNER and STAFF clinic-wide operational context", () => {
    const ownerProjection = getDashboardProjection(owner);
    const staffProjection = getDashboardProjection(staff);

    expect(ownerProjection.kind).toBe("internal");
    expect(staffProjection.kind).toBe("internal");

    if (ownerProjection.kind !== "internal" || staffProjection.kind !== "internal") {
      throw new Error("Expected internal dashboard projection");
    }

    expect(ownerProjection.patientCount).toBe(20);
    expect(staffProjection.patientCount).toBe(20);
    expect(ownerProjection.appointmentCount).toBeGreaterThan(0);
    expect(ownerProjection.queueCount).toBeGreaterThan(0);
    expect(ownerProjection.todayAppointments[0]?.time).toBe("09:30");
  });

  it("scopes DOCTOR dashboard data to assigned doctor context", () => {
    const projection = getDashboardProjection(doctor);

    expect(projection.kind).toBe("internal");

    if (projection.kind !== "internal") {
      throw new Error("Expected internal dashboard projection");
    }

    expect(projection.patientCount).toBeLessThan(20);
    expect(projection.todayAppointments.length).toBeGreaterThan(0);

    for (const appointment of projection.todayAppointments) {
      expect(appointment.doctorName).toBe("นพ. สาธิต เมตตา");
    }
  });

  it("builds PATIENT dashboard only from the linked patient identity", () => {
    const projection = getDashboardProjection(patient);

    expect(projection.kind).toBe("patient");

    if (projection.kind !== "patient") {
      throw new Error("Expected patient dashboard projection");
    }

    expect(projection.patient.id).toBe("PAT-001");
    expect(projection.patient.hn).toBe("HN000001");
    expect(projection.nextAppointment?.id).toBe("APT-001");
    expect(projection.nextAppointment?.patientId).toBe("PAT-001");
    expect(projection.currentQueue?.id).toBe("QUEUE-001");
    expect(
      projection.recentHistory.every((entry) => entry.patientId === "PAT-001"),
    ).toBe(true);
  });
});

describe("dashboard UI", () => {
  it("renders task-first STAFF dashboard context and actions", () => {
    const projection = getDashboardProjection(staff);

    if (projection.kind !== "internal") {
      throw new Error("Expected internal projection");
    }

    render(<InternalDashboard user={staff} projection={projection} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Today’s clinic work" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Today’s appointments")).toBeInTheDocument();
    expect(screen.getByText("Queue needing attention")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Find a patient/ }),
    ).toHaveAttribute("href", "/patients");
    expect(
      screen.getByRole("link", { name: /Review appointments/ }),
    ).toHaveAttribute("href", "/appointments");
  });

  it("renders OWNER-only Demo Settings dashboard action", () => {
    const projection = getDashboardProjection(owner);

    if (projection.kind !== "internal") {
      throw new Error("Expected internal projection");
    }

    render(<InternalDashboard user={owner} projection={projection} />);

    expect(
      screen.getByRole("link", { name: "Demo Settings" }),
    ).toHaveAttribute("href", "/settings/demo");
  });

  it("renders patient dashboard without another patient's identity", () => {
    const projection = getDashboardProjection(patient);

    if (projection.kind !== "patient") {
      throw new Error("Expected patient projection");
    }

    render(<PatientDashboard projection={projection} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "My Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.getByText("HN000001")).toBeInTheDocument();
    expect(screen.getByText("A001")).toBeInTheDocument();

    expect(screen.queryByText("สุดา สุขใจ")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Patients" })).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "My Profile" }),
    ).toHaveAttribute("href", "/me/profile");
  });

  it("renders a bounded loading state", () => {
    render(<DashboardLoading />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Loading your workspace",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading dashboard context",
    );
  });

  it("renders an actionable error state and retries", async () => {
    const userEventInstance = userEvent.setup();
    const reset = vi.fn();

    render(
      <DashboardError
        error={new Error("demo")}
        reset={reset}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load dashboard",
    );

    await userEventInstance.click(
      screen.getByRole("button", { name: "Try again" }),
    );

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
