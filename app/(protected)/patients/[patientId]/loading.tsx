import { LoadingState, PageHeader } from "@/components/shared";

export default function PatientDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="Patient"
        title="Loading patient context"
        description="Preparing authorized patient, appointment, and history records."
      />
      <LoadingState label="Loading patient context" rows={5} />
    </div>
  );
}
