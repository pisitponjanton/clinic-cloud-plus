import { redirect } from "next/navigation";

import { PatientAppointmentsView } from "@/components/patient-portal/patient-appointments-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getPatientAppointmentsProjection } from "@/src/patient-portal/projection";

export default async function MyAppointmentsPage() {
  const user = await requireCurrentUser();

  if (user.role !== "PATIENT") {
    redirect("/dashboard");
  }

  const projection = getPatientAppointmentsProjection(user);

  return <PatientAppointmentsView projection={projection} />;
}
