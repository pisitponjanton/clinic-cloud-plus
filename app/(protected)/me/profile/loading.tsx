import { LoadingState, PageHeader } from "@/components/shared";

export default function MyProfileLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="Loading my profile"
        description="Preparing your linked demo patient identity."
      />
      <LoadingState label="Loading my profile" rows={4} />
    </div>
  );
}
