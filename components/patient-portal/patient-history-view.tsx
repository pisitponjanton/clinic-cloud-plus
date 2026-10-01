import {
  CalendarDaysIcon,
  FileClockIcon,
  StethoscopeIcon,
} from "lucide-react";

import {
  EmptyState,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import type { PatientHistoryProjection } from "@/src/patient-portal/queue-history-projection";

export function PatientHistoryView({
  projection,
}: {
  projection: PatientHistoryProjection;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My history"
        description={`Synthetic history linked to ${projection.patientName} (${projection.hn}) only.`}
      />

      <SectionCard
        title="Patient history"
        description="Read-only synthetic history from your authenticated patient scope."
      >
        {projection.history.length === 0 ? (
          <EmptyState
            title="No history available"
            description="There are no history entries linked to your demo patient identity."
          />
        ) : (
          <div className="grid gap-3">
            {projection.history.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 font-medium">
                      <FileClockIcon className="size-4" aria-hidden="true" />
                      {entry.id}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-2 text-meta text-muted-foreground">
                      <CalendarDaysIcon className="size-4" aria-hidden="true" />
                      {entry.date}
                    </p>
                  </div>
                  <p className="font-mono text-meta text-muted-foreground">
                    {entry.appointmentId ?? "No linked appointment"}
                  </p>
                </div>

                <p className="mt-4 text-sm leading-6">{entry.summary}</p>

                <p className="mt-4 inline-flex items-center gap-2 text-meta text-muted-foreground">
                  <StethoscopeIcon className="size-4" aria-hidden="true" />
                  {entry.doctorName ?? "Doctor not assigned"}
                </p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <p className="text-meta text-muted-foreground">
        These are synthetic demo history records. No real clinical information
        is stored in this MVP dataset.
      </p>
    </div>
  );
}
