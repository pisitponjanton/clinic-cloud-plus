import { LoadingState, PageHeader } from "@/components/shared";

export default function DemoSettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="OWNER"
        title="Loading demo settings"
        description="Preparing Base and browser-local demo state."
      />
      <LoadingState label="Loading demo settings" rows={5} />
    </div>
  );
}
