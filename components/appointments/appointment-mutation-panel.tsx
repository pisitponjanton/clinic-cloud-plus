"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarClockIcon,
  PencilIcon,
  XCircleIcon,
} from "lucide-react";

import {
  ConfirmationDialog,
  FeedbackAlert,
  SectionCard,
  StatusBadge,
  TextField,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreateAppointmentOption,
  CreateAppointmentOptions,
} from "@/src/appointments/create-contract";
import {
  draftFromAppointment,
  validateUpdateAppointmentDraft,
  type UpdateAppointmentDraft,
  type UpdateAppointmentErrors,
  type UpdateAppointmentPreview,
} from "@/src/appointments/update-contract";
import {
  getMergedBrowserAppointments,
  readBrowserLocalData,
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import { withAppointmentUpdate } from "@/src/local-data/appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

type AppointmentMutationPanelProps = {
  baseAppointment: Appointment;
  baseAppointments: Appointment[];
  options: Pick<CreateAppointmentOptions, "doctors" | "services">;
  storage?: BrowserStorageLike | null;
};

function optionLabel(
  options: readonly CreateAppointmentOption[],
  value: string | null,
): string {
  if (!value) {
    return "Not assigned";
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

function SelectField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: CreateAppointmentOption[];
  error?: string;
  onChange: (value: string) => void;
}) {
  const descriptionId = `${id}-description`;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value || "NONE"}
        onValueChange={(nextValue) =>
          onChange(nextValue === "NONE" ? "" : String(nextValue))
        }
        itemToStringLabel={(optionValue) =>
          optionValue === "NONE"
            ? "Not assigned"
            : options.find((option) => option.value === optionValue)?.label ??
              String(optionValue)
        }
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">Not assigned</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="truncate text-meta text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription id={descriptionId}>
        Only options allowed for your authenticated role are listed.
      </FieldDescription>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

function ChangePreview({
  preview,
}: {
  preview: UpdateAppointmentPreview;
}) {
  return (
    <div className="flex flex-col gap-3">
      {preview.changes.map((change) => (
        <div
          key={change.field}
          className="grid gap-1 rounded-md border border-border p-3 sm:grid-cols-[7rem_minmax(0,1fr)]"
        >
          <p className="text-meta font-medium text-muted-foreground">
            {change.label}
          </p>
          <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <span className="break-words text-sm">{change.currentValue}</span>
            <span className="text-meta text-muted-foreground" aria-hidden="true">
              →
            </span>
            <span className="break-words text-sm font-medium">
              {change.newValue}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppointmentMutationPanel({
  baseAppointment,
  baseAppointments,
  options,
  storage,
}: AppointmentMutationPanelProps) {
  const [current, setCurrent] = useState<Appointment>(baseAppointment);
  const [draft, setDraft] = useState<UpdateAppointmentDraft>(
    draftFromAppointment(baseAppointment),
  );
  const [errors, setErrors] = useState<UpdateAppointmentErrors>({});
  const [preview, setPreview] = useState<UpdateAppointmentPreview | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<
    | { tone: "success" | "error" | "attention"; title: string; description: string }
    | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const merged = getMergedBrowserAppointments(baseAppointments, storage);
      const effective = merged.appointments.find(
        (appointment) => appointment.id === baseAppointment.id,
      );

      if (effective) {
        setCurrent(effective);
        setDraft(draftFromAppointment(effective));
      }

      if (
        merged.overlayRead.state === "recovered" ||
        merged.overlayRead.storageError !== null ||
        merged.overlayRead.issues.length > 0
      ) {
        setNotice({
          tone: "attention",
          title: "Local demo data was recovered",
          description:
            "Some browser-local demo data could not be used. Valid recoverable data was kept.",
        });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [baseAppointment.id, baseAppointments, storage, baseAppointment]);

  function updateDraft<K extends keyof UpdateAppointmentDraft>(
    key: K,
    value: UpdateAppointmentDraft[K],
  ) {
    setDraft((existing) => ({ ...existing, [key]: value }));
    setErrors((existing) => ({
      ...existing,
      [key]: undefined,
      form: undefined,
    }));
    setPreview(null);
    setNotice(null);
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateUpdateAppointmentDraft(current, draft, options);

    if (!validation.ok) {
      setErrors(validation.errors);
      setPreview(null);
      return;
    }

    setErrors({});
    setNotice(null);
    setPreview(validation.preview);
  }

  function refreshMergedState(): Appointment | null {
    const merged = getMergedBrowserAppointments(baseAppointments, storage);
    const effective =
      merged.appointments.find(
        (appointment) => appointment.id === baseAppointment.id,
      ) ?? null;

    if (effective) {
      setCurrent(effective);
      setDraft(draftFromAppointment(effective));
    }

    return effective;
  }

  function handleUpdateConfirm() {
    if (!preview) {
      return;
    }

    const overlayRead = readBrowserLocalData(storage);
    const nextOverlay = withAppointmentUpdate(
      overlayRead.overlay,
      current.id,
      preview.patch,
    );
    const result = writeBrowserLocalData(nextOverlay, storage);

    if (!result.ok) {
      setNotice({
        tone: "error",
        title: "Update appointment failed",
        description:
          "The appointment was not confirmed as saved in this browser. Please try again.",
      });
      return;
    }

    const effective = refreshMergedState();

    if (!effective) {
      setNotice({
        tone: "error",
        title: "Update appointment failed",
        description:
          "The merged browser state could not be verified after saving.",
      });
      return;
    }

    setPreview(null);
    setEditing(false);
    setNotice({
      tone: "success",
      title: "Appointment updated in this browser",
      description:
        "The browser-local overlay was updated and the merged appointment state was recomputed.",
    });
  }

  function handleCancelConfirm() {
    const overlayRead = readBrowserLocalData(storage);
    const nextOverlay = withAppointmentUpdate(
      overlayRead.overlay,
      current.id,
      { status: "CANCELLED" },
    );
    const result = writeBrowserLocalData(nextOverlay, storage);

    if (!result.ok) {
      setNotice({
        tone: "error",
        title: "Cancel appointment failed",
        description:
          "Cancellation was not confirmed as saved in this browser. Please try again.",
      });
      return;
    }

    const effective = refreshMergedState();

    if (!effective || effective.status !== "CANCELLED") {
      setNotice({
        tone: "error",
        title: "Cancel appointment failed",
        description:
          "The merged browser state could not verify the CANCELLED status.",
      });
      return;
    }

    setPreview(null);
    setEditing(false);
    setNotice({
      tone: "success",
      title: "Appointment cancelled in this browser",
      description:
        "The appointment remains in the dataset and now has status CANCELLED in the browser-local overlay.",
    });
  }

  function startEditing() {
    setDraft(draftFromAppointment(current));
    setErrors({});
    setPreview(null);
    setNotice(null);
    setEditing(true);
  }

  function stopEditing() {
    setDraft(draftFromAppointment(current));
    setErrors({});
    setPreview(null);
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-section">
      {notice ? (
        <FeedbackAlert
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      ) : null}

      <SectionCard
        title="Appointment details"
        description="Effective browser state after merging the read-only Base appointment with this browser's local overlay."
        action={<StatusBadge status={current.status} />}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-meta text-muted-foreground">Date</dt>
            <dd className="mt-1 font-medium">{current.date}</dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Time</dt>
            <dd className="mt-1 font-mono font-medium">{current.time}</dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Service</dt>
            <dd className="mt-1 font-medium">
              {optionLabel(options.services, current.serviceId)}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">Doctor</dt>
            <dd className="mt-1 font-medium">
              {optionLabel(options.doctors, current.doctorId)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-meta text-muted-foreground">Note</dt>
            <dd className="mt-1 text-sm">{current.note || "No note"}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={startEditing}
            disabled={current.status === "CANCELLED"}
          >
            <PencilIcon data-icon="inline-start" aria-hidden="true" />
            Edit appointment
          </Button>

          <ConfirmationDialog
            triggerLabel={
              current.status === "CANCELLED"
                ? "Already cancelled"
                : "Cancel appointment"
            }
            title="Cancel this appointment?"
            description="This keeps the appointment record and stores status = CANCELLED in this browser's local overlay."
            confirmLabel="Confirm cancellation"
            cancelLabel="Keep appointment"
            tone="destructive"
            disabled={current.status === "CANCELLED"}
            details={
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Appointment</dt>
                  <dd className="font-mono font-medium">{current.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Current status</dt>
                  <dd>{current.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">New status</dt>
                  <dd className="font-medium">CANCELLED</dd>
                </div>
              </dl>
            }
            onConfirm={handleCancelConfirm}
          />
        </div>
      </SectionCard>

      {editing ? (
        <SectionCard
          title="Edit appointment"
          description="Supported fields are doctor, service, date, time, and note. Patient identity stays fixed for this appointment."
          tone="context"
        >
          <form onSubmit={handleReview} noValidate>
            <FieldGroup>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  id="edit-doctor"
                  label="Doctor"
                  value={draft.doctorId}
                  options={options.doctors}
                  error={errors.doctorId}
                  onChange={(value) => updateDraft("doctorId", value)}
                />
                <SelectField
                  id="edit-service"
                  label="Service"
                  value={draft.serviceId}
                  options={options.services}
                  error={errors.serviceId}
                  onChange={(value) => updateDraft("serviceId", value)}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  id="edit-date"
                  type="date"
                  label="Date"
                  value={draft.date}
                  onChange={(event) => updateDraft("date", event.target.value)}
                  error={errors.date}
                  required
                />
                <TextField
                  id="edit-time"
                  type="time"
                  label="Time"
                  value={draft.time}
                  onChange={(event) => updateDraft("time", event.target.value)}
                  error={errors.time}
                  required
                />
              </div>

              <TextField
                id="edit-note"
                label="Note"
                value={draft.note}
                onChange={(event) => updateDraft("note", event.target.value)}
                error={errors.note}
              />

              {errors.form ? <FieldError>{errors.form}</FieldError> : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  <CalendarClockIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Review changes
                </Button>
                <Button type="button" variant="ghost" onClick={stopEditing}>
                  Close editor
                </Button>
              </div>
            </FieldGroup>
          </form>
        </SectionCard>
      ) : null}

      {preview ? (
        <SectionCard
          title="Update preview"
          description="Current and new values are shown before any browser-local write occurs."
        >
          <ChangePreview preview={preview} />

          <div className="mt-5">
            <ConfirmationDialog
              triggerLabel="Confirm update"
              title="Apply these appointment changes?"
              description="This stores only the changed fields in the browser-local appointment overlay."
              confirmLabel="Update appointment"
              details={
                <p className="text-sm">
                  {preview.changes.length} field
                  {preview.changes.length === 1 ? "" : "s"} will be updated:{" "}
                  <span className="font-medium">
                    {preview.changes.map((change) => change.label).join(", ")}
                  </span>
                  . Review the full before/after values above before confirming.
                </p>
              }
              onConfirm={handleUpdateConfirm}
            />
          </div>
        </SectionCard>
      ) : null}

      <p className="inline-flex items-center gap-2 text-meta text-muted-foreground">
        <XCircleIcon className="size-4" aria-hidden="true" />
        Cancelling changes status only; it does not delete the Base appointment
        or mutate Queue data.
      </p>
    </div>
  );
}
