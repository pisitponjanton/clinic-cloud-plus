import { LoadingState, PageHeader } from "@/components/shared";

export default function MyQueueLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="Loading my queue"
        description="Preparing queue entries linked to your patient identity."
      />
      <LoadingState label="Loading my queue" rows={4} />
    </div>
  );
}
