export const HANDOFF_SECRET_ENV = "CLINIC_CLOUD_HANDOFF_SECRET";
export const APPOINTMENT_HANDOFF_TTL_SECONDS = 60 * 5;
export const APPOINTMENT_HANDOFF_PATH = "/handoff/appointment";

export function requireHandoffSecret(): string {
  const secret = process.env[HANDOFF_SECRET_ENV]?.trim();

  if (!secret) {
    throw new Error(
      `Missing required environment variable: ${HANDOFF_SECRET_ENV}`,
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `${HANDOFF_SECRET_ENV} must contain at least 32 characters`,
    );
  }

  return secret;
}
