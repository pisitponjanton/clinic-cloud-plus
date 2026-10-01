"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function PatientDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="Patient"
        title="Patient context unavailable"
        description="The authorized patient context could not be prepared from the demo dataset."
      />

      <FeedbackAlert
        tone="error"
        title="Could not load patient context"
        description="Try loading this patient again. Authorization will be checked again before any private records are shown."
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
