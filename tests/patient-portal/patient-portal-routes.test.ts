import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  getPatientProfileProjection: vi.fn(),
  getPatientAppointmentsProjection: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/src/patient-portal/projection", () => ({
  getPatientProfileProjection: mocks.getPatientProfileProjection,
  getPatientAppointmentsProjection: mocks.getPatientAppointmentsProjection,
}));

vi.mock("@/components/patient-portal/patient-profile-view", () => ({
  PatientProfileView: () => null,
}));

vi.mock("@/components/patient-portal/patient-appointments-view", () => ({
  PatientAppointmentsView: () => null,
}));

import MyAppointmentsPage from "@/app/(protected)/me/appointments/page";
import MyProfilePage from "@/app/(protected)/me/profile/page";

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

describe("patient portal route isolation", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("redirects personnel from /me/profile before patient projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);

    await expect(MyProfilePage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.getPatientProfileProjection).not.toHaveBeenCalled();
  });

  it("redirects personnel from /me/appointments before patient projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);

    await expect(MyAppointmentsPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.getPatientAppointmentsProjection).not.toHaveBeenCalled();
  });

  it("resolves PATIENT routes from the authenticated identity", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);
    mocks.getPatientProfileProjection.mockReturnValue({
      patient: { id: "PAT-001" },
    });
    mocks.getPatientAppointmentsProjection.mockReturnValue({
      patientId: "PAT-001",
      patientName: "สมชาย ใจดี",
      hn: "HN000001",
      appointments: [],
    });

    await MyProfilePage();
    await MyAppointmentsPage();

    expect(mocks.getPatientProfileProjection).toHaveBeenCalledWith(patient);
    expect(mocks.getPatientAppointmentsProjection).toHaveBeenCalledWith(patient);
  });
});
