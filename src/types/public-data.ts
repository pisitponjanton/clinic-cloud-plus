export const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type OpeningHoursEntry = {
  day: Weekday;
  open: string;
  close: string;
};

export type Clinic = {
  id: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  openingHours: OpeningHoursEntry[];
};

export type PublicDoctor = {
  id: string;
  clinicId: string;
  displayName: string;
  specialty: string;
  publicBio: string;
  active: boolean;
};

export type Service = {
  id: string;
  clinicId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  active: boolean;
};

export type Promotion = {
  id: string;
  clinicId: string;
  title: string;
  description: string;
  serviceIds: string[];
  startDate: string;
  endDate: string;
  active: boolean;
};

export type PublicDataset = {
  clinic: Clinic;
  doctors: PublicDoctor[];
  services: Service[];
  promotions: Promotion[];
};

/**
 * Public doctor records are intentionally limited to these fields.
 * Internal schedules, appointments, patients, user identity, and staff-only data
 * must never be added to the public projection.
 */
export const PUBLIC_DOCTOR_FIELDS = [
  "id",
  "clinicId",
  "displayName",
  "specialty",
  "publicBio",
  "active",
] as const satisfies readonly (keyof PublicDoctor)[];
