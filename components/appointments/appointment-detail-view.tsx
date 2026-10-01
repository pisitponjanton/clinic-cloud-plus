import Link from "next/link";
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  UserRoundIcon,
} from "lucide-react";

import { AppointmentMutationPanel } from "@/components/appointments/appointment-mutation-panel";
import {
  ContextPanel,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppointmentMutationPageData } from "@/src/appointments/mutation-options";
import type { AppointmentDetailProjection } from "@/src/appointments/read-projection";
import type { UserRole } from "@/src/types/private-data";

type AppointmentDetailViewProps = {
  role: Exclude<UserRole, "PATIENT">;
  projection: AppointmentDetailProjection;
  mutation: AppointmentMutationPageData;
};

function genderLabel(
  gender: AppointmentDetailProjection["patient"]["gender"],
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

export function AppointmentDetailView({
  role,
  projection,
  mutation,
}: AppointmentDetailViewProps) {
  const { appointment, patient } = projection;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow={role}
        title={appointment.id}
        description={
          role === "DOCTOR"
            ? "Review and update this assigned appointment. Browser-local changes remain scoped to this device."
            : "Review, update, or cancel this appointment through the browser-local demo overlay."
        }
        actions={
          <Link
            href="/appointments"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            Back to appointments
          </Link>
        }
      />

      <div className="grid gap-section xl:grid-cols-[19rem_minmax(0,1fr)] xl:items-start">
        <ContextPanel
          label="Patient context"
          title={appointment.patientName}
          identifier={appointment.patientHn}
          className="xl:sticky xl:top-8"
          items={[
            { label: "Patient ID", value: patient.id },
            { label: "Phone", value: patient.phone },
            { label: "Date of birth", value: patient.dateOfBirth },
            { label: "Gender", value: genderLabel(patient.gender) },
          ]}
        />

        <div className="flex min-w-0 flex-col gap-section">
          <AppointmentMutationPanel
            baseAppointment={mutation.baseAppointment}
            baseAppointments={mutation.baseAppointments}
            options={mutation.options}
          />

          <SectionCard
            title="Continue workflow"
            description="Open the related patient context or move to the read-only queue workflow."
            tone="context"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={`/patients/${patient.id}`}
                className={buttonVariants({ variant: "default" })}
              >
                <UserRoundIcon data-icon="inline-start" aria-hidden="true" />
                Open patient
              </Link>
              <Link
                href="/queue"
                className={buttonVariants({ variant: "outline" })}
              >
                <ClipboardListIcon
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                View queue
              </Link>
            </div>
          </SectionCard>

          <Link
            href="/appointments"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "self-start text-muted-foreground",
            )}
          >
            Return to appointment list
          </Link>
        </div>
      </div>
    </div>
  );
}