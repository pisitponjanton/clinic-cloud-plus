import { notFound, redirect } from "next/navigation";

import { PatientDetailView } from "@/components/patients/patient-detail-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { AuthorizationError } from "@/src/authorization/permissions";
import {
  getPatientDetailProjection,
  type PatientDetailProjection,
} from "@/src/patients/detail-projection";

type PatientDetailPageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const user = await requireCurrentUser();

  if (user.role === "PATIENT") {
    redirect("/dashboard");
  }

  const { patientId } = await params;
  let projection: PatientDetailProjection | null;

  try {
    projection = getPatientDetailProjection(user, patientId);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notFound();
    }

    throw error;
  }

  if (!projection) {
    notFound();
  }

  return <PatientDetailView role={user.role} projection={projection} />;
}
