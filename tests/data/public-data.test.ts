import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type {
  Clinic,
  Promotion,
  PublicDoctor,
  Service,
} from "@/src/types/public-data";
import { PUBLIC_DOCTOR_FIELDS, WEEKDAYS } from "@/src/types/public-data";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const clinic = readJson<Clinic>("src/data/public/clinic.json");
const doctors = readJson<PublicDoctor[]>("src/data/public/doctors.json");
const services = readJson<Service[]>("src/data/public/services.json");
const promotions = readJson<Promotion[]>("src/data/public/promotions.json");

describe("public seed dataset", () => {
  it("meets the public minimum seed volume from SPEC", () => {
    expect(clinic.id).toBe("CLINIC-001");
    expect(doctors).toHaveLength(4);
    expect(services).toHaveLength(8);
    expect(promotions).toHaveLength(3);
  });

  it("uses stable public entity ID prefixes", () => {
    expect(doctors.every((doctor) => /^DOC-\d{3}$/.test(doctor.id))).toBe(true);
    expect(services.every((service) => /^SVC-\d{3}$/.test(service.id))).toBe(true);
    expect(
      promotions.every((promotion) => /^PROMO-\d{3}$/.test(promotion.id)),
    ).toBe(true);
  });

  it("keeps all public records attached to the demo clinic", () => {
    expect(doctors.every((doctor) => doctor.clinicId === clinic.id)).toBe(true);
    expect(services.every((service) => service.clinicId === clinic.id)).toBe(true);
    expect(
      promotions.every((promotion) => promotion.clinicId === clinic.id),
    ).toBe(true);
  });

  it("keeps doctor records to the explicit public-safe projection", () => {
    for (const doctor of doctors) {
      expect(Object.keys(doctor).sort()).toEqual(
        [...PUBLIC_DOCTOR_FIELDS].sort(),
      );
    }
  });

  it("does not expose patient, HN, auth, appointment, or internal schedule keys", () => {
    const serialized = JSON.stringify({ clinic, doctors, services, promotions });
    const forbiddenKeys = [
      "patientId",
      "linkedPatientId",
      "linkedDoctorId",
      "passwordHash",
      "hn",
      "appointmentId",
      "appointments",
      "queueId",
      "internalSchedule",
    ];

    for (const key of forbiddenKeys) {
      expect(serialized).not.toContain(`"${key}"`);
    }
  });

  it("stores public service prices and durations as positive numbers", () => {
    for (const service of services) {
      expect(service.price).toBeGreaterThan(0);
      expect(service.durationMinutes).toBeGreaterThan(0);
    }
  });

  it("uses valid weekday names and opening/closing time strings", () => {
    for (const entry of clinic.openingHours) {
      expect(WEEKDAYS).toContain(entry.day);
      expect(entry.open).toMatch(/^\d{2}:\d{2}$/);
      expect(entry.close).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("keeps promotion service references inside the public service catalog", () => {
    const serviceIds = new Set(services.map((service) => service.id));

    for (const promotion of promotions) {
      expect(promotion.serviceIds.length).toBeGreaterThan(0);
      expect(
        promotion.serviceIds.every((serviceId) => serviceIds.has(serviceId)),
      ).toBe(true);
    }
  });
});
