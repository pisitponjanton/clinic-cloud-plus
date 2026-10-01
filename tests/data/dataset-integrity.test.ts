import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type {
  Clinic,
  Promotion,
  PublicDoctor,
  Service,
} from "@/src/types/public-data";
import type {
  Appointment,
  DemoUser,
  Patient,
  PatientHistory,
  QueueEntry,
} from "@/src/types/private-data";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function expectUnique(values: string[], label: string) {
  expect(new Set(values).size, `${label} must be unique`).toBe(values.length);
}

const clinic = readJson<Clinic>("src/data/public/clinic.json");
const doctors = readJson<PublicDoctor[]>("src/data/public/doctors.json");
const services = readJson<Service[]>("src/data/public/services.json");
const promotions = readJson<Promotion[]>("src/data/public/promotions.json");

const users = readJson<DemoUser[]>("src/data/private/users.json");
const patients = readJson<Patient[]>("src/data/private/patients.json");
const appointments = readJson<Appointment[]>(
  "src/data/private/appointments.json",
);
const queue = readJson<QueueEntry[]>("src/data/private/queue.json");
const histories = readJson<PatientHistory[]>(
  "src/data/private/histories.json",
);

const doctorIds = new Set(doctors.map((record) => record.id));
const serviceIds = new Set(services.map((record) => record.id));
const patientIds = new Set(patients.map((record) => record.id));
const appointmentIds = new Set(appointments.map((record) => record.id));

const appointmentsById = new Map(
  appointments.map((appointment) => [appointment.id, appointment]),
);

describe("dataset integrity", () => {
  it("parses every expected Base JSON file and preserves the public/private split", () => {
    expect(readdirSync("src/data/public").sort()).toEqual([
      "clinic.json",
      "doctors.json",
      "promotions.json",
      "services.json",
    ]);
    expect(readdirSync("src/data/private").sort()).toEqual([
      "appointments.json",
      "histories.json",
      "patients.json",
      "queue.json",
      "users.json",
    ]);
  });

  it("meets every minimum dataset count in SPEC", () => {
    expect(clinic.id).toBe("CLINIC-001");
    expect(users.length).toBeGreaterThanOrEqual(5);
    expect(doctors.length).toBeGreaterThanOrEqual(4);
    expect(patients.length).toBeGreaterThanOrEqual(20);
    expect(appointments.length).toBeGreaterThanOrEqual(30);
    expect(queue.length).toBeGreaterThanOrEqual(8);
    expect(histories.length).toBeGreaterThanOrEqual(30);
    expect(services.length).toBeGreaterThanOrEqual(8);
    expect(promotions.length).toBeGreaterThanOrEqual(3);
  });

  it("uses unique stable IDs and unique domain identifiers where required", () => {
    expectUnique(users.map((record) => record.id), "user IDs");
    expectUnique(doctors.map((record) => record.id), "doctor IDs");
    expectUnique(patients.map((record) => record.id), "patient IDs");
    expectUnique(appointments.map((record) => record.id), "appointment IDs");
    expectUnique(queue.map((record) => record.id), "queue IDs");
    expectUnique(histories.map((record) => record.id), "history IDs");
    expectUnique(services.map((record) => record.id), "service IDs");
    expectUnique(promotions.map((record) => record.id), "promotion IDs");

    expect(users.every((record) => /^USR-[A-Z]+-\d{3}$/.test(record.id))).toBe(true);
    expect(doctors.every((record) => /^DOC-\d{3}$/.test(record.id))).toBe(true);
    expect(patients.every((record) => /^PAT-\d{3}$/.test(record.id))).toBe(true);
    expect(appointments.every((record) => /^APT-\d{3}$/.test(record.id))).toBe(true);
    expect(queue.every((record) => /^QUEUE-\d{3}$/.test(record.id))).toBe(true);
    expect(histories.every((record) => /^HIST-\d{3}$/.test(record.id))).toBe(true);
    expect(services.every((record) => /^SVC-\d{3}$/.test(record.id))).toBe(true);
    expect(promotions.every((record) => /^PROMO-\d{3}$/.test(record.id))).toBe(true);

    expectUnique(users.map((record) => record.email), "demo user emails");
    expectUnique(patients.map((record) => record.hn), "patient HNs");
    expectUnique(queue.map((record) => record.queueNumber), "queue numbers");
  });
  it("keeps all records attached to the seeded clinic", () => {
    const recordsWithClinicId = [
      ...users,
      ...doctors,
      ...patients,
      ...appointments,
      ...queue,
      ...histories,
      ...services,
      ...promotions,
    ];

    expect(
      recordsWithClinicId.every((record) => record.clinicId === clinic.id),
    ).toBe(true);
  });

  it("resolves every appointment patient, doctor, and service reference", () => {
    for (const appointment of appointments) {
      expect(patientIds.has(appointment.patientId)).toBe(true);

      if (appointment.doctorId !== null) {
        expect(doctorIds.has(appointment.doctorId)).toBe(true);
      }

      if (appointment.serviceId !== null) {
        expect(serviceIds.has(appointment.serviceId)).toBe(true);
      }
    }
  });

  it("resolves queue references and keeps queue context consistent with its appointment", () => {
    for (const entry of queue) {
      expect(patientIds.has(entry.patientId)).toBe(true);

      if (entry.doctorId !== null) {
        expect(doctorIds.has(entry.doctorId)).toBe(true);
      }

      if (entry.appointmentId !== null) {
        expect(appointmentIds.has(entry.appointmentId)).toBe(true);

        const appointment = appointmentsById.get(entry.appointmentId);
        expect(appointment?.patientId).toBe(entry.patientId);
        expect(appointment?.doctorId).toBe(entry.doctorId);
      }
    }
  });

  it("resolves history references and keeps linked appointment context consistent", () => {
    for (const history of histories) {
      expect(patientIds.has(history.patientId)).toBe(true);

      if (history.doctorId !== null) {
        expect(doctorIds.has(history.doctorId)).toBe(true);
      }

      if (history.appointmentId !== null) {
        expect(appointmentIds.has(history.appointmentId)).toBe(true);

        const appointment = appointmentsById.get(history.appointmentId);
        expect(appointment?.patientId).toBe(history.patientId);
        expect(appointment?.doctorId).toBe(history.doctorId);
      }
    }
  });

  it("resolves linked patient and doctor demo identities exactly once", () => {
    const patientUsers = users.filter((user) => user.linkedPatientId !== null);
    const doctorUsers = users.filter((user) => user.linkedDoctorId !== null);

    expect(patientUsers).toHaveLength(1);
    expect(doctorUsers).toHaveLength(1);

    expect(patientUsers[0]?.role).toBe("PATIENT");
    expect(patientUsers[0]?.linkedPatientId).toBe("PAT-001");
    expect(patientIds.has(patientUsers[0]?.linkedPatientId ?? "")).toBe(true);

    expect(doctorUsers[0]?.role).toBe("DOCTOR");
    expect(doctorUsers[0]?.linkedDoctorId).toBe("DOC-001");
    expect(doctorIds.has(doctorUsers[0]?.linkedDoctorId ?? "")).toBe(true);
  });

  it("resolves every promotion service reference", () => {
    for (const promotion of promotions) {
      expect(promotion.serviceIds.length).toBeGreaterThan(0);
      expect(
        promotion.serviceIds.every((serviceId) => serviceIds.has(serviceId)),
      ).toBe(true);
    }
  });

  it("keeps public JSON free from private patient/auth/operational keys", () => {
    const publicSerialized = JSON.stringify({
      clinic,
      doctors,
      services,
      promotions,
    });

    const forbiddenPublicKeys = [
      "passwordHash",
      "linkedPatientId",
      "linkedDoctorId",
      "patientId",
      "hn",
      "appointmentId",
      "queueNumber",
      "summary",
    ];

    for (const key of forbiddenPublicKeys) {
      expect(publicSerialized).not.toContain(`"${key}"`);
    }
  });

  it("provides one deterministic linked scenario for the A/B experiment", () => {
    const patient = patients.find((record) => record.id === "PAT-001");
    const patientAppointments = appointments.filter(
      (appointment) => appointment.patientId === "PAT-001",
    );
    const patientHistories = histories.filter(
      (history) => history.patientId === "PAT-001",
    );
    const patientQueue = queue.filter((entry) => entry.patientId === "PAT-001");

    expect(patient).toMatchObject({
      id: "PAT-001",
      hn: "HN000001",
      firstName: "สมชาย",
      lastName: "ใจดี",
    });

    expect(
      patientAppointments.some(
        (appointment) =>
          appointment.status === "COMPLETED" &&
          appointment.date < "2026-10-01",
      ),
    ).toBe(true);

    expect(
      patientAppointments.some(
        (appointment) =>
          appointment.date >= "2026-10-01" &&
          appointment.status !== "CANCELLED",
      ),
    ).toBe(true);

    expect(patientHistories.length).toBeGreaterThan(0);
    expect(patientQueue.length).toBeGreaterThan(0);

    for (const appointment of patientAppointments) {
      if (appointment.doctorId !== null) {
        expect(doctorIds.has(appointment.doctorId)).toBe(true);
      }
    }
  });
});
