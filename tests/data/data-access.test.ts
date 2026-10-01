import { describe, expect, it } from "vitest";

import {
  getClinic,
  getDoctorById,
  getDoctors,
  getPromotionById,
  getPromotions,
  getServiceById,
  getServices,
  searchServices,
} from "@/src/data-access/public";
import {
  getAppointmentById,
  getAppointmentContextById,
  getAppointments,
  getAppointmentsByDoctor,
  getAppointmentsByPatient,
  getPatientById,
  getPatientHistory,
  getPatientHistoryContext,
  getPatients,
  getQueue,
  getQueueByPatient,
  getQueueContext,
  getUserByEmail,
  getUserById,
  getUsers,
  searchPatients,
} from "@/src/data-access/private";

describe("base data access", () => {
  it("returns stable public Base Dataset records", () => {
    expect(getClinic().id).toBe("CLINIC-001");
    expect(getDoctors()).toHaveLength(4);
    expect(getServices()).toHaveLength(8);
    expect(getPromotions()).toHaveLength(3);

    expect(getDoctorById("DOC-001")?.displayName).toBe("นพ. สาธิต เมตตา");
    expect(getServiceById("SVC-001")?.price).toBe(500);
    expect(getPromotionById("PROMO-001")?.serviceIds).toEqual(["SVC-001"]);
  });

  it("searches public services without inventing missing records", () => {
    expect(searchServices("ผิวหนัง").map((service) => service.id)).toEqual([
      "SVC-004",
    ]);
    expect(searchServices("SVC-008").map((service) => service.id)).toEqual([
      "SVC-008",
    ]);
    expect(searchServices("not-a-real-service")).toEqual([]);
    expect(getServiceById("SVC-999")).toBeNull();
  });

  it("returns stable private Base Dataset records", () => {
    expect(getUsers()).toHaveLength(5);
    expect(getPatients()).toHaveLength(20);
    expect(getAppointments()).toHaveLength(30);
    expect(getQueue()).toHaveLength(8);

    expect(getUserById("USR-PATIENT-001")?.linkedPatientId).toBe("PAT-001");
    expect(getUserByEmail("PATIENT@CLINICCLOUD.DEMO")?.id).toBe(
      "USR-PATIENT-001",
    );
    expect(getPatientById("PAT-001")?.hn).toBe("HN000001");
  });

  it.each([
    ["สมชาย", "PAT-001"],
    ["สมชาย ใจดี", "PAT-001"],
    ["HN000001", "PAT-001"],
    ["0800000001", "PAT-001"],
    ["PAT-001", "PAT-001"],
  ])("searches patients by %s", (query, patientId) => {
    expect(searchPatients(query).map((patient) => patient.id)).toContain(
      patientId,
    );
  });

  it("returns no private record when an ID or search does not exist", () => {
    expect(getPatientById("PAT-999")).toBeNull();
    expect(getAppointmentById("APT-999")).toBeNull();
    expect(getUserById("USR-UNKNOWN-999")).toBeNull();
    expect(searchPatients("not-a-real-patient")).toEqual([]);
  });

  it("filters appointments by patient and doctor", () => {
    const patientAppointments = getAppointmentsByPatient("PAT-001");
    const doctorAppointments = getAppointmentsByDoctor("DOC-001");

    expect(patientAppointments.length).toBeGreaterThanOrEqual(3);
    expect(
      patientAppointments.every(
        (appointment) => appointment.patientId === "PAT-001",
      ),
    ).toBe(true);
    expect(doctorAppointments.length).toBeGreaterThan(0);
    expect(
      doctorAppointments.every(
        (appointment) => appointment.doctorId === "DOC-001",
      ),
    ).toBe(true);
  });

  it("resolves appointment relationships from one shared Base Dataset", () => {
    const context = getAppointmentContextById("APT-001");

    expect(context).not.toBeNull();
    expect(context?.appointment.patientId).toBe("PAT-001");
    expect(context?.patient.id).toBe("PAT-001");
    expect(context?.doctor?.id).toBe("DOC-001");
    expect(context?.service?.id).toBe("SVC-001");
    expect(getAppointmentContextById("APT-999")).toBeNull();
  });

  it("resolves queue context and patient-specific queue reads", () => {
    const entries = getQueueByPatient("PAT-001");
    const context = getQueueContext("QUEUE-001");

    expect(entries.map((entry) => entry.id)).toContain("QUEUE-001");
    expect(context?.patient.id).toBe("PAT-001");
    expect(context?.appointment?.id).toBe("APT-001");
    expect(context?.doctor?.id).toBe("DOC-001");
    expect(getQueueContext("QUEUE-999")).toBeNull();
  });

  it("resolves patient history and linked context", () => {
    const history = getPatientHistory("PAT-001");
    const context = getPatientHistoryContext("HIST-001");

    expect(history.length).toBeGreaterThan(0);
    expect(context?.patient.id).toBe("PAT-001");
    expect(context?.appointment?.id).toBe("APT-002");
    expect(context?.doctor?.id).toBe("DOC-002");
    expect(getPatientHistoryContext("HIST-999")).toBeNull();
  });

  it("returns defensive copies instead of mutable Base Dataset references", () => {
    const clinic = getClinic();
    const patients = getPatients();
    const promotions = getPromotions();

    clinic.name = "Mutated Clinic";
    clinic.openingHours[0]!.open = "00:00";
    patients[0]!.firstName = "Mutated";
    promotions[0]!.serviceIds.push("SVC-999");

    expect(getClinic().name).toBe("Clinic Cloud + Demo Clinic");
    expect(getClinic().openingHours[0]?.open).toBe("09:00");
    expect(getPatientById("PAT-001")?.firstName).toBe("สมชาย");
    expect(getPromotionById("PROMO-001")?.serviceIds).toEqual(["SVC-001"]);
  });

  it("returns full collections for blank search queries without sharing references", () => {
    const patients = searchPatients(" ");
    const services = searchServices("");

    expect(patients).toHaveLength(20);
    expect(services).toHaveLength(8);

    patients.pop();
    services.pop();

    expect(getPatients()).toHaveLength(20);
    expect(getServices()).toHaveLength(8);
  });
});
