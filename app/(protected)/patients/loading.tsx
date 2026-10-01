import { LoadingState, PageHeader } from "@/components/shared";

export default function PatientsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="Patients"
        title="Loading patient list"
        description="Preparing the patient records available to your role."
      />
      <LoadingState label="Loading patients" rows={6} />
    </div>
  );
}
