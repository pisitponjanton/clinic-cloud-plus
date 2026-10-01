import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  getQueueListProjection: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/src/queue/read-projection", () => ({
  getQueueListProjection: mocks.getQueueListProjection,
}));

vi.mock("@/components/queue/queue-list-view", () => ({
  QueueListView: () => null,
}));

import QueuePage from "@/app/(protected)/queue/page";

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

describe("/queue route isolation", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.getQueueListProjection.mockReset();

    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("redirects PATIENT before internal queue data is loaded", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);

    await expect(
      QueuePage({
        searchParams: Promise.resolve({
          status: "WAITING",
          date: "2026-10-01",
        }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.getQueueListProjection).not.toHaveBeenCalled();
  });

  it("passes only the first normalized query values to the queue projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getQueueListProjection.mockReturnValue({
      status: "WAITING",
      date: "2026-10-01",
      totalInScope: 8,
      resultCount: 5,
      items: [],
      statusCounts: {
        WAITING: 5,
        CALLED: 2,
        IN_SERVICE: 1,
        COMPLETED: 0,
        CANCELLED: 0,
      },
    });

    await QueuePage({
      searchParams: Promise.resolve({
        status: ["WAITING", "CALLED"],
        date: ["2026-10-01", "2026-10-02"],
      }),
    });

    expect(mocks.getQueueListProjection).toHaveBeenCalledWith(staff, {
      status: "WAITING",
      date: "2026-10-01",
    });
  });
});
