import { redirect } from "next/navigation";

import { PatientProfileView } from "@/components/patient-portal/patient-profile-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getPatientProfileProjection } from "@/src/patient-portal/projection";

export default async function MyProfilePage() {
  const user = await requireCurrentUser();

  if (user.role !== "PATIENT") {
    redirect("/dashboard");
  }

  const projection = getPatientProfileProjection(user);

  return <PatientProfileView projection={projection} />;
}
