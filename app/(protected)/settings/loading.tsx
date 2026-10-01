import { LoadingState, PageHeader } from "@/components/shared";

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="OWNER"
        title="Loading settings"
        description="Preparing Clinic Cloud + demo configuration."
      />
      <LoadingState label="Loading settings" rows={5} />
    </div>
  );
}
