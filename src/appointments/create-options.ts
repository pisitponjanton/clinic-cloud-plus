import type { AuthUser } from "@/src/auth/user";
import {
  assertCanCreateAppointment,
  getAuthorizedAppointments,
  getAuthorizedPatients,
} from "@/src/authorization/data";
import {
  getDoctors,
  getServices,
} from "@/src/data-access/public";
import type { Appointment } from "@/src/types/private-data";
import type {
  CreateAppointmentOption,
  CreateAppointmentOptions,
} from "@/src/appointments/create-contract";

export type CreateAppointmentPageData = {
  options: CreateAppointmentOptions;
  baseAppointments: Appointment[];
};

export function getCreateAppointmentPageData(
  user: AuthUser,
): CreateAppointmentPageData {
  assertCanCreateAppointment(user);

  const patients: CreateAppointmentOption[] = getAuthorizedPatients(user).map(
    (patient) => ({
      value: patient.id,
      label: `${patient.hn} · ${patient.firstName} ${patient.lastName}`,
      description: patient.id,
    }),
  );

  const activeDoctors = getDoctors().filter((doctor) => doctor.active);
  const doctors =
    user.role === "DOCTOR"
      ? activeDoctors
          .filter((doctor) => doctor.id === user.linkedDoctorId)
          .map((doctor) => ({
            value: doctor.id,
            label: doctor.displayName,
            description: doctor.specialty,
          }))
      : activeDoctors.map((doctor) => ({
          value: doctor.id,
          label: doctor.displayName,
          description: doctor.specialty,
        }));

  const services: CreateAppointmentOption[] = getServices()
    .filter((service) => service.active)
    .map((service) => ({
      value: service.id,
      label: service.name,
      description: `${service.durationMinutes} min · ฿${service.price}`,
    }));

  return {
    options: {
      patients,
      doctors,
      services,
    },
    baseAppointments: getAuthorizedAppointments(user),
  };
}
