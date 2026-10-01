import { redirect } from "next/navigation";

import { SettingsView } from "@/components/settings/settings-view";
import { requireCurrentUser } from "@/src/auth/protected";
import { getSettingsProjection } from "@/src/settings/projection";

export default async function SettingsPage() {
  const user = await requireCurrentUser();

  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }

  return <SettingsView projection={getSettingsProjection(user)} />;
}
