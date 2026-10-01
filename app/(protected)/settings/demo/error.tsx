"use client";

import { RefreshCwIcon } from "lucide-react";

import { FeedbackAlert, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function DemoSettingsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-section">
      <PageHeader
        eyebrow="OWNER"
        title="Demo settings unavailable"
        description="The demo reset context could not be prepared."
      />
      <FeedbackAlert
        tone="error"
        title="Could not load demo settings"
        description="Try again. Reset permission will be checked again before browser-local data controls are shown."
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
