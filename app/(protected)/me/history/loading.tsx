import { LoadingState, PageHeader } from "@/components/shared";

export default function MyHistoryLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="Loading my history"
        description="Preparing synthetic history linked to your patient identity."
      />
      <LoadingState label="Loading my history" rows={5} />
    </div>
  );
}
