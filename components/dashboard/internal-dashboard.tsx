import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/src/auth/user";
import type { InternalDashboardProjection } from "@/src/dashboard/projection";

type InternalDashboardProps = {
  user: AuthUser;
  projection: InternalDashboardProjection;
};

function titleForRole(role: InternalDashboardProjection["role"]): string {
  switch (role) {
    case "OWNER":
      return "Clinic overview";
    case "DOCTOR":
      return "Assigned clinical work";
    case "NURSE":
      return "Care workflow";
    case "STAFF":
      return "Today’s clinic work";
  }
}

function descriptionForRole(
  role: InternalDashboardProjection["role"],
): string {
  switch (role) {
    case "OWNER":
      return "See the current clinic workload and move directly into the workflow that needs attention.";
    case "DOCTOR":
      return "Review only patients, appointments, and queue context assigned to your linked doctor identity.";
    case "NURSE":
      return "Start from today’s patient, appointment, and queue context without leaving the operational workspace.";
    case "STAFF":
      return "Find the next patient or appointment quickly and continue the clinic workflow.";
  }
}

export function InternalDashboard({
  user,
  projection,
}: InternalDashboardProps) {
  const role = projection.role;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow={role}
        title={titleForRole(role)}
        description={descriptionForRole(role)}
        actions={
          role === "OWNER" ? (
            <Link
              href="/settings/demo"
              className={buttonVariants({ variant: "outline" })}
            >
              <SettingsIcon data-icon="inline-start" aria-hidden="true" />
              Demo Settings
            </Link>
          ) : undefined
        }
      />

      <section
        aria-label="Today summary"
        className="rounded-lg border border-border bg-surface-context p-4 sm:p-5"
      >
        <div className="flex flex-col gap-1">
          <p className="text-meta font-medium text-primary">Demo day</p>
          <p className="text-section-title font-semibold">
            {projection.today} · {projection.clinicName}
          </p>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="text-meta text-muted-foreground">Patients in scope</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {projection.patientCount}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">
              Today appointments
            </dt>
            <dd className="mt-1 text-2xl font-semibold">
              {projection.appointmentCount}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Active queue</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {projection.queueCount}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Needs attention</dt>
            <dd className="mt-1 text-2xl font-semibold text-attention-foreground">
              {projection.attentionCount}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-section xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <SectionCard
          title="Today’s appointments"
          description={
            role === "DOCTOR"
              ? "Only appointments assigned to your linked doctor identity are shown."
              : "Sorted by appointment time for the deterministic demo day."
          }
          action={
            <Link
              href="/appointments"
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "h-auto p-0",
              )}
            >
              View appointments
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          }
        >
          {projection.todayAppointments.length === 0 ? (
            <EmptyState
              title="No appointments in scope"
              description="There are no appointments available for this role on the demo day."
            />
          ) : (
            <div className="divide-y divide-border">
              {projection.todayAppointments.slice(0, 6).map((appointment) => (
                <div
                  key={appointment.id}
                  className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <p className="font-mono text-sm font-semibold">
                    {appointment.time}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {appointment.patientName}
                    </p>
                    <p className="mt-0.5 truncate text-meta text-muted-foreground">
                      {appointment.serviceName ?? "Service not assigned"}
                      {appointment.doctorName
                        ? ` · ${appointment.doctorName}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col gap-section">
          <SectionCard
            title="Queue needing attention"
            description="Active queue entries visible to your role."
            tone="subtle"
            action={
              <Link
                href="/queue"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "h-auto p-0",
                )}
              >
                View queue
              </Link>
            }
          >
            {projection.activeQueue.length === 0 ? (
              <EmptyState
                title="Queue is clear"
                description="No active queue entries are visible for this role."
              />
            ) : (
              <div className="flex flex-col gap-3">
                {projection.activeQueue.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">
                        {entry.queueNumber}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {entry.patientName}
                      </p>
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Next actions"
            description="Move directly into the workflow that matches the current task."
            tone="context"
          >
            <div className="grid gap-2">
              <Link
                href="/patients"
                className={buttonVariants({ variant: "default" })}
              >
                <SearchIcon data-icon="inline-start" aria-hidden="true" />
                {role === "DOCTOR"
                  ? "Review relevant patients"
                  : "Find a patient"}
              </Link>
              <Link
                href="/appointments"
                className={buttonVariants({ variant: "outline" })}
              >
                <CalendarDaysIcon
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Review appointments
              </Link>
              <Link
                href="/queue"
                className={buttonVariants({ variant: "outline" })}
              >
                <ClipboardListIcon
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Review queue
              </Link>
              {role === "OWNER" ? (
                <Link
                  href="/settings"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  <SettingsIcon data-icon="inline-start" aria-hidden="true" />
                  Clinic settings
                </Link>
              ) : null}
            </div>

            <div className="mt-2 flex items-center gap-2 text-meta text-muted-foreground">
              <UsersIcon className="size-4" aria-hidden="true" />
              Signed in as {user.displayName}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
