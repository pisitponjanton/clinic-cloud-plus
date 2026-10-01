"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function MyAppointmentsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My appointments unavailable"
        description="Your appointment records could not be prepared."
      />
      <FeedbackAlert
        tone="error"
        title="Could not load my appointments"
        description="Try again. Only appointments linked to your authenticated patient identity will be shown."
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
