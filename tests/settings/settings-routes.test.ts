import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  getSettingsProjection: vi.fn(),
  assertCanResetDemo: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/src/settings/projection", () => ({
  getSettingsProjection: mocks.getSettingsProjection,
  assertCanResetDemo: mocks.assertCanResetDemo,
}));

vi.mock("@/components/settings/settings-view", () => ({
  SettingsView: () => null,
}));

vi.mock("@/components/settings/demo-reset-panel", () => ({
  DemoResetPanel: () => null,
}));

vi.mock("@/components/shared", async () => {
  const actual = await vi.importActual<typeof import("@/components/shared")>(
    "@/components/shared",
  );

  return {
    ...actual,
    PageHeader: () => null,
  };
});

import DemoSettingsPage from "@/app/(protected)/settings/demo/page";
import SettingsPage from "@/app/(protected)/settings/page";

const owner: AuthUser = {
  id: "USR-OWNER-001",
  clinicId: "CLINIC-001",
  email: "owner@cliniccloud.demo",
  displayName: "Demo Owner",
  role: "OWNER",
  linkedPatientId: null,
  linkedDoctorId: null,
  active: true,
};

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

const projection = {
  clinic: {
    id: "CLINIC-001",
    name: "Clinic Cloud + Demo Clinic",
    description: "demo",
    phone: "02-000-0000",
    address: "Bangkok, Thailand",
    openingHours: [],
  },
  basePatients: 20,
  baseAppointments: 30,
  storageKey: "clinic-cloud-plus:CLINIC-001:data:v1",
  schemaVersion: 1,
};

describe("settings route isolation", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("redirects non-OWNER from /settings before settings projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);

    await expect(SettingsPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.getSettingsProjection).not.toHaveBeenCalled();
  });

  it("redirects non-OWNER from /settings/demo before reset capability checks", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);

    await expect(DemoSettingsPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.assertCanResetDemo).not.toHaveBeenCalled();
    expect(mocks.getSettingsProjection).not.toHaveBeenCalled();
  });

  it("resolves OWNER settings through the authorization projection", async () => {
    mocks.requireCurrentUser.mockResolvedValue(owner);
    mocks.getSettingsProjection.mockReturnValue(projection);

    await SettingsPage();

    expect(mocks.getSettingsProjection).toHaveBeenCalledWith(owner);
  });

  it("checks DEMO_RESET and settings projection for OWNER demo settings", async () => {
    mocks.requireCurrentUser.mockResolvedValue(owner);
    mocks.getSettingsProjection.mockReturnValue(projection);

    await DemoSettingsPage();

    expect(mocks.assertCanResetDemo).toHaveBeenCalledWith(owner);
    expect(mocks.getSettingsProjection).toHaveBeenCalledWith(owner);
  });
});
