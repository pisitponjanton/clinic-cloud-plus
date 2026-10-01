import { redirect } from "next/navigation";

import { PatientHistoryView } from "@/components/patient-portal/patient-history-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getPatientHistoryProjection } from "@/src/patient-portal/queue-history-projection";

export default async function MyHistoryPage() {
  const user = await requireCurrentUser();

  if (user.role !== "PATIENT") {
    redirect("/dashboard");
  }

  return (
    <PatientHistoryView projection={getPatientHistoryProjection(user)} />
  );
}
