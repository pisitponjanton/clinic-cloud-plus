export const STAFF_MCP_AUDIENCE = "clinic-cloud-plus-staff-mcp";
export const STAFF_MCP_SCOPE = "staff:mcp";
export const STAFF_OFFLINE_SCOPE = "offline_access";
export const STAFF_MCP_SECRET_ENV = "CLINIC_CLOUD_STAFF_MCP_SECRET";

export const STAFF_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const STAFF_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
export const STAFF_AUTH_CODE_TTL_SECONDS = 2 * 60;
export const STAFF_CLIENT_ID_TTL_SECONDS = 60 * 60 * 24 * 365;

export function requireStaffMcpSecret(): string {
  const secret = process.env[STAFF_MCP_SECRET_ENV]?.trim();

  if (!secret) {
    throw new Error(
      `Missing required environment variable: ${STAFF_MCP_SECRET_ENV}`,
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `${STAFF_MCP_SECRET_ENV} must contain at least 32 characters`,
    );
  }

  return secret;
}

export function isAllowedOAuthRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.username || url.password || url.hash) {
      return false;
    }

    if (url.protocol === "https:") {
      return true;
    }

    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}
