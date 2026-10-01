import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  getAppointmentListProjection: vi.fn(),
  getAppointmentDetailProjection: vi.fn(),
  getAppointmentMutationPageData: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));

vi.mock("@/src/appointments/read-projection", () => ({
  getAppointmentListProjection: mocks.getAppointmentListProjection,
  getAppointmentDetailProjection: mocks.getAppointmentDetailProjection,
}));

vi.mock("@/src/appointments/mutation-options", () => ({
  getAppointmentMutationPageData: mocks.getAppointmentMutationPageData,
}));

vi.mock("@/components/appointments/appointment-list-view", () => ({
  AppointmentListView: () => null,
}));

vi.mock("@/components/appointments/appointment-detail-view", () => ({
  AppointmentDetailView: () => null,
}));

import AppointmentDetailPage from "@/app/(protected)/appointments/[appointmentId]/page";
import AppointmentsPage from "@/app/(protected)/appointments/page";

const staff: AuthUser = {
  id: "USR-STAFF-001",
  clinicId: "CLINIC-001",
  email: "staff@cliniccloud.demo",
  displayName: "Demo Staff",
  role: "STAFF",
  linkedPatientId: null,
  linkedDoctorId: null,
  active: true,
};

const patient: AuthUser = {
  id: "USR-PATIENT-001",
  clinicId: "CLINIC-001",
  email: "patient@cliniccloud.demo",
  displayName: "สมชาย ใจดี",
  role: "PATIENT",
  linkedPatientId: "PAT-001",
  linkedDoctorId: null,
  active: true,
};

describe("appointment route isolation", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.notFound.mockReset();
    mocks.getAppointmentListProjection.mockReset();
    mocks.getAppointmentDetailProjection.mockReset();
    mocks.getAppointmentMutationPageData.mockReset();

    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });

    mocks.notFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
  });

  it("redirects PATIENT from internal appointment list before loading data", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);

    await expect(
      AppointmentsPage({
        searchParams: Promise.resolve({
          status: "CONFIRMED",
          date: "2026-10-01",
        }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.getAppointmentListProjection).not.toHaveBeenCalled();
  });

  it("passes normalized query params to appointment list projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getAppointmentListProjection.mockReturnValue({
      status: "CONFIRMED",
      date: "2026-10-01",
      totalInScope: 30,
      resultCount: 1,
      items: [],
    });

    await AppointmentsPage({
      searchParams: Promise.resolve({
        status: ["CONFIRMED", "CANCELLED"],
        date: ["2026-10-01", "2026-10-02"],
      }),
    });

    expect(mocks.getAppointmentListProjection).toHaveBeenCalledWith(staff, {
      status: "CONFIRMED",
      date: "2026-10-01",
    });
  });

  it("redirects PATIENT from internal appointment detail before loading data", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);

    await expect(
      AppointmentDetailPage({
        params: Promise.resolve({ appointmentId: "APT-001" }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.getAppointmentDetailProjection).not.toHaveBeenCalled();
    expect(mocks.getAppointmentMutationPageData).not.toHaveBeenCalled();
  });

  it("maps missing appointment to generic not-found", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getAppointmentDetailProjection.mockReturnValue(null);

    await expect(
      AppointmentDetailPage({
        params: Promise.resolve({ appointmentId: "APT-999" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("maps authorization failure to the same generic not-found", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getAppointmentDetailProjection.mockImplementation(() => {
      throw new AuthorizationError();
    });

    await expect(
      AppointmentDetailPage({
        params: Promise.resolve({ appointmentId: "APT-004" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
