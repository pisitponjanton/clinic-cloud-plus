"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="Dashboard"
        title="Dashboard unavailable"
        description="The dashboard context could not be prepared from the demo dataset."
      />

      <FeedbackAlert
        tone="error"
        title="Could not load dashboard"
        description="Try loading the dashboard again. If the problem continues, use another Demo Account after signing out."
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
