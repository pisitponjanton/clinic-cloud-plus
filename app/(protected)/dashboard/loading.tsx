import { LoadingState, PageHeader } from "@/components/shared";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="Dashboard"
        title="Loading your workspace"
        description="Preparing the clinic context available to your role."
      />
      <LoadingState label="Loading dashboard context" rows={5} />
    </div>
  );
}
