import { LoadingState, PageHeader } from "@/components/shared";

export default function AppointmentDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="Appointment"
        title="Loading appointment context"
        description="Preparing the authorized appointment and patient context."
      />
      <LoadingState label="Loading appointment context" rows={5} />
    </div>
  );
}
