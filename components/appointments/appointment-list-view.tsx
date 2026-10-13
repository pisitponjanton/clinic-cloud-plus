import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  FilterIcon,
  XIcon,
} from "lucide-react";

import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StatusFilterSelect } from "@/components/shared/status-filter-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_STATUS_FILTERS,
  type AppointmentListProjection,
  type AppointmentReadItem,
} from "@/src/appointments/read-projection";
import type { UserRole } from "@/src/types/private-data";

type AppointmentListViewProps = {
  role: Exclude<UserRole, "PATIENT">;
  projection: AppointmentListProjection;
};

function AppointmentMobileRow({
  appointment,
}: {
  appointment: AppointmentReadItem;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{appointment.patientName}</p>
          <p className="mt-1 font-mono text-meta text-muted-foreground">
            {appointment.patientHn} · {appointment.id}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-meta text-muted-foreground">Date / time</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {appointment.date} · {appointment.time}
          </dd>
        </div>
        <div>
          <dt className="text-meta text-muted-foreground">Service</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {appointment.serviceName ?? "Not assigned"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-meta text-muted-foreground">Doctor</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {appointment.doctorName ?? "Not assigned"}
          </dd>
        </div>
      </dl>

      <Link
        href={`/appointments/${appointment.id}`}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-4 w-full",
        )}
      >
        Open appointment
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function AppointmentListView({
  role,
  projection,
}: AppointmentListViewProps) {
  const hasFilters = projection.status !== null || projection.date.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow={role}
        title={role === "DOCTOR" ? "Assigned appointments" : "Appointments"}
        description={
          role === "DOCTOR"
            ? "Review only appointments assigned to your linked doctor identity."
            : "Review appointment status, patient context, doctor, and service from the authorized Base Dataset."
        }
        actions={
          <Link
            href="/appointments/new"
            className={buttonVariants()}
          >
            <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
            Create appointment
          </Link>
        }
      />

      <SectionCard
        title="Filter appointments"
        description="Use status and date together or separately. Filters never broaden your authenticated role scope."
        tone="context"
      >
        <form method="get" action="/appointments">
          <FieldGroup className="grid gap-3 md:grid-cols-[minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_auto] md:items-end">
            <Field>
              <FieldLabel htmlFor="appointment-status">Status</FieldLabel>
              <StatusFilterSelect
                id="appointment-status"
                label="Appointment status"
                descriptionId="appointment-status-description"
                defaultValue={projection.status ?? "ALL"}
                statuses={APPOINTMENT_STATUS_FILTERS}
              />
              <FieldDescription id="appointment-status-description">
                Status is checked after authorization.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="appointment-date">Date</FieldLabel>
              <Input
                id="appointment-date"
                name="date"
                type="date"
                defaultValue={projection.date}
                aria-describedby="appointment-date-description"
              />
              <FieldDescription id="appointment-date-description">
                Leave blank to include every seeded date in your scope.
              </FieldDescription>
            </Field>

            <Button type="submit" size="lg">
              <FilterIcon data-icon="inline-start" aria-hidden="true" />
              Apply filters
            </Button>
          </FieldGroup>
        </form>

        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
          aria-live="polite"
        >
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {projection.resultCount}
            </span>{" "}
            of {projection.totalInScope} appointments in your role scope
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/appointments?date=2026-10-01"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <CalendarDaysIcon
                data-icon="inline-start"
                aria-hidden="true"
              />
              Demo day
            </Link>

            {hasFilters ? (
              <Link
                href="/appointments"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <XIcon data-icon="inline-start" aria-hidden="true" />
                Clear filters
              </Link>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {projection.items.length === 0 ? (
        <EmptyState
          title="No appointments found"
          description="No authorized appointment matches the selected filters. Clear the filters or choose another date/status."
          action={
            hasFilters ? (
              <Link
                href="/appointments"
                className={buttonVariants({ variant: "outline" })}
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section aria-label="Appointment results">
          <div className="grid gap-3 lg:hidden">
            {projection.items.map((appointment) => (
              <AppointmentMobileRow
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.items.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <p className="font-medium">{appointment.date}</p>
                      <p className="mt-0.5 font-mono text-meta text-muted-foreground">
                        {appointment.time}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{appointment.patientName}</p>
                      <p className="mt-0.5 font-mono text-meta text-muted-foreground">
                        {appointment.patientHn} · {appointment.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      {appointment.serviceName ?? "Not assigned"}
                    </TableCell>
                    <TableCell>
                      {appointment.doctorName ?? "Not assigned"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appointment.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Open appointment
                        <ArrowRightIcon
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
