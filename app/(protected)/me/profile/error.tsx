"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function MyProfileError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My profile unavailable"
        description="Your linked patient profile could not be prepared."
      />
      <FeedbackAlert
        tone="error"
        title="Could not load my profile"
        description="Try again. Your authenticated patient identity will be checked before any profile data is shown."
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
