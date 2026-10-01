export const SESSION_COOKIE_NAME = "clinic-cloud-plus.session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
export const SESSION_SECRET_ENV = "CLINIC_CLOUD_SESSION_SECRET";

export const SESSION_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

export function getSessionCookieOptions() {
  return {
    ...SESSION_COOKIE_BASE_OPTIONS,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    ...SESSION_COOKIE_BASE_OPTIONS,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
}

export function requireSessionSecret(): string {
  const secret = process.env[SESSION_SECRET_ENV]?.trim();

  if (!secret) {
    throw new Error(
      `Missing required environment variable: ${SESSION_SECRET_ENV}`,
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `${SESSION_SECRET_ENV} must contain at least 32 characters`,
    );
  }

  return secret;
}
