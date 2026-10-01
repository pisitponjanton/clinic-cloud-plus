"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function SettingsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="OWNER"
        title="Settings unavailable"
        description="The demo configuration could not be prepared."
      />
      <FeedbackAlert
        tone="error"
        title="Could not load settings"
        description="Try again. OWNER authorization will be checked before settings data is shown."
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
