"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function AppointmentsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="Appointments"
        title="Appointments unavailable"
        description="The authorized appointment list could not be prepared from the demo dataset."
      />

      <FeedbackAlert
        tone="error"
        title="Could not load appointments"
        description="Try loading the appointment list again. Your role scope will be checked before any private records are shown."
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
