import type { AuthUser } from "@/src/auth/user";
import {
  assertCanCancelAppointment,
  assertCanUpdateAppointment,
  getAuthorizedAppointmentById,
  getAuthorizedAppointments,
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

export type AppointmentMutationPageData = {
  options: Pick<CreateAppointmentOptions, "doctors" | "services">;
  baseAppointments: Appointment[];
  baseAppointment: Appointment;
};

export function getAppointmentMutationPageData(
  user: AuthUser,
  appointmentId: string,
): AppointmentMutationPageData | null {
  const appointment = getAuthorizedAppointmentById(user, appointmentId);

  if (!appointment) {
    return null;
  }

  assertCanUpdateAppointment(user, appointment);
  assertCanCancelAppointment(user, appointment);

  const activeDoctors = getDoctors().filter((doctor) => doctor.active);
  const doctors: CreateAppointmentOption[] =
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
      doctors,
      services,
    },
    baseAppointments: getAuthorizedAppointments(user),
    baseAppointment: appointment,
  };
}
