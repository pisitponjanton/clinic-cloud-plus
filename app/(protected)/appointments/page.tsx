import { redirect } from "next/navigation";

import { AppointmentListView } from "@/components/appointments/appointment-list-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getAppointmentListProjection } from "@/src/appointments/read-projection";

type AppointmentsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    date?: string | string[];
  }>;
};

export default async function AppointmentsPage({
  searchParams,
}: AppointmentsPageProps) {
  const user = await requireCurrentUser();

  if (user.role === "PATIENT") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const status = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;

  const projection = getAppointmentListProjection(user, {
    status,
    date,
  });

  return <AppointmentListView role={user.role} projection={projection} />;
}
