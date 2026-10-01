import { InternalDashboard } from "@/components/dashboard/internal-dashboard";
import { PatientDashboard } from "@/components/dashboard/patient-dashboard";
import { requireCurrentUser } from "@/src/auth/protected";
import { getDashboardProjection } from "@/src/dashboard/projection";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const projection = getDashboardProjection(user);

  return projection.kind === "patient" ? (
    <PatientDashboard projection={projection} />
  ) : (
    <InternalDashboard user={user} projection={projection} />
  );
}