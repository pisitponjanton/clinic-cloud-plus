import { LoadingState, PageHeader } from "@/components/shared";

export default function CreateAppointmentLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="Appointment"
        title="Loading create appointment"
        description="Preparing the patients, doctors, and services available to your role."
      />
      <LoadingState label="Loading appointment form" rows={5} />
    </div>
  );
}
