import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";

export default function PatientDetailNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="Patient"
        title="Patient context unavailable"
        description="This patient record was not found or is not available in your current role scope."
      />

      <EmptyState
        title="Patient not available"
        description="Return to the authorized patient list and select a patient from the records available to your role."
        action={
          <Link
            href="/patients"
            className={buttonVariants({ variant: "outline" })}
          >
            Back to patients
          </Link>
        }
      />
    </div>
  );
}
