import { LoadingState, PageHeader } from "@/components/shared";

export default function QueueLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="Queue"
        title="Loading queue"
        description="Preparing the Base Queue entries available to your authenticated role."
      />
      <LoadingState label="Loading queue entries" rows={6} />
    </div>
  );
}
