"use client";

import { useEffect, useState } from "react";
import {
  DatabaseIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  ConfirmationDialog,
  FeedbackAlert,
  SectionCard,
} from "@/components/shared";
import type { BrowserStorageLike } from "@/src/local-data/browser-appointment-overlay";
import {
  readBrowserLocalData,
  resetBrowserLocalData,
} from "@/src/local-data/browser-appointment-overlay";

type LocalCounts = {
  created: number;
  updated: number;
  deleted: number;
  state: string;
};

type DemoResetPanelProps = {
  basePatients: number;
  baseAppointments: number;
  storageKey: string;
  storage?: BrowserStorageLike | null;
};

function readCounts(
  storage?: BrowserStorageLike | null,
): {
  counts: LocalCounts;
  recovered: boolean;
} {
  const result = readBrowserLocalData(storage);

  return {
    counts: {
      created: result.overlay.collections.appointments.created.length,
      updated: Object.keys(
        result.overlay.collections.appointments.updated,
      ).length,
      deleted: result.overlay.collections.appointments.deletedIds.length,
      state: result.state,
    },
    recovered:
      result.state === "recovered" ||
      result.storageError !== null ||
      result.issues.length > 0,
  };
}

export function DemoResetPanel({
  basePatients,
  baseAppointments,
  storageKey,
  storage,
}: DemoResetPanelProps) {
  const [counts, setCounts] = useState<LocalCounts>({
    created: 0,
    updated: 0,
    deleted: 0,
    state: "loading",
  });
  const [notice, setNotice] = useState<
    | {
        tone: "success" | "error" | "attention";
        title: string;
        description: string;
      }
    | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const snapshot = readCounts(storage);
      setCounts(snapshot.counts);

      if (snapshot.recovered) {
        setNotice({
          tone: "attention",
          title: "Local demo data was recovered",
          description:
            "Some browser-local demo data was malformed or unavailable. Reset Demo Data can restore a clean Base-only state.",
        });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [storage]);

  function handleReset() {
    const result = resetBrowserLocalData(storage);

    if (!result.ok) {
      setNotice({
        tone: "error",
        title: "Reset Demo Data failed",
        description:
          "The browser-local Clinic Cloud + overlay could not be removed. Your Base Dataset and login session were not changed.",
      });
      return;
    }

    const snapshot = readCounts(storage);
    setCounts(snapshot.counts);
    setNotice({
      tone: "success",
      title: "Demo data reset",
      description:
        "The Clinic Cloud + browser-local overlay was removed. Future reads start from the read-only Base Dataset, and you remain signed in.",
    });
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
        title="Demo data counts"
        description="Base counts come from repository JSON. Local counts are read from this browser only."
      >
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <dt className="text-meta text-muted-foreground">Base Patients</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              {basePatients}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">
              Base Appointments
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              {baseAppointments}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">
              Local Created Appointments
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              {counts.created}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">
              Local Updated Appointments
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              {counts.updated}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-muted-foreground">
              Local Deleted Records
            </dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              {counts.deleted}
            </dd>
          </div>
        </dl>

        <p className="mt-4 break-all font-mono text-meta text-muted-foreground">
          {storageKey}
        </p>
      </SectionCard>

      <SectionCard
        title="Reset Demo Data"
        description="Use this recovery action to discard browser-local appointment changes and return this browser to the Base Dataset."
        tone="context"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <DatabaseIcon className="size-4" aria-hidden="true" />
              This removes only the Clinic Cloud + local overlay key.
            </p>
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
              Base JSON, demo accounts, and the current auth session remain
              unchanged.
            </p>
            <p className="text-meta text-muted-foreground">
              Current local state: {counts.state}
            </p>
          </div>

          <ConfirmationDialog
            triggerLabel="Reset Demo Data"
            title="Reset browser demo data?"
            description="This removes all local-created, local-updated, and locally deleted Appointment overlay records for Clinic Cloud + in this browser."
            confirmLabel="Reset demo data"
            cancelLabel="Keep local data"
            tone="destructive"
            details={
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="font-mono font-medium">{counts.created}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Updated</dt>
                  <dd className="font-mono font-medium">{counts.updated}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Deleted IDs</dt>
                  <dd className="font-mono font-medium">{counts.deleted}</dd>
                </div>
              </dl>
            }
            onConfirm={handleReset}
          />
        </div>
      </SectionCard>

      <p className="inline-flex items-center gap-2 text-meta text-muted-foreground">
        <RefreshCcwIcon className="size-4" aria-hidden="true" />
        Reset is separate from Logout. Logging out does not clear this overlay,
        and resetting the overlay does not log you out.
      </p>
    </div>
  );
}
