import { redirect } from "next/navigation";

import { getCurrentUser } from "@/src/auth/current-user";
import type { AuthUser } from "@/src/auth/user";

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
