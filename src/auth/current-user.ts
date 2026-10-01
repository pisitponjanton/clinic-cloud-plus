import { cookies } from "next/headers";

import {
  requireSessionSecret,
  SESSION_COOKIE_NAME,
} from "@/src/auth/config";
import { resolveSessionUser, type AuthUser } from "@/src/auth/user";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return resolveSessionUser(token, requireSessionSecret());
}
