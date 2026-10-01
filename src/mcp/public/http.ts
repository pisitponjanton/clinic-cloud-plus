import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";

import { publicMcpHandler } from "@/src/mcp/public/server";

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

function configuredHostnames(): string[] {
  const explicit = process.env.PUBLIC_MCP_ALLOWED_HOSTS
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

export function getPublicMcpAllowedHostnames(): string[] {
  return configuredHostnames();
}

export async function handlePublicMcpRequest(
  request: Request,
): Promise<Response> {
  const allowedHostnames = configuredHostnames();

  const rejected =
    hostHeaderValidationResponse(request, allowedHostnames) ??
    originValidationResponse(request, allowedHostnames);

  if (rejected) {
    return rejected;
  }

  return publicMcpHandler.fetch(request);
}
