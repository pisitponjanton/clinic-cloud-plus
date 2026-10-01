import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatientListView } from "@/components/patients/patient-list-view";
import { toAuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";
import { getUserById } from "@/src/data-access/private";
import { getPatientListProjection } from "@/src/patients/list-projection";

function user(userId: string) {
  const seeded = getUserById(userId);

  if (!seeded) {
    throw new Error(`Missing seeded user: ${userId}`);
  }

  return toAuthUser(seeded);
}

const owner = user("USR-OWNER-001");
const staff = user("USR-STAFF-001");
const doctor = user("USR-DOCTOR-001");
const patient = user("USR-PATIENT-001");

describe("patient list projection", () => {
  it("returns the full clinic patient scope for OWNER and STAFF", () => {
    expect(getPatientListProjection(owner, undefined)).toMatchObject({
      query: "",
      totalInScope: 20,
      resultCount: 20,
    });

    expect(getPatientListProjection(staff, "")).toMatchObject({
      totalInScope: 20,
      resultCount: 20,
    });
  });

  it("keeps DOCTOR results inside relevant patient scope", () => {
    const projection = getPatientListProjection(doctor, undefined);

    expect(projection.totalInScope).toBeGreaterThan(0);
    expect(projection.totalInScope).toBeLessThan(20);
    expect(projection.resultCount).toBe(projection.totalInScope);
  });

  it.each([
    ["สมชาย", "PAT-001"],
    ["HN000001", "PAT-001"],
    ["PAT-001", "PAT-001"],
    ["0800000001", "PAT-001"],
  ])("searches authorized records by %s", (query, expectedId) => {
    const projection = getPatientListProjection(staff, query);

    expect(projection.items.map((item) => item.id)).toContain(expectedId);
  });

  it("trims search input and returns no fabricated records", () => {
    const found = getPatientListProjection(staff, "  HN000001  ");
    const missing = getPatientListProjection(staff, "not-a-real-patient");

    expect(found.query).toBe("HN000001");
    expect(found.items.map((item) => item.id)).toEqual(["PAT-001"]);
    expect(missing.resultCount).toBe(0);
    expect(missing.items).toEqual([]);
  });

  it("rejects PATIENT at the authorization boundary", () => {
    expect(() => getPatientListProjection(patient, "")).toThrow(
      AuthorizationError,
    );
  });
});

describe("patient list UI", () => {
  it("renders search-first personnel workflow and patient detail links", () => {
    const projection = getPatientListProjection(staff, "HN000001");

    render(<PatientListView role="STAFF" projection={projection} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Patients" }),
    ).toBeInTheDocument();

    const search = screen.getByRole("searchbox", {
      name: "Search patients",
    });
    expect(search).toHaveValue("HN000001");
    expect(search).toHaveAttribute("name", "q");

    expect(screen.getAllByText("สมชาย ใจดี").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HN000001").length).toBeGreaterThan(0);

    const openLinks = screen.getAllByRole("link", { name: "Open patient" });
    expect(
      openLinks.some(
        (link) => link.getAttribute("href") === "/patients/PAT-001",
      ),
    ).toBe(true);
  });

  it("renders doctor-specific title and scope explanation", () => {
    const projection = getPatientListProjection(doctor, "");

    render(<PatientListView role="DOCTOR" projection={projection} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Relevant patients",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/assigned appointment, queue, or history context/),
    ).toBeInTheDocument();
  });

  it("renders a clear no-result state with a reset action", () => {
    const projection = getPatientListProjection(
      staff,
      "not-a-real-patient",
    );

    render(<PatientListView role="STAFF" projection={projection} />);

    expect(
      screen.getByText("No patients found"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No authorized patient record matches this search/),
    ).toBeInTheDocument();

    const clearLinks = screen.getAllByRole("link", { name: "Clear search" });
    expect(
      clearLinks.every((link) => link.getAttribute("href") === "/patients"),
    ).toBe(true);
  });
});
