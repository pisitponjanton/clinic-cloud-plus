"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ConfirmationDialog,
  FeedbackAlert,
  LoadingState,
  SectionCard,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createLocalAppointmentFromPreview,
  createLocalAppointmentId,
  validateCreateAppointmentDraft,
} from "@/src/appointments/create-contract";
import {
  draftFromAppointment,
  validateUpdateAppointmentDraft,
} from "@/src/appointments/update-contract";
import type { AppointmentHandoffWebData } from "@/src/handoff/appointment-web";
import {
  getMergedBrowserAppointments,
  readBrowserLocalData,
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import {
  withAppointmentCreated,
  withAppointmentUpdate,
} from "@/src/local-data/appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

type ReviewState =
  | {
      state: "ready";
      current: Appointment | null;
      proposed: Appointment;
      details: Array<{
        label: string;
        currentValue: string;
        newValue: string;
      }>;
    }
  | {
      state: "already-applied";
      message: string;
    }
  | {
      state: "blocked";
      message: string;
    };

type AppointmentHandoffConfirmationProps = {
  data: AppointmentHandoffWebData;
  storage?: BrowserStorageLike | null;
};

function localId(data: AppointmentHandoffWebData): string {
  return createLocalAppointmentId(`handoff-${data.handoffId}`);
}

function buildReview(
  data: AppointmentHandoffWebData,
  storage?: BrowserStorageLike | null,
): ReviewState {
  const merged = getMergedBrowserAppointments(
    data.baseAppointments,
    storage,
  );

  if (data.kind === "create") {
    const id = localId(data);

    if (merged.appointments.some((appointment) => appointment.id === id)) {
      return {
        state: "already-applied",
        message:
          "This prepared create action was already confirmed in this browser.",
      };
    }

    const validation = validateCreateAppointmentDraft(
      {
        patientId: data.action.patientId,
        doctorId: data.action.doctorId,
        serviceId: data.action.serviceId,
        date: data.action.date,
        time: data.action.time,
        note: data.action.note,
      },
      data.options,
    );

    if (!validation.ok) {
      return {
        state: "blocked",
        message:
          "The prepared create action no longer passes the current Web validation rules.",
      };
    }

    const proposed = createLocalAppointmentFromPreview(
      validation.preview,
      id,
    );

    return {
      state: "ready",
      current: null,
      proposed,
      details: [
        {
          label: "Patient",
          currentValue: "No appointment",
          newValue: validation.preview.patientLabel,
        },
        {
          label: "Doctor",
          currentValue: "No appointment",
          newValue: validation.preview.doctorLabel ?? "Not assigned",
        },
        {
          label: "Service",
          currentValue: "No appointment",
          newValue: validation.preview.serviceLabel ?? "Not assigned",
        },
        {
          label: "Date / time",
          currentValue: "No appointment",
          newValue: `${proposed.date} ${proposed.time}`,
        },
      ],
    };
  }

  const current =
    merged.appointments.find(
      (appointment) => appointment.id === data.action.appointmentId,
    ) ?? null;

  if (!current) {
    return {
      state: "blocked",
      message:
        "The appointment is no longer available in this browser's effective demo state.",
    };
  }

  if (data.kind === "cancel") {
    if (current.status === "CANCELLED") {
      return {
        state: "already-applied",
        message: "This appointment is already CANCELLED in this browser.",
      };
    }

    return {
      state: "ready",
      current,
      proposed: {
        ...current,
        status: "CANCELLED",
      },
      details: [
        {
          label: "Status",
          currentValue: current.status,
          newValue: "CANCELLED",
        },
      ],
    };
  }

  const draft = draftFromAppointment(current);
  const patch = data.action.patch;

  if (patch.doctorId !== undefined) {
    draft.doctorId = patch.doctorId ?? "";
  }
  if (patch.serviceId !== undefined) {
    draft.serviceId = patch.serviceId ?? "";
  }
  if (patch.date !== undefined) {
    draft.date = patch.date;
  }
  if (patch.time !== undefined) {
    draft.time = patch.time;
  }
  if (patch.note !== undefined) {
    draft.note = patch.note;
  }

  const validation = validateUpdateAppointmentDraft(
    current,
    draft,
    data.options,
  );

  if (!validation.ok) {
    const noChange = validation.errors.form?.includes(
      "ยังไม่มีข้อมูลที่เปลี่ยนแปลง",
    );

    return noChange
      ? {
          state: "already-applied",
          message:
            "This browser already matches the prepared appointment update.",
        }
      : {
          state: "blocked",
          message:
            "The current browser appointment no longer passes Web validation for this prepared update.",
        };
  }

  return {
    state: "ready",
    current,
    proposed: {
      ...current,
      ...validation.preview.patch,
    },
    details: validation.preview.changes.map((change) => ({
      label: change.label,
      currentValue: change.currentValue,
      newValue: change.newValue,
    })),
  };
}

function ReviewDetails({
  review,
}: {
  review: Extract<ReviewState, { state: "ready" }>;
}) {
  return (
    <dl className="grid gap-3 text-sm">
      {review.details.map((detail) => (
        <div
          key={detail.label}
          className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center"
        >
          <dt className="text-meta font-medium text-muted-foreground">
            {detail.label}
          </dt>
          <dd className="break-words">{detail.currentValue}</dd>
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <dd className="break-words font-medium">{detail.newValue}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AppointmentHandoffConfirmation({
  data,
  storage,
}: AppointmentHandoffConfirmationProps) {
  const [review, setReview] = useState<ReviewState | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error" | "attention";
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReview(buildReview(data, storage));
    }, 0);

    window.history.replaceState(
      null,
      "",
      "/handoff/appointment",
    );

    return () => window.clearTimeout(timer);
  }, [data, storage]);
  function handleConfirm() {
    const latest = buildReview(data, storage);
    setReview(latest);

    if (latest.state !== "ready") {
      setNotice({
        tone: "attention",
        title: "Confirmation stopped",
        description:
          latest.state === "blocked"
            ? latest.message
            : "This prepared action no longer needs another write.",
      });
      return;
    }

    try {
      const overlayRead = readBrowserLocalData(storage);
      let nextOverlay = overlayRead.overlay;

      if (data.kind === "create") {
        nextOverlay = withAppointmentCreated(
          nextOverlay,
          latest.proposed,
        );
      } else if (data.kind === "update") {
        const current = latest.current;

        if (!current) {
          throw new Error("Missing effective appointment.");
        }

        const patch = {
          doctorId: latest.proposed.doctorId,
          serviceId: latest.proposed.serviceId,
          date: latest.proposed.date,
          time: latest.proposed.time,
          note: latest.proposed.note,
        };

        const minimalPatch = Object.fromEntries(
          Object.entries(patch).filter(([key, value]) => {
            return current[key as keyof Appointment] !== value;
          }),
        );

        nextOverlay = withAppointmentUpdate(
          nextOverlay,
          current.id,
          minimalPatch,
        );
      } else {
        nextOverlay = withAppointmentUpdate(
          nextOverlay,
          latest.proposed.id,
          { status: "CANCELLED" },
        );
      }

      const write = writeBrowserLocalData(nextOverlay, storage);

      if (!write.ok) {
        setNotice({
          tone: "error",
          title: "Browser save failed",
          description:
            "The prepared action was not confirmed as saved. No success is being claimed.",
        });
        return;
      }

      setReview(buildReview(data, storage));
      setNotice({
        tone: "success",
        title: "Confirmed in this browser",
        description:
          "Clinic Cloud + revalidated the prepared action and updated the browser-local appointment overlay.",
      });
    } catch {
      setNotice({
        tone: "error",
        title: "Confirmation failed",
        description:
          "Clinic Cloud + could not safely apply this prepared action to the current browser state.",
      });
    }
  }

  if (!review) {
    return <LoadingState label="Checking current browser appointment state" />;
  }

  return (
    <div className="flex flex-col gap-section">
      <FeedbackAlert
        tone="info"
        title="Prepared by Staff MCP — not saved yet"
        description="Clinic Cloud + has revalidated the signed handoff on the server. This page also checks this browser's current local appointment state before any write."
      />

      {notice ? (
        <FeedbackAlert
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      ) : null}

      {review.state === "blocked" ? (
        <FeedbackAlert
          tone="error"
          title="This handoff cannot be confirmed"
          description={review.message}
        />
      ) : review.state === "already-applied" ? (
        <FeedbackAlert
          tone="success"
          title="No additional write is required"
          description={review.message}
        />
      ) : (
        <SectionCard
          title={
            data.kind === "create"
              ? "Review new appointment"
              : data.kind === "update"
                ? "Review appointment changes"
                : "Review appointment cancellation"
          }
          description="Current browser state → proposed state. Nothing changes until you confirm."
          tone="context"
        >
          <ReviewDetails review={review} />

          <ConfirmationDialog
            triggerLabel={
              data.kind === "cancel"
                ? "Review cancellation"
                : "Review and confirm"
            }
            title={
              data.kind === "create"
                ? "Create this appointment in this browser?"
                : data.kind === "update"
                  ? "Apply these appointment changes?"
                  : "Cancel this appointment?"
            }
            description="The current browser state will be checked again immediately before the localStorage write."
            confirmLabel={
              data.kind === "cancel"
                ? "Confirm cancellation"
                : "Confirm browser-local change"
            }
            cancelLabel="Not now"
            tone={data.kind === "cancel" ? "destructive" : "default"}
            details={<ReviewDetails review={review} />}
            onConfirm={handleConfirm}
          />
        </SectionCard>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/appointments"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to appointments
        </Link>
      </div>
    </div>
  );
}
