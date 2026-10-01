"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function PatientsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="Patients"
        title="Patient list unavailable"
        description="The authorized patient list could not be prepared from the demo dataset."
      />

      <FeedbackAlert
        tone="error"
        title="Could not load patients"
        description="Try loading the patient list again. Your role and data scope will be checked again before any records are shown."
      />

      <div>
        <Button type="button" variant="outline" onClick={reset}>
          <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
}
