import type { AuthInfo } from "@modelcontextprotocol/server";

import type { AuthUser } from "@/src/auth/user";
import { isPersonnelRole } from "@/src/authorization/permissions";
import { getUserById } from "@/src/data-access/private";

function readExtraString(
  extra: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = extra?.[key];
  return typeof value === "string" ? value : null;
}

export function resolveStaffAuthUser(
  authInfo: AuthInfo | undefined,
): AuthUser | null {
  if (!authInfo) {
    return null;
  }

  const userId = readExtraString(authInfo.extra, "userId");
  const clinicId = readExtraString(authInfo.extra, "clinicId");
  const role = readExtraString(authInfo.extra, "role");

  if (!userId || !clinicId || !role) {
    return null;
  }

  const record = getUserById(userId);

  if (
    !record ||
    !record.active ||
    record.clinicId !== clinicId ||
    record.role !== role ||
    !isPersonnelRole(record.role)
  ) {
    return null;
  }

  return {
    id: record.id,
    clinicId: record.clinicId,
    email: record.email,
    displayName: record.displayName,
    role: record.role,
    linkedPatientId: record.linkedPatientId,
    linkedDoctorId: record.linkedDoctorId,
    active: record.active,
  };
}

export function requireStaffAuthUser(
  authInfo: AuthInfo | undefined,
): AuthUser {
  const user = resolveStaffAuthUser(authInfo);

  if (!user) {
    throw new Error("Staff MCP requires a trusted personnel auth context.");
  }

  return user;
}
