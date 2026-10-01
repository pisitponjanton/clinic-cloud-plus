"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  Clock3Icon,
  StethoscopeIcon,
} from "lucide-react";

import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/shared";
import {
  getDoctorById,
  getServiceById,
} from "@/src/data-access/public";
import {
  getMergedBrowserAppointments,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import type { PatientAppointmentsProjection } from "@/src/patient-portal/projection";
import type { Appointment } from "@/src/types/private-data";

const DEMO_TODAY = "2026-10-01";

function sortByDateTime(
  left: Appointment,
  right: Appointment,
): number {
  return `${left.date}T${left.time}`.localeCompare(
    `${right.date}T${right.time}`,
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const doctor = appointment.doctorId
    ? getDoctorById(appointment.doctorId)
    : null;
  const service = appointment.serviceId
    ? getServiceById(appointment.serviceId)
    : null;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{appointment.id}</p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-medium">
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            {appointment.date}
          </p>
          <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3Icon className="size-4" aria-hidden="true" />
            {appointment.time}
          </p>
        </div>

        <StatusBadge status={appointment.status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-meta text-muted-foreground">Service</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {service?.name ?? "Not assigned"}
          </dd>
        </div>
        <div>
          <dt className="text-meta text-muted-foreground">Doctor</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {doctor?.displayName ?? "Not assigned"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-meta text-muted-foreground">Note</dt>
          <dd className="mt-0.5 text-sm">
            {appointment.note || "No note"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function PatientAppointmentsView({
  projection,
  storage,
}: {
  projection: PatientAppointmentsProjection;
  storage?: BrowserStorageLike | null;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>(
    projection.appointments,
  );
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const merged = getMergedBrowserAppointments(
        projection.appointments,
        storage,
      );

      setAppointments(
        merged.appointments
          .filter(
            (appointment) =>
              appointment.patientId === projection.patientId,
          )
          .sort(sortByDateTime),
      );

      setRecovered(
        merged.overlayRead.state === "recovered" ||
          merged.overlayRead.storageError !== null ||
          merged.overlayRead.issues.length > 0,
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [projection.appointments, projection.patientId, storage]);

  const { upcoming, previous } = useMemo(() => {
    const upcomingItems = appointments
      .filter(
        (appointment) =>
          appointment.status !== "CANCELLED" &&
          appointment.date >= DEMO_TODAY,
      )
      .sort(sortByDateTime);

    const previousItems = appointments
      .filter(
        (appointment) =>
          appointment.status === "CANCELLED" ||
          appointment.date < DEMO_TODAY,
      )
      .sort((left, right) => sortByDateTime(right, left));

    return {
      upcoming: upcomingItems,
      previous: previousItems,
    };
  }, [appointments]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My appointments"
        description={`Appointments linked to ${projection.patientName} (${projection.hn}) only.`}
      />

      {recovered ? (
        <FeedbackAlert
          tone="attention"
          title="Local demo data was recovered"
          description="Some browser-local appointment data could not be used. Only valid appointments linked to your patient identity are shown."
        />
      ) : null}

      <SectionCard
        title="Upcoming appointments"
        description="Scheduled, confirmed, or checked-in appointments from your authorized patient scope."
        action={
          <span className="font-mono text-sm font-semibold">
            {upcoming.length}
          </span>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming appointments"
            description="There are no upcoming appointments linked to your demo patient identity."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Previous & cancelled"
        description="Completed, older, or cancelled appointments that still belong to your patient identity."
        tone="subtle"
        action={
          <span className="font-mono text-sm font-semibold">
            {previous.length}
          </span>
        }
      >
        {previous.length === 0 ? (
          <EmptyState
            title="No previous appointments"
            description="No previous or cancelled appointments are available for this patient identity."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {previous.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <p className="inline-flex items-center gap-2 text-meta text-muted-foreground">
        <StethoscopeIcon className="size-4" aria-hidden="true" />
        Appointment editing and cancellation remain personnel workflows.
      </p>
    </div>
  );
}
