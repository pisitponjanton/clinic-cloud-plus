import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/src/auth/user";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  redirect: vi.fn(),
  getCreateAppointmentPageData: vi.fn(),
}));

vi.mock("@/src/auth/protected", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/src/appointments/create-options", () => ({
  getCreateAppointmentPageData: mocks.getCreateAppointmentPageData,
}));

vi.mock("@/components/appointments/create-appointment-form", () => ({
  CreateAppointmentForm: () => null,
}));

import CreateAppointmentPage from "@/app/(protected)/appointments/new/page";

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

const pageData = {
  options: {
    patients: [
      {
        value: "PAT-001",
        label: "HN000001 · สมชาย ใจดี",
      },
    ],
    doctors: [],
    services: [],
  },
  baseAppointments: [],
};

describe("/appointments/new route", () => {
  beforeEach(() => {
    mocks.requireCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.getCreateAppointmentPageData.mockReset();

    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`REDIRECT:${destination}`);
    });
  });

  it("redirects PATIENT before create options are loaded", async () => {
    mocks.requireCurrentUser.mockResolvedValue(patient);

    await expect(
      CreateAppointmentPage({
        searchParams: Promise.resolve({ patientId: "PAT-001" }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mocks.getCreateAppointmentPageData).not.toHaveBeenCalled();
  });

  it("prefills only an authorized patientId from the query string", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getCreateAppointmentPageData.mockReturnValue(pageData);

    const element = await CreateAppointmentPage({
      searchParams: Promise.resolve({ patientId: "PAT-001" }),
    });

    const formElement = element.props.children[1];

    expect(formElement.props.initialDraft).toEqual({
      patientId: "PAT-001",
    });
  });

  it("ignores an out-of-scope patientId instead of trusting the URL", async () => {
    mocks.requireCurrentUser.mockResolvedValue(staff);
    mocks.getCreateAppointmentPageData.mockReturnValue(pageData);

    const element = await CreateAppointmentPage({
      searchParams: Promise.resolve({ patientId: "PAT-999" }),
    });

    const formElement = element.props.children[1];

    expect(formElement.props.initialDraft).toBeUndefined();
  });
});
