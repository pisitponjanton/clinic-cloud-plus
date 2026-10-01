import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  getPatientDetailProjection: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));

vi.mock("@/src/patients/detail-projection", () => ({
  getPatientDetailProjection: mocks.getPatientDetailProjection,
}));

vi.mock("@/components/patients/patient-detail-view", () => ({
  PatientDetailView: () => null,
}));

import PatientDetailPage from "@/app/(protected)/patients/[patientId]/page";

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

describe("/patients/[patientId] route isolation", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.notFound.mockReset();
    mocks.getPatientDetailProjection.mockReset();

    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
    mocks.notFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
  });

  it("redirects PATIENT before loading internal patient detail", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);

    await expect(
      PatientDetailPage({
        params: Promise.resolve({ patientId: "PAT-001" }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.getPatientDetailProjection).not.toHaveBeenCalled();
  });

  it("maps a missing patient to the generic not-found boundary", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getPatientDetailProjection.mockReturnValue(null);

    await expect(
      PatientDetailPage({
        params: Promise.resolve({ patientId: "PAT-999" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("maps an authorization failure to the same generic not-found boundary", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getPatientDetailProjection.mockImplementation(() => {
      throw new AuthorizationError();
    });

    await expect(
      PatientDetailPage({
        params: Promise.resolve({ patientId: "PAT-002" }),
      }),
    ).rejects.toThrow("NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
