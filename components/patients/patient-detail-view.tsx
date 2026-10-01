import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  HistoryIcon,
  StethoscopeIcon,
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
import type { UserRole } from "@/src/types/private-data";
import type {
  PatientAppointmentContext,
  PatientDetailProjection,
} from "@/src/patients/detail-projection";

type PatientDetailViewProps = {
  role: Exclude<UserRole, "PATIENT">;
  projection: PatientDetailProjection;
};

function genderLabel(
  gender: PatientDetailProjection["patient"]["gender"],
): string {
  switch (gender) {
    case "MALE":
      return "ชาย";
    case "FEMALE":
      return "หญิง";
    case "OTHER":
      return "อื่น ๆ";
  }
}

function AppointmentContext({
  appointment,
}: {
  appointment: PatientAppointmentContext;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{appointment.id}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {appointment.date} · {appointment.time}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-meta text-muted-foreground">Service</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {appointment.serviceName ?? "Not assigned"}
          </dd>
        </div>
        <div>
          <dt className="text-meta text-muted-foreground">Doctor</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {appointment.doctorName ?? "Not assigned"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-meta text-muted-foreground">Note</dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {appointment.note || "No note"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function PatientDetailView({
  role,
  projection,
}: PatientDetailViewProps) {
  const { patient, appointments, history } = projection;
  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow={role}
        title={fullName}
        description="Review the authorized patient context before continuing to appointment or queue workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/appointments/new?patientId=${patient.id}`}
              className={buttonVariants()}
            >
              <CalendarPlusIcon data-icon="inline-start" aria-hidden="true" />
              Create appointment
            </Link>
            <Link
              href="/patients"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
              Back to patients
            </Link>
          </div>
        }
      />

      <div className="grid gap-section xl:grid-cols-[19rem_minmax(0,1fr)] xl:items-start">
        <ContextPanel
          label="Patient context"
          title={fullName}
          identifier={patient.hn}
          className="xl:sticky xl:top-8"
          items={[
            { label: "Patient ID", value: patient.id },
            { label: "Phone", value: patient.phone },
            { label: "Date of birth", value: patient.dateOfBirth },
            { label: "Gender", value: genderLabel(patient.gender) },
          ]}
        />

        <div className="flex min-w-0 flex-col gap-section">
          <section aria-label="Appointment context">
            <SectionCard
              title="Appointment context"
            description={
              role === "DOCTOR"
                ? "Only appointments assigned to your linked doctor identity are shown here."
                : "Authorized appointments for this patient, newest context first."
            }
            action={
              <span className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                <CalendarDaysIcon className="size-4" aria-hidden="true" />
                {appointments.length} record
                {appointments.length === 1 ? "" : "s"}
              </span>
            }
          >
            {appointments.length === 0 ? (
              <EmptyState
                title="No appointment context"
                description="No appointment records are available for this patient in your current role scope."
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {appointments.map((appointment) => (
                  <AppointmentContext
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </div>
            )}
            </SectionCard>
          </section>

          <section aria-label="Patient history">
            <SectionCard
              title="Patient history"
            description="Synthetic history records authorized for this patient context."
            tone="subtle"
            action={
              <span className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                <HistoryIcon className="size-4" aria-hidden="true" />
                {history.length} entr{history.length === 1 ? "y" : "ies"}
              </span>
            }
          >
            {history.length === 0 ? (
              <EmptyState
                title="No history available"
                description="No synthetic patient-history records are available for this patient."
              />
            ) : (
              <div className="divide-y divide-border">
                {history.map((entry) => (
                  <article
                    key={entry.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)]"
                  >
                    <div>
                      <p className="font-medium">{entry.date}</p>
                      <p className="mt-1 font-mono text-meta text-muted-foreground">
                        {entry.id}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{entry.summary}</p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <StethoscopeIcon
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {entry.doctorName ?? "Doctor not assigned"}
                        </span>
                        {entry.appointmentId ? (
                          <span className="font-mono">
                            {entry.appointmentId}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            </SectionCard>
          </section>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/appointments"
              className={buttonVariants({ variant: "outline" })}
            >
              <CalendarDaysIcon data-icon="inline-start" aria-hidden="true" />
              View appointments
            </Link>
            <Link
              href="/queue"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "text-muted-foreground",
              )}
            >
              Continue to queue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
