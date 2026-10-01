import { IdCardIcon, PhoneIcon, UserRoundIcon } from "lucide-react";

import {
  ContextPanel,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import type { PatientProfileProjection } from "@/src/patient-portal/projection";

function genderLabel(
  gender: PatientProfileProjection["patient"]["gender"],
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

export function PatientProfileView({
  projection,
}: {
  projection: PatientProfileProjection;
}) {
  const { patient } = projection;
  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-section">
      <PageHeader
        eyebrow="PATIENT"
        title="My profile"
        description="Your linked demo patient identity. This page does not expose any other patient record."
      />

      <div className="grid gap-section lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
        <ContextPanel
          label="Patient identity"
          title={fullName}
          identifier={patient.hn}
          items={[
            { label: "Patient ID", value: patient.id },
            { label: "Clinic", value: patient.clinicId },
          ]}
        />

        <SectionCard
          title="Personal information"
          description="Read-only synthetic profile information from the Clinic Cloud + Base Dataset."
        >
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                <UserRoundIcon className="size-4" aria-hidden="true" />
                Full name
              </dt>
              <dd className="mt-1 font-medium">{fullName}</dd>
            </div>

            <div>
              <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                <IdCardIcon className="size-4" aria-hidden="true" />
                HN
              </dt>
              <dd className="mt-1 font-mono font-medium">{patient.hn}</dd>
            </div>

            <div>
              <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                <PhoneIcon className="size-4" aria-hidden="true" />
                Phone
              </dt>
              <dd className="mt-1 font-medium">{patient.phone}</dd>
            </div>

            <div>
              <dt className="text-meta text-muted-foreground">Date of birth</dt>
              <dd className="mt-1 font-medium">{patient.dateOfBirth}</dd>
            </div>

            <div>
              <dt className="text-meta text-muted-foreground">Gender</dt>
              <dd className="mt-1 font-medium">{genderLabel(patient.gender)}</dd>
            </div>

            <div>
              <dt className="text-meta text-muted-foreground">Patient ID</dt>
              <dd className="mt-1 font-mono font-medium">{patient.id}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
