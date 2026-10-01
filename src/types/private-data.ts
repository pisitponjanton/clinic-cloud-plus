export type UserRole = "OWNER" | "STAFF" | "DOCTOR" | "NURSE" | "PATIENT";

export type DemoUser = {
  id: string;
  clinicId: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  linkedPatientId: string | null;
  linkedDoctorId: string | null;
  active: boolean;
};

export type PatientGender = "MALE" | "FEMALE" | "OTHER";

export type Patient = {
  id: string;
  clinicId: string;
  hn: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: PatientGender;
};

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED";

export type Appointment = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string | null;
  serviceId: string | null;
  date: string;
  time: string;
  status: AppointmentStatus;
  note: string;
};

export type QueueStatus =
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED";

export type QueueEntry = {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentId: string | null;
  doctorId: string | null;
  queueNumber: string;
  status: QueueStatus;
  date: string;
};

export type PatientHistory = {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string | null;
  appointmentId: string | null;
  date: string;
  summary: string;
};

export type PrivateDataset = {
  users: DemoUser[];
  patients: Patient[];
  appointments: Appointment[];
  queue: QueueEntry[];
  histories: PatientHistory[];
};
