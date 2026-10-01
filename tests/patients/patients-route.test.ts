import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  getPatientListProjection: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/src/patients/list-projection", () => ({
  getPatientListProjection: mocks.getPatientListProjection,
}));

vi.mock("@/components/patients/patient-list-view", () => ({
  PatientListView: () => null,
}));

import PatientsPage from "@/app/(protected)/patients/page";

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

describe("/patients route isolation", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.getPatientListProjection.mockReset();
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("redirects PATIENT to /dashboard before loading patient list data", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);

    await expect(
      PatientsPage({
        searchParams: Promise.resolve({ q: "PAT-002" }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    expect(mocks.getPatientListProjection).not.toHaveBeenCalled();
  });
});
