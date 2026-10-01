import { redirect } from "next/navigation";

import { CreateAppointmentForm } from "@/components/appointments/create-appointment-form";
import { PageHeader } from "@/components/shared";
import { requireCurrentUser } from "@/src/auth/protected";
import { getCreateAppointmentPageData } from "@/src/appointments/create-options";

type CreateAppointmentPageProps = {
  searchParams: Promise<{
    patientId?: string | string[];
  }>;
};

export default async function CreateAppointmentPage({
  searchParams,
}: CreateAppointmentPageProps) {
  const user = await requireCurrentUser();

  if (user.role === "PATIENT") {
    redirect("/dashboard");
  }

  const data = getCreateAppointmentPageData(user);
  const params = await searchParams;
  const requestedPatientId = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;

  const initialPatientId = data.options.patients.some(
    (option) => option.value === requestedPatientId,
  )
    ? requestedPatientId
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow={user.role}
        title="Create appointment"
        description="Prepare a browser-local demo appointment, review the exact values, then confirm before anything is written."
      />

      <CreateAppointmentForm
        options={data.options}
        baseAppointments={data.baseAppointments}
        initialDraft={
          initialPatientId
            ? {
                patientId: initialPatientId,
              }
            : undefined
        }
      />
    </div>
  );
}
