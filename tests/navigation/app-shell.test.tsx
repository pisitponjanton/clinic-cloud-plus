import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell/app-shell";
import type { AuthUser } from "@/src/auth/user";
import {
  getActiveNavigationHref,
  getNavigationItems,
} from "@/src/navigation/app-navigation";

const navigation = vi.hoisted(() => ({
  pathname: "/dashboard",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

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

describe("role-aware application shell", () => {
  beforeEach(() => {
    navigation.pathname = "/dashboard";
  });

  it("returns the exact OWNER navigation required by SPEC", () => {
    expect(getNavigationItems("OWNER").map((item) => item.label)).toEqual([
      "Dashboard",
      "Patients",
      "Appointments",
      "Queue",
      "Settings",
      "Demo Settings",
    ]);
  });

  it.each(["STAFF", "NURSE", "DOCTOR"] as const)(
    "returns the internal clinic navigation for %s",
    (role) => {
      expect(getNavigationItems(role).map((item) => item.label)).toEqual([
        "Dashboard",
        "Patients",
        "Appointments",
        "Queue",
      ]);
    },
  );

  it("returns only patient-facing navigation for PATIENT", () => {
    const items = getNavigationItems("PATIENT");

    expect(items.map((item) => item.label)).toEqual([
      "My Dashboard",
      "My Profile",
      "My Appointments",
      "My Queue",
      "My History",
    ]);

    expect(items.map((item) => item.href)).not.toContain("/patients");
    expect(items.map((item) => item.href)).not.toContain("/appointments");
    expect(items.map((item) => item.href)).not.toContain("/queue");
    expect(items.map((item) => item.href)).not.toContain("/settings");
  });

  it("selects the most specific active navigation path", () => {
    const items = getNavigationItems("OWNER");

    expect(getActiveNavigationHref("/settings/demo", items)).toBe(
      "/settings/demo",
    );
    expect(getActiveNavigationHref("/patients/PAT-001", items)).toBe(
      "/patients",
    );
    expect(getActiveNavigationHref("/unrelated", items)).toBeNull();
  });

  it("renders OWNER identity, logout, and one active navigation item", () => {
    navigation.pathname = "/settings/demo";

    render(<AppShell user={owner}>Protected content</AppShell>);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.getByText("Demo Owner")).toBeInTheDocument();
    expect(screen.getAllByText("OWNER").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Demo Settings" }),
    ).toHaveAttribute("aria-current", "page");

    expect(
      screen.getByRole("link", { name: "Settings" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("does not render internal clinic links for PATIENT", () => {
    render(<AppShell user={patient}>Patient content</AppShell>);

    expect(screen.getByRole("link", { name: "My Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Profile" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Patients" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Appointments" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("opens and closes mobile navigation with an accessible Sheet", async () => {
    const user = userEvent.setup();

    render(<AppShell user={owner}>Protected content</AppShell>);

    await user.click(
      screen.getByRole("button", { name: "Open navigation" }),
    );

    expect(
      await screen.findByText("Clinic workspace navigation"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByText("Clinic workspace navigation"),
    ).not.toBeInTheDocument();
  });

  it("provides keyboard skip navigation to the main content", async () => {
    const user = userEvent.setup();

    render(<AppShell user={owner}>Protected content</AppShell>);

    const skip = screen.getByRole("link", { name: "Skip to main content" });
    const main = document.getElementById("main-content");

    expect(skip).toHaveAttribute("href", "#main-content");
    expect(skip).toHaveClass("min-h-11", "min-w-11");
    expect(main).toHaveAttribute("tabindex", "-1");

    await user.tab();
    expect(skip).toHaveFocus();
  });
});
