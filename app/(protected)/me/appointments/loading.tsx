import { LoadingState, PageHeader } from "@/components/shared";

export default function MyAppointmentsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="Loading my appointments"
        description="Preparing appointments linked to your patient identity."
      />
      <LoadingState label="Loading my appointments" rows={6} />
    </div>
  );
}
