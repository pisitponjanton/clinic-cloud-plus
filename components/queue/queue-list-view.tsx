import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  FilterIcon,
  XIcon,
} from "lucide-react";

import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  QUEUE_STATUS_FILTERS,
  type QueueListProjection,
  type QueueReadItem,
} from "@/src/queue/read-projection";
import type { QueueStatus, UserRole } from "@/src/types/private-data";

type QueueListViewProps = {
  role: Exclude<UserRole, "PATIENT">;
  projection: QueueListProjection;
};

function statusLabel(status: QueueStatus): string {
  return status.replaceAll("_", " ");
}

function QueueMobileRow({ item }: { item: QueueReadItem }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xl font-semibold tracking-tight">
            {item.queueNumber}
          </p>
          <p className="mt-1 text-sm font-medium">{item.patientName}</p>
          <p className="mt-0.5 font-mono text-meta text-muted-foreground">
            {item.patientHn} · {item.id}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-meta text-muted-foreground">Date</dt>
          <dd className="mt-0.5 text-sm font-medium">{item.date}</dd>
        </div>
        <div>
          <dt className="text-meta text-muted-foreground">Doctor</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {item.doctorName ?? "Not assigned"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-meta text-muted-foreground">Appointment</dt>
          <dd className="mt-0.5 font-mono text-sm">
            {item.appointmentId ?? "Walk-in / not linked"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href={`/patients/${item.patientId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Open patient
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Link>

        {item.appointmentId ? (
          <Link
            href={`/appointments/${item.appointmentId}`}
            className={buttonVariants({ variant: "ghost" })}
          >
            Open appointment
          </Link>
        ) : (
          <div className="rounded-md border border-dashed border-border px-3 py-2 text-center text-meta text-muted-foreground">
            No linked appointment
          </div>
        )}
      </div>
    </article>
  );
}

export function QueueListView({
  role,
  projection,
}: QueueListViewProps) {
  const hasFilters = projection.status !== null || projection.date.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow={role}
        title={role === "DOCTOR" ? "Relevant queue" : "Queue"}
        description={
          role === "DOCTOR"
            ? "Read the Base Queue entries assigned to your linked doctor identity."
            : "Read clinic queue context from the authorized Base Dataset. Queue mutation is not enabled in this MVP phase."
        }
        actions={<Badge variant="outline">Read-only Base Queue</Badge>}
      />

      <SectionCard
        title="Queue scope"
        description="Status counts reflect only entries already authorized for your role."
        tone="context"
      >
        <div className="flex flex-wrap gap-2" aria-label="Queue status summary">
          {QUEUE_STATUS_FILTERS.map((status) => (
            <div
              key={status}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
            >
              <StatusBadge status={status} />
              <span className="font-mono text-sm font-semibold">
                {projection.statusCounts[status]}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Filter queue"
        description="Status and date filters are applied after authorization and never broaden role scope."
      >
        <form method="get" action="/queue">
          <FieldGroup className="grid gap-3 md:grid-cols-[minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_auto] md:items-end">
            <Field>
              <FieldLabel htmlFor="queue-status">Status</FieldLabel>
              <Select
                name="status"
                defaultValue={projection.status ?? "ALL"}
                itemToStringLabel={(value) =>
                  value === "ALL" ? "All statuses" : statusLabel(value as QueueStatus)
                }
              >
                <SelectTrigger
                  id="queue-status"
                  className="w-full"
                  aria-label="Queue status"
                  aria-describedby="queue-status-description"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {QUEUE_STATUS_FILTERS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription id="queue-status-description">
                Includes only queue entries visible to this role.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="queue-date">Date</FieldLabel>
              <Input
                id="queue-date"
                name="date"
                type="date"
                defaultValue={projection.date}
                aria-describedby="queue-date-description"
              />
              <FieldDescription id="queue-date-description">
                Leave blank to include every seeded queue date.
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
            of {projection.totalInScope} queue entries in your role scope
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/queue?date=2026-10-01"
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
                href="/queue"
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
          title="No queue entries found"
          description="No authorized queue entry matches the selected filters. Clear the filters or choose another date/status."
          action={
            hasFilters ? (
              <Link
                href="/queue"
                className={buttonVariants({ variant: "outline" })}
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section aria-label="Queue results">
          <div className="grid gap-3 lg:hidden">
            {projection.items.map((item) => (
              <QueueMobileRow key={item.id} item={item} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-mono text-base font-semibold">
                        {item.queueNumber}
                      </p>
                      <p className="mt-0.5 font-mono text-meta text-muted-foreground">
                        {item.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.patientName}</p>
                      <p className="mt-0.5 font-mono text-meta text-muted-foreground">
                        {item.patientHn}
                      </p>
                    </TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      {item.doctorName ?? "Not assigned"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.appointmentId ?? "Not linked"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/patients/${item.patientId}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          Open patient
                        </Link>
                        {item.appointmentId ? (
                          <Link
                            href={`/appointments/${item.appointmentId}`}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              }),
                              "px-2",
                            )}
                            aria-label={`Open appointment ${item.appointmentId}`}
                          >
                            <ArrowRightIcon aria-hidden="true" />
                          </Link>
                        ) : null}
                      </div>
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
