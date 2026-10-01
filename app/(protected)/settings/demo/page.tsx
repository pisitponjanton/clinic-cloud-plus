import { redirect } from "next/navigation";

import { DemoResetPanel } from "@/components/settings/demo-reset-panel";
import { PageHeader } from "@/components/shared";
import { requireCurrentUser } from "@/src/auth/protected";
import {
  assertCanResetDemo,
  getSettingsProjection,
} from "@/src/settings/projection";

export default async function DemoSettingsPage() {
  const user = await requireCurrentUser();

  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }

  assertCanResetDemo(user);
  const projection = getSettingsProjection(user);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-section">
      <PageHeader
        eyebrow="OWNER"
        title="Demo settings"
        description="Inspect Base versus browser-local demo state and reset only the Clinic Cloud + local overlay."
      />

      <DemoResetPanel
        basePatients={projection.basePatients}
        baseAppointments={projection.baseAppointments}
        storageKey={projection.storageKey}
      />
    </div>
  );
}
