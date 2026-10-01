import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import {
  STAFF_MCP_SECRET_ENV,
  STAFF_MCP_SCOPE,
  STAFF_OFFLINE_SCOPE,
} from "@/src/mcp/staff/config";
import { handleStaffMcpRequest } from "@/src/mcp/staff/http";
import {
  buildStaffOAuthMetadata,
  buildStaffProtectedResourceMetadata,
  handleStaffAuthorizationGet,
  handleStaffAuthorizationPost,
  handleStaffClientRegistration,
  handleStaffTokenExchange,
} from "@/src/mcp/staff/oauth";
import {
  createStaffAccessToken,
  verifyStaffAccessToken,
} from "@/src/mcp/staff/tokens";

const TEST_SECRET =
  "phase-30-staff-mcp-secret-with-more-than-thirty-two-characters";
const REDIRECT_URI = "https://client.example/callback";
const CODE_VERIFIER =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
const CODE_CHALLENGE = createHash("sha256")
  .update(CODE_VERIFIER, "utf8")
  .digest("base64url");

function rpcRequest(token?: string): Request {
  return new Request("http://localhost/mcp/staff", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: "localhost",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    }),
  });
}

async function registerClient(): Promise<string> {
  const response = await handleStaffClientRegistration(
    new Request("http://localhost/oauth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_name: "Phase 30 Test Client",
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: "none",
      }),
    }),
    TEST_SECRET,
  );

  expect(response.status).toBe(201);

  const body = (await response.json()) as {
    client_id: string;
    redirect_uris: string[];
  };

  expect(body.redirect_uris).toEqual([REDIRECT_URI]);

  return body.client_id;
}

function authorizeUrl(clientId: string, offlineAccess = false): string {
  const url = new URL("http://localhost/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set(
    "scope",
    offlineAccess
      ? `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`
      : STAFF_MCP_SCOPE,
  );
  url.searchParams.set("state", "phase-30-state");
  url.searchParams.set("code_challenge", CODE_CHALLENGE);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function authorizePersonnel(
  clientId: string,
  email: string,
  offlineAccess = false,
): Promise<string> {
  const response = await handleStaffAuthorizationPost(
    new Request("http://localhost/oauth/authorize", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        state: "phase-30-state",
        code_challenge: CODE_CHALLENGE,
        scope: offlineAccess
          ? `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`
          : STAFF_MCP_SCOPE,
        email,
        password: "12345678",
      }),
    }),
    TEST_SECRET,
  );

  expect(response.status).toBe(302);

  const location = response.headers.get("location");

  if (!location) {
    throw new Error("Missing authorization redirect");
  }

  const redirect = new URL(location);
  expect(redirect.origin + redirect.pathname).toBe(REDIRECT_URI);
  expect(redirect.searchParams.get("state")).toBe("phase-30-state");
  expect(redirect.searchParams.get("iss")).toBe("http://localhost");

  const code = redirect.searchParams.get("code");

  if (!code) {
    throw new Error("Missing authorization code");
  }

  return code;
}

async function exchangeCode(
  clientId: string,
  code: string,
  verifier = CODE_VERIFIER,
): Promise<Response> {
  return handleStaffTokenExchange(
    new Request("http://localhost/oauth/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    }),
    TEST_SECRET,
  );
}

describe("Staff MCP OAuth-compatible auth foundation", () => {
  beforeEach(() => {
    process.env[STAFF_MCP_SECRET_ENV] = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env[STAFF_MCP_SECRET_ENV];
  });

  it("publishes OAuth authorization-server and protected-resource metadata", () => {
    const oauth = buildStaffOAuthMetadata("https://clinic.example");
    const resource = buildStaffProtectedResourceMetadata(
      "https://clinic.example",
    );

    expect(oauth).toMatchObject({
      issuer: "https://clinic.example",
      authorization_endpoint: "https://clinic.example/oauth/authorize",
      token_endpoint: "https://clinic.example/oauth/token",
      registration_endpoint: "https://clinic.example/oauth/register",
      scopes_supported: [STAFF_MCP_SCOPE, STAFF_OFFLINE_SCOPE],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
    });

    expect(resource).toMatchObject({
      resource: "https://clinic.example/mcp/staff",
      authorization_servers: ["https://clinic.example"],
      scopes_supported: [STAFF_MCP_SCOPE],
    });
  });

  it("registers a stateless public PKCE client and renders the authorization login page", async () => {
    const clientId = await registerClient();
    const response = await handleStaffAuthorizationGet(
      new Request(authorizeUrl(clientId)),
      TEST_SECRET,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const html = await response.text();

    expect(html).toContain("Authorize Staff MCP");
    expect(html).toContain("Authorize Clinic Cloud + Staff MCP");
    expect(html).not.toContain("access_token");
  });

  it.each([
    ["OWNER", "owner@cliniccloud.demo"],
    ["STAFF", "staff@cliniccloud.demo"],
    ["DOCTOR", "doctor@cliniccloud.demo"],
    ["NURSE", "nurse@cliniccloud.demo"],
  ] as const)(
    "authorizes seeded %s and exchanges PKCE code for a trusted bearer token",
    async (role, email) => {
      const clientId = await registerClient();
      const code = await authorizePersonnel(clientId, email);
      const tokenResponse = await exchangeCode(clientId, code);

      expect(tokenResponse.status).toBe(200);

      const tokenBody = (await tokenResponse.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
        scope: string;
      };

      expect(tokenBody.token_type).toBe("Bearer");
      expect(tokenBody.scope).toBe(STAFF_MCP_SCOPE);
      expect(tokenBody.expires_in).toBe(3600);

      const verified = verifyStaffAccessToken(
        tokenBody.access_token,
        TEST_SECRET,
      );

      expect(verified?.user.role).toBe(role);
      expect(verified?.payload.aud).toBe("clinic-cloud-plus-staff-mcp");
      expect(verified?.payload.clientId).toBe(clientId);
    },
  );

  it("issues and rotates a stateless refresh token when offline_access is granted", async () => {
    const clientId = await registerClient();
    const code = await authorizePersonnel(
      clientId,
      "staff@cliniccloud.demo",
      true,
    );
    const tokenResponse = await exchangeCode(clientId, code);

    expect(tokenResponse.status).toBe(200);

    const first = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };

    expect(first.token_type).toBe("Bearer");
    expect(first.scope).toBe(
      `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`,
    );
    expect(first.refresh_token).toBeTruthy();

    const refreshResponse = await handleStaffTokenExchange(
      new Request("http://localhost/oauth/token", {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: first.refresh_token!,
          client_id: clientId,
          scope: `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`,
        }),
      }),
      TEST_SECRET,
    );

    expect(refreshResponse.status).toBe(200);

    const refreshed = (await refreshResponse.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };

    expect(refreshed.refresh_token).not.toBe(first.refresh_token);
    expect(refreshed.scope).toBe(
      `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`,
    );

    const verified = verifyStaffAccessToken(
      refreshed.access_token,
      TEST_SECRET,
    );

    expect(verified?.user.role).toBe("STAFF");
    expect(verified?.payload.clientId).toBe(clientId);
  });

  it("rejects the seeded PATIENT account from becoming a Staff MCP identity", async () => {
    const clientId = await registerClient();
    const response = await handleStaffAuthorizationPost(
      new Request("http://localhost/oauth/authorize", {
        method: "POST",
        body: new URLSearchParams({
          client_id: clientId,
          redirect_uri: REDIRECT_URI,
          state: "phase-30-state",
          code_challenge: CODE_CHALLENGE,
          email: "patient@cliniccloud.demo",
          password: "12345678",
        }),
      }),
      TEST_SECRET,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();

    const html = await response.text();
    expect(html).toContain("cannot authorize Staff MCP");
    expect(html).not.toContain("?code=");
  });

  it("rejects a token when its signed role is tampered", () => {
    const record = authenticateDemoUser(
      "staff@cliniccloud.demo",
      "12345678",
    );

    if (!record) {
      throw new Error("Missing seeded staff");
    }

    const token = createStaffAccessToken(
      toAuthUser(record),
      "client-test",
      TEST_SECRET,
    );
    const [body, signature] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(body!, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    payload.role = "OWNER";

    const tamperedBody = Buffer.from(
      JSON.stringify(payload),
      "utf8",
    ).toString("base64url");
    const tampered = `${tamperedBody}.${signature}`;

    expect(verifyStaffAccessToken(tampered, TEST_SECRET)).toBeNull();
  });

  it("rejects expired bearer tokens", () => {
    const record = authenticateDemoUser(
      "staff@cliniccloud.demo",
      "12345678",
    );

    if (!record) {
      throw new Error("Missing seeded staff");
    }

    const issuedAt = new Date("2026-10-01T00:00:00.000Z");
    const token = createStaffAccessToken(
      toAuthUser(record),
      "client-test",
      TEST_SECRET,
      issuedAt,
    );

    expect(
      verifyStaffAccessToken(
        token,
        TEST_SECRET,
        new Date("2026-10-01T02:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("rejects a wrong PKCE verifier at token exchange", async () => {
    const clientId = await registerClient();
    const code = await authorizePersonnel(
      clientId,
      "staff@cliniccloud.demo",
    );
    const response = await exchangeCode(
      clientId,
      code,
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~",
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "invalid_grant",
    });
  });

  it("returns 401 and OAuth resource discovery challenge when Staff MCP is unauthenticated", async () => {
    const response = await handleStaffMcpRequest(rpcRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Bearer");
    expect(response.headers.get("www-authenticate")).toContain(
      "resource_metadata=",
    );

    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("CLINIC-001");
  });

  it("accepts a valid Staff bearer token without relying on the Web session cookie", async () => {
    const clientId = await registerClient();
    const code = await authorizePersonnel(
      clientId,
      "staff@cliniccloud.demo",
    );
    const tokenResponse = await exchangeCode(clientId, code);
    const tokenBody = (await tokenResponse.json()) as {
      access_token: string;
    };

    const response = await handleStaffMcpRequest(
      rpcRequest(tokenBody.access_token),
    );

    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain(TEST_SECRET);
  });
});
