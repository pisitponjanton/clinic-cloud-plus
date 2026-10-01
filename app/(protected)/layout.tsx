import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { requireCurrentUser } from "@/src/auth/protected";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCurrentUser();

  return <AppShell user={user}>{children}</AppShell>;
}
