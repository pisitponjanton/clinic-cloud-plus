import { redirect } from "next/navigation";

import { PatientQueueView } from "@/components/patient-portal/patient-queue-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getPatientQueueProjection } from "@/src/patient-portal/queue-history-projection";

export default async function MyQueuePage() {
  const user = await requireCurrentUser();

  if (user.role !== "PATIENT") {
    redirect("/dashboard");
  }

  return (
    <PatientQueueView projection={getPatientQueueProjection(user)} />
  );
}
