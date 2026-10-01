import { notFound, redirect } from "next/navigation";

import { AppointmentDetailView } from "@/components/appointments/appointment-detail-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getAppointmentMutationPageData } from "@/src/appointments/mutation-options";
import {
  getAppointmentDetailProjection,
  type AppointmentDetailProjection,
} from "@/src/appointments/read-projection";
import { AuthorizationError } from "@/src/authorization/permissions";

type AppointmentDetailPageProps = {
  params: Promise<{
    appointmentId: string;
  }>;
};

export default async function AppointmentDetailPage({
  params,
}: AppointmentDetailPageProps) {
  const user = await requireCurrentUser();

  if (user.role === "PATIENT") {
    redirect("/dashboard");
  }

  const { appointmentId } = await params;
  let projection: AppointmentDetailProjection | null;
  let mutation;

  try {
    projection = getAppointmentDetailProjection(user, appointmentId);
    mutation = getAppointmentMutationPageData(user, appointmentId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notFound();
    }

    throw error;
  }

  if (!projection || !mutation) {
    notFound();
  }

  return (
    <AppointmentDetailView
      role={user.role}
      projection={projection}
      mutation={mutation}
    />
  );
}