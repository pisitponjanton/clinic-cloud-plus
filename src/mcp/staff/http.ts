import {
  getOAuthProtectedResourceMetadataUrl,
  hostHeaderValidationResponse,
  originValidationResponse,
  requireBearerAuth,
} from "@modelcontextprotocol/server";

import {
  STAFF_MCP_SCOPE,
  requireStaffMcpSecret,
} from "@/src/mcp/staff/config";
import { staffMcpHandler } from "@/src/mcp/staff/server";
import { createStaffMcpTokenVerifier } from "@/src/mcp/staff/tokens";

function normalizeHostname(value: string | undefined): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  try {
    const url = raw.includes("://")
      ? new URL(raw)
      : new URL(`https://${raw}`);

    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getStaffMcpAllowedHostnames(): string[] {
  const explicit = process.env.STAFF_MCP_ALLOWED_HOSTS
    ?.split(",")
    .map((entry) => normalizeHostname(entry))
    .filter((entry): entry is string => entry !== null);

  const vercel = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
  ]
    .map(normalizeHostname)
    .filter((entry): entry is string => entry !== null);

  return Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      ...(explicit ?? []),
      ...vercel,
    ]),
  );
}

export async function handleStaffMcpRequest(
  request: Request,
): Promise<Response> {
  const allowedHostnames = getStaffMcpAllowedHostnames();

  const rejected =
    hostHeaderValidationResponse(request, allowedHostnames) ??
    originValidationResponse(request, allowedHostnames);

  if (rejected) {
    return rejected;
  }

  const resourceUrl = new URL("/mcp/staff", request.url);
  const resourceMetadataUrl =
    getOAuthProtectedResourceMetadataUrl(resourceUrl);

  const gate = requireBearerAuth({
    verifier: createStaffMcpTokenVerifier(requireStaffMcpSecret()),
    requiredScopes: [STAFF_MCP_SCOPE],
    resourceMetadataUrl,
  });

  const authInfo = await gate(request);

  if (authInfo instanceof Response) {
    return authInfo;
  }

  return staffMcpHandler.fetch(request, {
    authInfo,
  });
}
