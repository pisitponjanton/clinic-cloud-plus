import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  HistoryIcon,
  UserRoundIcon,
} from "lucide-react";

import {
  ContextPanel,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientDashboardProjection } from "@/src/dashboard/projection";

type PatientDashboardProps = {
  projection: PatientDashboardProjection;
};

export function PatientDashboard({ projection }: PatientDashboardProps) {
  const { patient, nextAppointment, currentQueue, recentHistory } = projection;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My Dashboard"
        description="Your personal clinic context only. This view does not expose other patient records."
      />

      <ContextPanel
        label="Patient"
        title={`${patient.firstName} ${patient.lastName}`}
        identifier={patient.hn}
        items={[
          { label: "Patient ID", value: patient.id },
          { label: "Demo day", value: projection.today },
        ]}
      />

      <div className="grid gap-section lg:grid-cols-2">
        <SectionCard
          title="Next appointment"
          description="Your nearest non-cancelled appointment from the demo day onward."
          action={
            <Link
              href="/me/appointments"
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "h-auto p-0",
              )}
            >
              My appointments
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          }
        >
          {nextAppointment ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-meta text-muted-foreground">
                    Appointment
                  </p>
                  <p className="mt-1 font-mono font-semibold">
                    {nextAppointment.id}
                  </p>
                </div>
                <StatusBadge status={nextAppointment.status} />
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-meta text-muted-foreground">Time</dt>
                  <dd className="mt-1 font-medium">{nextAppointment.time}</dd>
                </div>
                <div>
                  <dt className="text-meta text-muted-foreground">Service</dt>
                  <dd className="mt-1 font-medium">
                    {nextAppointment.serviceName ?? "Not assigned"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-meta text-muted-foreground">Doctor</dt>
                  <dd className="mt-1 font-medium">
                    {nextAppointment.doctorName ?? "Not assigned"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <EmptyState
              title="No upcoming appointment"
              description="There is no active appointment for your patient record."
            />
          )}
        </SectionCard>

        <SectionCard
          title="My queue"
          description="Your active queue entry for the demo day."
          tone="context"
          action={
            <Link
              href="/me/queue"
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "h-auto p-0",
              )}
            >
              My queue
            </Link>
          }
        >
          {currentQueue ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-meta text-muted-foreground">Queue number</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {currentQueue.queueNumber}
                </p>
              </div>
              <StatusBadge status={currentQueue.status} />
            </div>
          ) : (
            <EmptyState
              title="No active queue"
              description="You do not have an active queue entry on the demo day."
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Recent history"
        description="Recent synthetic history belonging only to your linked patient identity."
        action={
          <Link
            href="/me/history"
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "h-auto p-0",
            )}
          >
            My history
          </Link>
        }
      >
        {recentHistory.length === 0 ? (
          <EmptyState
            title="No history available"
            description="No synthetic history entries are available for this patient."
          />
        ) : (
          <div className="divide-y divide-border">
            {recentHistory.map((history) => (
              <article key={history.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{history.date}</p>
                  <p className="font-mono text-meta text-muted-foreground">
                    {history.id}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {history.summary}
                </p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <section aria-label="Patient shortcuts" className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/me/profile"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <UserRoundIcon data-icon="inline-start" aria-hidden="true" />
          My Profile
        </Link>
        <Link
          href="/me/appointments"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <CalendarDaysIcon data-icon="inline-start" aria-hidden="true" />
          My Appointments
        </Link>
        <Link
          href="/me/queue"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <ClipboardListIcon data-icon="inline-start" aria-hidden="true" />
          My Queue
        </Link>
        <Link
          href="/me/history"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <HistoryIcon data-icon="inline-start" aria-hidden="true" />
          My History
        </Link>
      </section>
    </div>
  );
}
