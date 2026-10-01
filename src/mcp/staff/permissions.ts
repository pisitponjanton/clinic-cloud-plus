import type { AuthUser } from "@/src/auth/user";
import { AuthorizationError } from "@/src/authorization/permissions";

export function assertCanReadDoctorSchedule(
  user: AuthUser,
  doctorId: string,
): void {
  if (user.role !== "DOCTOR") {
    return;
  }

  if (!user.linkedDoctorId || user.linkedDoctorId !== doctorId) {
    throw new AuthorizationError(
      "Doctor accounts may read only their own Staff MCP schedule.",
    );
  }
}
