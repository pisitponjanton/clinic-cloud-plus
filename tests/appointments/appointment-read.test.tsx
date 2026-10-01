import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AppointmentDetailError from "@/app/(protected)/appointments/[appointmentId]/error";
import AppointmentDetailLoading from "@/app/(protected)/appointments/[appointmentId]/loading";
import AppointmentDetailNotFound from "@/app/(protected)/appointments/[appointmentId]/not-found";
import AppointmentsError from "@/app/(protected)/appointments/error";
import AppointmentsLoading from "@/app/(protected)/appointments/loading";
import { AppointmentDetailView } from "@/components/appointments/appointment-detail-view";
import { AppointmentListView } from "@/components/appointments/appointment-list-view";
import { getAppointmentMutationPageData } from "@/src/appointments/mutation-options";
import {
  getAppointmentDetailProjection,
  getAppointmentListProjection,
  type AppointmentListProjection,
} from "@/src/appointments/read-projection";
import { toAuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getUserById } from "@/src/data-access/private";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

const staff = user("USR-STAFF-001");
const doctor = user("USR-DOCTOR-001");

describe("appointment read projections", () => {
  it("returns the full clinic appointment scope for STAFF", () => {
    const projection = getAppointmentListProjection(staff);

    expect(projection.totalInScope).toBe(30);
    expect(projection.resultCount).toBe(30);
    expect(projection.items[0]).toMatchObject({
      date: "2026-09-12",
    });
  });

  it("filters appointments by status and date after authorization", () => {
    const confirmed = getAppointmentListProjection(staff, {
      status: "CONFIRMED",
    });
    const demoDay = getAppointmentListProjection(staff, {
      date: "2026-10-01",
    });
    const combined = getAppointmentListProjection(staff, {
      status: "CONFIRMED",
      date: "2026-10-01",
    });

    expect(confirmed.resultCount).toBe(13);
    expect(
      confirmed.items.every((item) => item.status === "CONFIRMED"),
    ).toBe(true);

    expect(demoDay.resultCount).toBeGreaterThan(0);
    expect(
      demoDay.items.every((item) => item.date === "2026-10-01"),
    ).toBe(true);

    expect(combined.resultCount).toBeGreaterThan(0);
    expect(
      combined.items.every(
        (item) =>
          item.status === "CONFIRMED" && item.date === "2026-10-01",
      ),
    ).toBe(true);
  });

  it("treats unknown status as no status filter without fabricating data", () => {
    const projection = getAppointmentListProjection(staff, {
      status: "NOT_A_STATUS",
    });

    expect(projection.status).toBeNull();
    expect(projection.resultCount).toBe(30);
  });

  it("keeps DOCTOR list and detail inside linked doctor scope", () => {
    const list = getAppointmentListProjection(doctor);
    const detail = getAppointmentDetailProjection(doctor, "APT-001");

    expect(list.totalInScope).toBe(8);
    expect(list.items.length).toBe(8);
    expect(
      list.items.every((item) => item.doctorName === "นพ. สาธิต เมตตา"),
    ).toBe(true);

    expect(detail?.appointment).toMatchObject({
      id: "APT-001",
      patientId: "PAT-001",
      status: "CHECKED_IN",
      serviceName: "ตรวจทั่วไป",
      doctorName: "นพ. สาธิต เมตตา",
    });

    expect(() => getAppointmentDetailProjection(doctor, "APT-004")).toThrow(
      AuthorizationError,
    );
  });

  it("returns null for a missing appointment", () => {
    expect(getAppointmentDetailProjection(staff, "APT-999")).toBeNull();
  });
});

describe("appointment read UI", () => {
  it("renders list filters, status, patient context, and detail links", () => {
    const projection = getAppointmentListProjection(staff, {
      status: "CHECKED_IN",
      date: "2026-10-01",
    });

    render(<AppointmentListView role="STAFF" projection={projection} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Appointments" }),
    ).toBeInTheDocument();

    const statusFilter = screen.getByLabelText("Appointment status");
    const dateFilter = screen.getByLabelText("Date");

    expect(statusFilter).toHaveTextContent("CHECKED IN");
    expect(statusFilter).toHaveAttribute(
      "aria-describedby",
      "appointment-status-description",
    );
    expect(statusFilter).toHaveClass("min-h-11");
    expect(dateFilter).toHaveValue("2026-10-01");
    expect(dateFilter).toHaveAttribute(
      "aria-describedby",
      "appointment-date-description",
    );
    expect(dateFilter).toHaveClass("min-h-11");

    expect(screen.getAllByText("สมชาย ใจดี").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Checked in").length).toBeGreaterThan(0);

    const detailLinks = screen.getAllByRole("link", {
      name: "Open appointment",
    });
    expect(
      detailLinks.some(
        (link) => link.getAttribute("href") === "/appointments/APT-001",
      ),
    ).toBe(true);
  });

  it("renders doctor-specific appointment wording", () => {
    const projection = getAppointmentListProjection(doctor);

    render(<AppointmentListView role="DOCTOR" projection={projection} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Assigned appointments",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/linked doctor identity/),
    ).toBeInTheDocument();
  });

  it("renders a clear no-result state", () => {
    const projection = getAppointmentListProjection(staff, {
      status: "CHECKED_IN",
      date: "2026-10-10",
    });

    expect(projection.resultCount).toBe(0);

    render(<AppointmentListView role="STAFF" projection={projection} />);

    expect(screen.getByText("No appointments found")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Clear filters" }).length,
    ).toBeGreaterThan(0);
  });

  it("renders appointment detail controls and patient workflow links", () => {
    const projection = getAppointmentDetailProjection(staff, "APT-001");
    const mutation = getAppointmentMutationPageData(staff, "APT-001");

    if (!projection || !mutation) {
      throw new Error("Expected APT-001 detail data");
    }

    render(
      <AppointmentDetailView
        role="STAFF"
        projection={projection}
        mutation={mutation}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "APT-001" }),
    ).toBeInTheDocument();
    expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(screen.getByText("HN000001")).toBeInTheDocument();
    expect(screen.getByText("A/B demo current appointment")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Edit appointment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel appointment" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Open patient" }),
    ).toHaveAttribute("href", "/patients/PAT-001");
    expect(
      screen.getByRole("link", { name: "View queue" }),
    ).toHaveAttribute("href", "/queue");
  });

  it("renders bounded list/detail loading and generic not-found states", () => {
    const { rerender } = render(<AppointmentsLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading appointments",
    );

    rerender(<AppointmentDetailLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading appointment context",
    );

    rerender(<AppointmentDetailNotFound />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Appointment unavailable",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not found or is not available in your current role scope/),
    ).toBeInTheDocument();
  });

  it("renders actionable list and detail error states", async () => {
    const actor = userEvent.setup();
    const listReset = vi.fn();
    const detailReset = vi.fn();

    const { rerender } = render(
      <AppointmentsError error={new Error("list")} reset={listReset} />,
    );

    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(listReset).toHaveBeenCalledTimes(1);

    rerender(
      <AppointmentDetailError
        error={new Error("detail")}
        reset={detailReset}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Could not load appointment")).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Try again" }));
    expect(detailReset).toHaveBeenCalledTimes(1);
  });

  it("can render an explicit empty projection without fake rows", () => {
    const empty: AppointmentListProjection = {
      status: null,
      date: "",
      totalInScope: 0,
      resultCount: 0,
      items: [],
    };

    render(<AppointmentListView role="DOCTOR" projection={empty} />);

    expect(screen.getByText("No appointments found")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open appointment" }),
    ).not.toBeInTheDocument();
  });
});
