import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/src/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { requireCurrentUser } from "@/src/auth/protected";

const user: AuthUser = {
  id: "USR-STAFF-001",
  clinicId: "CLINIC-001",
  email: "staff@cliniccloud.demo",
  displayName: "Demo Staff",
  role: "STAFF",
  linkedPatientId: null,
  linkedDoctorId: null,
  active: true,
};

describe("protected route boundary", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("returns the trusted current user when authenticated", async () => {
    mocks.getCurrentUser.mockResolvedValue(user);

    await expect(requireCurrentUser()).resolves.toEqual(user);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated requests to /login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(requireCurrentUser()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
