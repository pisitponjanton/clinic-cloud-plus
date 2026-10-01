import { getUserByEmail, getUserById } from "@/src/data-access/private";
import type { DemoUser, UserRole } from "@/src/types/private-data";
import { verifyDemoPassword } from "@/src/auth/password";
import { verifySessionToken } from "@/src/auth/session-token";

export type AuthUser = {
  id: string;
  clinicId: string;
  email: string;
  displayName: string;
  role: UserRole;
  linkedPatientId: string | null;
  linkedDoctorId: string | null;
  active: boolean;
};

export function toAuthUser(user: DemoUser): AuthUser {
  return {
    id: user.id,
    clinicId: user.clinicId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    linkedPatientId: user.linkedPatientId,
    linkedDoctorId: user.linkedDoctorId,
    active: user.active,
  };
}

export function verifyDemoUserCredentials(
  user: DemoUser,
  password: string,
): boolean {
  if (!user.active) {
    return false;
  }

  return verifyDemoPassword(password, user.passwordHash);
}

export function authenticateDemoUser(
  email: string,
  password: string,
): DemoUser | null {
  const user = getUserByEmail(email);

  if (!user || !verifyDemoUserCredentials(user, password)) {
    return null;
  }

  return user;
}

export function resolveSessionUser(
  token: string,
  secret: string,
  now: Date = new Date(),
): AuthUser | null {
  const payload = verifySessionToken(token, secret, now);

  if (!payload) {
    return null;
  }

  const user = getUserById(payload.userId);

  if (
    !user ||
    !user.active ||
    user.clinicId !== payload.clinicId ||
    user.role !== payload.role
  ) {
    return null;
  }

  return toAuthUser(user);
}
