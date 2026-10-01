import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  getPatientQueueProjection: vi.fn(),
  getPatientHistoryProjection: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/src/patient-portal/queue-history-projection", () => ({
  getPatientQueueProjection: mocks.getPatientQueueProjection,
  getPatientHistoryProjection: mocks.getPatientHistoryProjection,
}));

vi.mock("@/components/patient-portal/patient-queue-view", () => ({
  PatientQueueView: () => null,
}));

vi.mock("@/components/patient-portal/patient-history-view", () => ({
  PatientHistoryView: () => null,
}));

import MyHistoryPage from "@/app/(protected)/me/history/page";
import MyQueuePage from "@/app/(protected)/me/queue/page";

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

describe("patient queue/history route isolation", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("redirects personnel from /me/queue before patient projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);

    await expect(MyQueuePage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.getPatientQueueProjection).not.toHaveBeenCalled();
  });

  it("redirects personnel from /me/history before patient projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);

    await expect(MyHistoryPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.getPatientHistoryProjection).not.toHaveBeenCalled();
  });

  it("resolves both routes from the authenticated PATIENT identity", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);
    mocks.getPatientQueueProjection.mockReturnValue({
      patientId: "PAT-001",
      patientName: "สมชาย ใจดี",
      hn: "HN000001",
      queue: [],
    });
    mocks.getPatientHistoryProjection.mockReturnValue({
      patientId: "PAT-001",
      patientName: "สมชาย ใจดี",
      hn: "HN000001",
      history: [],
    });

    await MyQueuePage();
    await MyHistoryPage();

    expect(mocks.getPatientQueueProjection).toHaveBeenCalledWith(patient);
    expect(mocks.getPatientHistoryProjection).toHaveBeenCalledWith(patient);
  });
});
