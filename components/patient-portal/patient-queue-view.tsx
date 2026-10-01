import {
  CalendarDaysIcon,
  ClipboardListIcon,
  StethoscopeIcon,
} from "lucide-react";

import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/shared";
import type { PatientQueueProjection } from "@/src/patient-portal/queue-history-projection";

export function PatientQueueView({
  projection,
}: {
  projection: PatientQueueProjection;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My queue"
        description={`Queue entries linked to ${projection.patientName} (${projection.hn}) only.`}
      />

      <SectionCard
        title="Current & recent queue"
        description="Read-only Base Queue records linked to your authenticated patient identity."
      >
        {projection.queue.length === 0 ? (
          <EmptyState
            title="No queue entries"
            description="There are no queue entries linked to your demo patient identity."
          />
        ) : (
          <div className="grid gap-3">
            {projection.queue.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-2xl font-semibold tracking-tight">
                      {entry.queueNumber}
                    </p>
                    <p className="mt-1 font-mono text-meta text-muted-foreground">
                      {entry.id}
                    </p>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>

                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                      <CalendarDaysIcon className="size-4" aria-hidden="true" />
                      Date
                    </dt>
                    <dd className="mt-1 font-medium">{entry.date}</dd>
                  </div>

                  <div>
                    <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                      <StethoscopeIcon className="size-4" aria-hidden="true" />
                      Doctor
                    </dt>
                    <dd className="mt-1 font-medium">
                      {entry.doctorName ?? "Not assigned"}
                    </dd>
                  </div>

                  <div>
                    <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                      <ClipboardListIcon className="size-4" aria-hidden="true" />
                      Appointment
                    </dt>
                    <dd className="mt-1 font-mono font-medium">
                      {entry.appointmentId ?? "Not linked"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <p className="text-meta text-muted-foreground">
        Queue status is read-only in this MVP. Internal queue controls are not
        exposed to patient accounts.
      </p>
    </div>
  );
}
