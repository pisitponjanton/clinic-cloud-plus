import Link from "next/link";
import {
  Building2Icon,
  DatabaseIcon,
  KeyRoundIcon,
  RotateCcwIcon,
} from "lucide-react";

import {
  ContextPanel,
  PageHeader,
  SectionCard,
} from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import type { SettingsProjection } from "@/src/settings/projection";

export function SettingsView({
  projection,
}: {
  projection: SettingsProjection;
}) {
  const { clinic } = projection;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="OWNER"
        title="Settings"
        description="Read-only Clinic Cloud + demo configuration. Mutable demo appointment state remains browser-local."
        actions={
          <Link
            href="/settings/demo"
            className={buttonVariants()}
          >
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Demo settings
          </Link>
        }
      />

      <div className="grid gap-section lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
        <ContextPanel
          label="Clinic context"
          title={clinic.name}
          identifier={clinic.id}
          items={[
            { label: "Phone", value: clinic.phone },
            { label: "Address", value: clinic.address },
          ]}
        />

        <div className="flex min-w-0 flex-col gap-section">
          <SectionCard
            title="Clinic configuration"
            description="Public clinic information comes from the read-only repository Base Dataset."
          >
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                  <Building2Icon className="size-4" aria-hidden="true" />
                  Clinic name
                </dt>
                <dd className="mt-1 font-medium">{clinic.name}</dd>
              </div>
              <div>
                <dt className="text-meta text-muted-foreground">
                  Description
                </dt>
                <dd className="mt-1 text-sm">{clinic.description}</dd>
              </div>
              <div>
                <dt className="text-meta text-muted-foreground">
                  Opening days
                </dt>
                <dd className="mt-1 font-medium">
                  {clinic.openingHours.length}
                </dd>
              </div>
              <div>
                <dt className="text-meta text-muted-foreground">
                  Runtime persistence
                </dt>
                <dd className="mt-1 font-medium">
                  Browser-local appointment overlay
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Demo data model"
            description="Repository JSON remains read-only. Appointment mutations are stored only in this browser."
            tone="context"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                  <DatabaseIcon className="size-4" aria-hidden="true" />
                  Base patients
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold">
                  {projection.basePatients}
                </dd>
              </div>
              <div>
                <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                  <DatabaseIcon className="size-4" aria-hidden="true" />
                  Base appointments
                </dt>
                <dd className="mt-1 font-mono text-lg font-semibold">
                  {projection.baseAppointments}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="inline-flex items-center gap-2 text-meta text-muted-foreground">
                  <KeyRoundIcon className="size-4" aria-hidden="true" />
                  Overlay key
                </dt>
                <dd className="mt-1 break-all font-mono text-sm font-medium">
                  {projection.storageKey}
                </dd>
              </div>
              <div>
                <dt className="text-meta text-muted-foreground">
                  Schema version
                </dt>
                <dd className="mt-1 font-mono font-semibold">
                  {projection.schemaVersion}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
