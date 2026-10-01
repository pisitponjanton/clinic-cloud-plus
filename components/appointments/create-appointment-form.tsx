"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarPlusIcon,
  CheckCircle2Icon,
  RotateCcwIcon,
} from "lucide-react";

import {
  ConfirmationDialog,
  FeedbackAlert,
  SectionCard,
  TextField,
} from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  createLocalAppointmentFromPreview,
  createLocalAppointmentId,
  validateCreateAppointmentDraft,
  type CreateAppointmentDraft,
  type CreateAppointmentErrors,
  type CreateAppointmentOption,
  type CreateAppointmentOptions,
  type CreateAppointmentPreview,
} from "@/src/appointments/create-contract";
import {
  getMergedBrowserAppointments,
  readBrowserLocalData,
  writeBrowserLocalData,
  type BrowserStorageLike,
} from "@/src/local-data/browser-appointment-overlay";
import { withAppointmentCreated } from "@/src/local-data/appointment-overlay";
import type { Appointment } from "@/src/types/private-data";

type CreateAppointmentFormProps = {
  options: CreateAppointmentOptions;
  baseAppointments: Appointment[];
  initialDraft?: Partial<CreateAppointmentDraft>;
  storage?: BrowserStorageLike | null;
  idFactory?: () => string;
};

type CreateSuccess = {
  appointmentId: string;
  mergedCount: number;
  recoveredLocalData: boolean;
};

const EMPTY_DRAFT: CreateAppointmentDraft = {
  patientId: "",
  doctorId: "",
  serviceId: "",
  date: "",
  time: "",
  note: "",
};

function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  optional = false,
  error,
  description,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: CreateAppointmentOption[];
  placeholder: string;
  optional?: boolean;
  error?: string;
  description?: string;
  onChange: (value: string) => void;
}) {
  const selectValue = optional ? value || "NONE" : value || null;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={selectValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === "NONE" ? "" : String(nextValue))
        }
        itemToStringLabel={(optionValue) => {
          if (optionValue === "NONE") {
            return "Not assigned";
          }

          return (
            options.find((option) => option.value === optionValue)?.label ??
            String(optionValue)
          );
        }}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-required={!optional}
          aria-describedby={describedBy}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {optional ? <SelectItem value="NONE">Not assigned</SelectItem> : null}
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
      {description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

function PreviewDetails({
  preview,
}: {
  preview: CreateAppointmentPreview;
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-meta text-muted-foreground">Patient</dt>
        <dd className="mt-0.5 font-medium">{preview.patientLabel}</dd>
      </div>
      <div>
        <dt className="text-meta text-muted-foreground">Doctor</dt>
        <dd className="mt-0.5 font-medium">
          {preview.doctorLabel ?? "Not assigned"}
        </dd>
      </div>
      <div>
        <dt className="text-meta text-muted-foreground">Service</dt>
        <dd className="mt-0.5 font-medium">
          {preview.serviceLabel ?? "Not assigned"}
        </dd>
      </div>
      <div>
        <dt className="text-meta text-muted-foreground">Date</dt>
        <dd className="mt-0.5 font-medium">{preview.draft.date}</dd>
      </div>
      <div>
        <dt className="text-meta text-muted-foreground">Time</dt>
        <dd className="mt-0.5 font-mono font-medium">{preview.draft.time}</dd>
      </div>
      {preview.draft.note ? (
        <div className="sm:col-span-2">
          <dt className="text-meta text-muted-foreground">Note</dt>
          <dd className="mt-0.5">{preview.draft.note}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function CreateAppointmentForm({
  options,
  baseAppointments,
  initialDraft,
  storage,
  idFactory = () => createLocalAppointmentId(crypto.randomUUID()),
}: CreateAppointmentFormProps) {
  const firstDoctor =
    options.doctors.length === 1 ? options.doctors[0]?.value ?? "" : "";

  const [draft, setDraft] = useState<CreateAppointmentDraft>({
    ...EMPTY_DRAFT,
    doctorId: firstDoctor,
    ...initialDraft,
  });
  const [errors, setErrors] = useState<CreateAppointmentErrors>({});
  const [preview, setPreview] = useState<CreateAppointmentPreview | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateSuccess | null>(null);

  function updateDraft<K extends keyof CreateAppointmentDraft>(
    key: K,
    value: CreateAppointmentDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
    setPreview(null);
    setSuccess(null);
    setFormError(null);
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateCreateAppointmentDraft(draft, options);

    if (!result.ok) {
      setErrors(result.errors);
      setPreview(null);
      setSuccess(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setSuccess(null);
    setPreview(result.preview);
  }

  function handleConfirm() {
    if (!preview) {
      return;
    }

    try {
      const overlayRead = readBrowserLocalData(storage);
      const appointmentId = idFactory();
      const appointment = createLocalAppointmentFromPreview(
        preview,
        appointmentId,
      );
      const nextOverlay = withAppointmentCreated(
        overlayRead.overlay,
        appointment,
      );
      const writeResult = writeBrowserLocalData(nextOverlay, storage);

      if (!writeResult.ok) {
        setFormError(
          "บันทึกนัดหมายลงข้อมูล Demo ใน browser ไม่สำเร็จ กรุณาลองอีกครั้ง",
        );
        setSuccess(null);
        return;
      }

      const merged = getMergedBrowserAppointments(baseAppointments, storage);
      const persisted = merged.appointments.some(
        (record) => record.id === appointmentId,
      );

      if (!persisted) {
        setFormError(
          "ไม่สามารถยืนยันข้อมูลนัดหมายหลังบันทึกได้ กรุณาลองอีกครั้ง",
        );
        setSuccess(null);
        return;
      }

      setSuccess({
        appointmentId,
        mergedCount: merged.appointments.length,
        recoveredLocalData:
          overlayRead.state === "recovered" ||
          overlayRead.storageError !== null ||
          overlayRead.issues.length > 0,
      });
      setPreview(null);
      setFormError(null);
    } catch {
      setFormError(
        "สร้างนัดหมายไม่สำเร็จ ข้อมูล Demo เดิมไม่ได้ถูกอ้างว่าเปลี่ยนแปลง",
      );
      setSuccess(null);
    }
  }

  function resetForAnother() {
    setDraft({
      ...EMPTY_DRAFT,
      doctorId: firstDoctor,
    });
    setErrors({});
    setPreview(null);
    setFormError(null);
    setSuccess(null);
  }

  return (
    <div className="flex flex-col gap-section">
      {formError ? (
        <FeedbackAlert
          tone="error"
          title="Create appointment failed"
          description={formError}
        />
      ) : null}

      {success ? (
        <FeedbackAlert
          tone="success"
          title="Appointment created in this browser"
          description={`${success.appointmentId} was saved to the Clinic Cloud + local demo overlay. Merged appointment count: ${success.mergedCount}.`}
        />
      ) : null}

      {success?.recoveredLocalData ? (
        <FeedbackAlert
          tone="attention"
          title="Local demo data was recovered"
          description="Some existing browser demo data was malformed or unavailable. Valid recoverable data was used before this appointment was saved."
        />
      ) : null}

      <SectionCard
        title="Appointment details"
        description="Reviewing this form does not write data. Browser-local persistence happens only after the confirmation step."
      >
        <form onSubmit={handleReview} noValidate>
          <FieldGroup>
            <SelectField
              id="create-patient"
              label="Patient *"
              value={draft.patientId}
              options={options.patients}
              placeholder="Select patient"
              error={errors.patientId}
              description="Only patients available to your authenticated role are listed."
              onChange={(value) => updateDraft("patientId", value)}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                id="create-doctor"
                label="Doctor"
                value={draft.doctorId}
                options={options.doctors}
                placeholder="Select doctor"
                optional
                error={errors.doctorId}
                onChange={(value) => updateDraft("doctorId", value)}
              />

              <SelectField
                id="create-service"
                label="Service"
                value={draft.serviceId}
                options={options.services}
                placeholder="Select service"
                optional
                error={errors.serviceId}
                onChange={(value) => updateDraft("serviceId", value)}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id="create-date"
                name="date"
                type="date"
                label="Date"
                value={draft.date}
                onChange={(event) => updateDraft("date", event.target.value)}
                error={errors.date}
                required
              />

              <TextField
                id="create-time"
                name="time"
                type="time"
                label="Time"
                value={draft.time}
                onChange={(event) => updateDraft("time", event.target.value)}
                error={errors.time}
                required
              />
            </div>

            <TextField
              id="create-note"
              name="note"
              label="Note"
              value={draft.note}
              onChange={(event) => updateDraft("note", event.target.value)}
              description="Optional synthetic demo note."
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">
                <CalendarPlusIcon
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                Review appointment
              </Button>
              <Link
                href="/appointments"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Cancel
              </Link>
            </div>
          </FieldGroup>
        </form>
      </SectionCard>

      {preview ? (
        <SectionCard
          title="Confirmation preview"
          description="Check these values before creating the browser-local appointment."
          tone="context"
        >
          <PreviewDetails preview={preview} />

          <div className="mt-5">
            <ConfirmationDialog
              triggerLabel="Confirm & create"
              title="Create this appointment?"
              description="This action will save one appointment to the Clinic Cloud + local demo data in this browser only."
              confirmLabel="Create appointment"
              details={<PreviewDetails preview={preview} />}
              onConfirm={handleConfirm}
            />
          </div>
        </SectionCard>
      ) : null}

      {success ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetForAnother}>
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Create another
          </Button>
          <Link
            href="/appointments"
            className={cn(buttonVariants(), "gap-2")}
          >
            <CheckCircle2Icon
              data-icon="inline-start"
              aria-hidden="true"
            />
            Back to appointments
          </Link>
        </div>
      ) : null}
    </div>
  );
}
