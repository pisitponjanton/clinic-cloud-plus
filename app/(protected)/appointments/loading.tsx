import { LoadingState, PageHeader } from "@/components/shared";

export default function AppointmentsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="Appointments"
        title="Loading appointments"
        description="Preparing the appointment records available to your role."
      />
      <LoadingState label="Loading appointments" rows={6} />
    </div>
  );
}
