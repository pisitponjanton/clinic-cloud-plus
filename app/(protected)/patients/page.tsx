import { redirect } from "next/navigation";

import { PatientListView } from "@/components/patients/patient-list-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getPatientListProjection } from "@/src/patients/list-projection";

type PatientsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function PatientsPage({
  searchParams,
}: PatientsPageProps) {
  const user = await requireCurrentUser();

  if (user.role === "PATIENT") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const projection = getPatientListProjection(user, query);

  return <PatientListView role={user.role} projection={projection} />;
}
