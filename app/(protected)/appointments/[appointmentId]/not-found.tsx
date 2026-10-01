import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";

export default function AppointmentDetailNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="Appointment"
        title="Appointment unavailable"
        description="This appointment was not found or is not available in your current role scope."
      />

      <EmptyState
        title="Appointment not available"
        description="Return to the authorized appointment list and select a record available to your role."
        action={
          <Link
            href="/appointments"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to appointments
          </Link>
        }
      />
    </div>
  );
}
