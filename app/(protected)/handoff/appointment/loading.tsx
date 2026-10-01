import { LoadingState } from "@/components/shared";

export default function AppointmentHandoffLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <LoadingState label="Validating prepared appointment handoff" rows={4} />
    </div>
  );
}
