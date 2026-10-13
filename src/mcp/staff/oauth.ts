import type { OAuthMetadata } from "@modelcontextprotocol/server";
import {
  buildOAuthProtectedResourceMetadata,
  type OAuthProtectedResourceMetadata,
} from "@modelcontextprotocol/server";

import { authenticateDemoUser, toAuthUser } from "@/src/auth/user";
import { getUserById } from "@/src/data-access/private";
import { isPersonnelRole } from "@/src/authorization/permissions";
import {
  isAllowedOAuthRedirectUri,
  STAFF_ACCESS_TOKEN_TTL_SECONDS,
  STAFF_MCP_SCOPE,
  STAFF_OFFLINE_SCOPE,
} from "@/src/mcp/staff/config";
import {
  createAuthorizationCode,
  createRegisteredClientId,
  createStaffAccessToken,
  createStaffRefreshToken,
  verifyAuthorizationCode,
  verifyPkceS256,
  verifyRegisteredClientId,
  verifyStaffRefreshToken,
} from "@/src/mcp/staff/tokens";

const PKCE_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

function json(
  body: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function oauthError(
  error: string,
  description: string,
  status = 400,
): Response {
  return json(
    {
      error,
      error_description: description,
    },
    status,
  );
}

function baseUrl(request: Request): URL {
  return new URL(request.url);
}

export function buildStaffOAuthMetadata(origin: string): OAuthMetadata {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    scopes_supported: [STAFF_MCP_SCOPE, STAFF_OFFLINE_SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  };
}

export function buildStaffProtectedResourceMetadata(
  origin: string,
): OAuthProtectedResourceMetadata {
  return buildOAuthProtectedResourceMetadata({
    oauthMetadata: buildStaffOAuthMetadata(origin),
    resourceServerUrl: new URL("/mcp/staff", origin),
    scopesSupported: [STAFF_MCP_SCOPE],
    resourceName: "Clinic Cloud + Staff MCP",
    dangerouslyAllowInsecureIssuerUrl:
      new URL(origin).hostname === "localhost" ||
      new URL(origin).hostname === "127.0.0.1",
  });
}

export async function handleStaffClientRegistration(
  request: Request,
  secret: string,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return oauthError("invalid_client_metadata", "Request body must be JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return oauthError(
      "invalid_client_metadata",
      "Client metadata must be an object.",
    );
  }

  const record = body as Record<string, unknown>;
  const redirectUris = record.redirect_uris;
  const clientName =
    typeof record.client_name === "string" ? record.client_name.trim() : null;
  const tokenMethod =
    record.token_endpoint_auth_method === undefined
      ? "none"
      : record.token_endpoint_auth_method;
  const applicationType =
    record.application_type === undefined ? "web" : record.application_type;

  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length < 1 ||
    redirectUris.length > 10 ||
    !redirectUris.every(
      (uri) =>
        typeof uri === "string" &&
        uri.length <= 2048 &&
        isAllowedOAuthRedirectUri(uri),
    )
  ) {
    return oauthError(
      "invalid_redirect_uri",
      "At least one valid HTTPS or localhost redirect URI is required.",
    );
  }

  if (clientName !== null && (clientName.length < 1 || clientName.length > 100)) {
    return oauthError(
      "invalid_client_metadata",
      "client_name must contain 1-100 characters.",
    );
  }

  if (applicationType !== "web" && applicationType !== "native") {
    return oauthError(
      "invalid_client_metadata",
      "application_type must be web or native.",
    );
  }

  if (tokenMethod !== "none") {
    return oauthError(
      "invalid_client_metadata",
      "Only public PKCE clients with token_endpoint_auth_method=none are supported.",
    );
  }

  const uniqueRedirectUris = Array.from(new Set(redirectUris as string[]));
  const clientId = createRegisteredClientId(
    {
      redirectUris: uniqueRedirectUris,
      clientName,
      grantTypes: ["authorization_code", "refresh_token"],
    },
    secret,
  );

  return json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName ?? undefined,
      redirect_uris: uniqueRedirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: applicationType,
    },
    201,
  );
}

type ValidAuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  offlineAccess: boolean;
  scope: string;
};

function validateAuthorizationRequest(
  request: Request,
  secret: string,
): ValidAuthorizationRequest | Response {
  const url = baseUrl(request);
  const responseType = url.searchParams.get("response_type");
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const scope = url.searchParams.get("scope") ?? STAFF_MCP_SCOPE;

  if (responseType !== "code") {
    return oauthError(
      "unsupported_response_type",
      "Only authorization code flow is supported.",
    );
  }

  if (!clientId || !redirectUri || !codeChallenge) {
    return oauthError(
      "invalid_request",
      "client_id, redirect_uri, and code_challenge are required.",
    );
  }

  const client = verifyRegisteredClientId(clientId, secret);

  if (!client || !client.redirectUris.includes(redirectUri)) {
    return oauthError(
      "invalid_request",
      "Unknown client or redirect URI mismatch.",
    );
  }

  if (
    codeChallengeMethod !== "S256" ||
    !CHALLENGE_PATTERN.test(codeChallenge)
  ) {
    return oauthError(
      "invalid_request",
      "PKCE S256 code_challenge is required.",
    );
  }

  const scopes = Array.from(
    new Set(scope.split(/\s+/).filter((entry) => entry.length > 0)),
  );
  const offlineAccess = scopes.includes(STAFF_OFFLINE_SCOPE);

  if (
    !scopes.includes(STAFF_MCP_SCOPE) ||
    scopes.some(
      (entry) => entry !== STAFF_MCP_SCOPE && entry !== STAFF_OFFLINE_SCOPE,
    ) ||
    (offlineAccess && !client.grantTypes.includes("refresh_token"))
  ) {
    return oauthError(
      "invalid_scope",
      `Supported scopes are ${STAFF_MCP_SCOPE} and optional ${STAFF_OFFLINE_SCOPE}.`,
    );
  }

  if (state !== null && state.length > 512) {
    return oauthError("invalid_request", "state is too long.");
  }

  return {
    clientId,
    redirectUri,
    state,
    codeChallenge,
    offlineAccess,
    scope: scopes.join(" "),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function hidden(name: string, value: string | null): string {
  if (value === null) {
    return "";
  }

  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
}

function authorizationHtml(
  values: ValidAuthorizationRequest,
  errorMessage?: string,
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize Clinic Cloud + Staff MCP</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #f5f8f7; color: #173b3a; }
    main { width: min(92vw, 30rem); margin: 8vh auto; background: white; border: 1px solid #d8e2df; border-radius: 1rem; padding: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
    p { line-height: 1.5; color: #4b6562; }
    label { display: grid; gap: .4rem; margin-top: 1rem; font-weight: 600; }
    input { min-height: 2.75rem; border: 1px solid #9db2ae; border-radius: .6rem; padding: 0 .75rem; font: inherit; }
    input:focus-visible { outline: 3px solid #9bd8cd; outline-offset: 2px; }
    button { width: 100%; margin-top: 1.25rem; min-height: 2.8rem; border: 0; border-radius: .6rem; background: #0f766e; color: white; font: inherit; font-weight: 700; cursor: pointer; }
    .error { margin-top: 1rem; border: 1px solid #e4aaa3; border-radius: .6rem; padding: .75rem; color: #8f2118; background: #fff5f4; }
    .note { font-size: .875rem; }
  </style>
</head>
<body>
  <main>
    <h1>Authorize Staff MCP</h1>
    <p>Sign in with an OWNER, STAFF, DOCTOR, or NURSE demo account and grant this MCP client access to the authenticated Staff MCP scope.</p>
    <p class="note"><strong>Demo password:</strong> <code>12345678</code> for all personnel demo accounts. If your browser autofills a saved password, replace it with this demo password.</p>
    ${errorMessage ? `<div class="error" role="alert">${escapeHtml(errorMessage)}</div>` : ""}
    <form method="post" action="/oauth/authorize">
      ${hidden("client_id", values.clientId)}
      ${hidden("redirect_uri", values.redirectUri)}
      ${hidden("state", values.state)}
      ${hidden("code_challenge", values.codeChallenge)}
      ${hidden("scope", values.scope)}
      <label>Email
        <input name="email" type="email" list="personnel-demo-accounts" autocomplete="username" required />
      </label>
      <datalist id="personnel-demo-accounts">
        <option value="owner@cliniccloud.demo"></option>
        <option value="staff@cliniccloud.demo"></option>
        <option value="doctor@cliniccloud.demo"></option>
        <option value="nurse@cliniccloud.demo"></option>
      </datalist>
      <label>Password
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Authorize Clinic Cloud + Staff MCP</button>
    </form>
    <p class="note">Patient accounts cannot authorize the internal Staff MCP. This connection does not reuse the Web login cookie.</p>
  </main>
</body>
</html>`;
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function handleStaffAuthorizationGet(
  request: Request,
  secret: string,
): Promise<Response> {
  const validation = validateAuthorizationRequest(request, secret);

  if (validation instanceof Response) {
    return validation;
  }

  return html(authorizationHtml(validation));
}

export async function handleStaffAuthorizationPost(
  request: Request,
  secret: string,
): Promise<Response> {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return oauthError("invalid_request", "Form data is required.");
  }

  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = form.get("state");
  const stateValue = state === null ? null : String(state);
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const scope = String(form.get("scope") ?? STAFF_MCP_SCOPE);
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const syntheticRequest = new Request(
    `${baseUrl(request).origin}/oauth/authorize?${new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      scope,
      ...(stateValue ? { state: stateValue } : {}),
    })}`,
  );

  const validation = validateAuthorizationRequest(syntheticRequest, secret);

  if (validation instanceof Response) {
    return validation;
  }

  const authenticated = authenticateDemoUser(email, password);

  if (!authenticated || !isPersonnelRole(authenticated.role)) {
    return html(
      authorizationHtml(
        validation,
        "Invalid credentials or this account cannot authorize Staff MCP.",
      ),
      401,
    );
  }

  const user = toAuthUser(authenticated);
  const code = createAuthorizationCode(
    user,
    {
      clientId: validation.clientId,
      redirectUri: validation.redirectUri,
      codeChallenge: validation.codeChallenge,
      offlineAccess: validation.offlineAccess,
    },
    secret,
  );

  const redirect = new URL(validation.redirectUri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("iss", baseUrl(request).origin);

  if (validation.state !== null) {
    redirect.searchParams.set("state", validation.state);
  }

  return Response.redirect(redirect, 302);
}

export async function handleStaffTokenExchange(
  request: Request,
  secret: string,
): Promise<Response> {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return oauthError("invalid_request", "Form data is required.");
  }

  const grantType = String(form.get("grant_type") ?? "");
  const clientId = String(form.get("client_id") ?? "");

  if (!clientId) {
    return oauthError("invalid_request", "client_id is required.");
  }

  const client = verifyRegisteredClientId(clientId, secret);

  if (!client) {
    return oauthError("invalid_client", "Unknown or expired OAuth client.", 401);
  }

  if (grantType === "refresh_token") {
    if (!client.grantTypes.includes("refresh_token")) {
      return oauthError(
        "unauthorized_client",
        "This client is not registered for refresh_token.",
      );
    }

    const refreshToken = String(form.get("refresh_token") ?? "");
    const requestedScope = String(
      form.get("scope") ?? `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`,
    );
    const scopes = Array.from(
      new Set(requestedScope.split(/\s+/).filter((entry) => entry.length > 0)),
    );

    if (
      !refreshToken ||
      !scopes.includes(STAFF_MCP_SCOPE) ||
      scopes.some(
        (entry) => entry !== STAFF_MCP_SCOPE && entry !== STAFF_OFFLINE_SCOPE,
      )
    ) {
      return oauthError(
        "invalid_request",
        "A valid refresh_token and supported scope are required.",
      );
    }

    const verifiedRefresh = verifyStaffRefreshToken(refreshToken, secret);

    if (
      !verifiedRefresh ||
      verifiedRefresh.payload.clientId !== clientId
    ) {
      return oauthError(
        "invalid_grant",
        "Refresh token is invalid, expired, or bound to another client.",
      );
    }

    return json({
      access_token: createStaffAccessToken(
        verifiedRefresh.user,
        clientId,
        secret,
      ),
      refresh_token: createStaffRefreshToken(
        verifiedRefresh.user,
        clientId,
        secret,
      ),
      token_type: "Bearer",
      expires_in: STAFF_ACCESS_TOKEN_TTL_SECONDS,
      scope: `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`,
    });
  }

  if (grantType !== "authorization_code") {
    return oauthError(
      "unsupported_grant_type",
      "Supported grants are authorization_code and refresh_token.",
    );
  }

  const code = String(form.get("code") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const codeVerifier = String(form.get("code_verifier") ?? "");

  if (
    !code ||
    !redirectUri ||
    !PKCE_PATTERN.test(codeVerifier)
  ) {
    return oauthError(
      "invalid_request",
      "code, client_id, redirect_uri, and a valid PKCE code_verifier are required.",
    );
  }

  const authorization = verifyAuthorizationCode(code, secret);

  if (
    !authorization ||
    authorization.clientId !== clientId ||
    authorization.redirectUri !== redirectUri ||
    !client.redirectUris.includes(redirectUri) ||
    !verifyPkceS256(codeVerifier, authorization.codeChallenge)
  ) {
    return oauthError(
      "invalid_grant",
      "Authorization code, client, redirect URI, or PKCE verification failed.",
      400,
    );
  }

  const userRecord = getUserById(authorization.sub);

  if (
    !userRecord ||
    !userRecord.active ||
    userRecord.clinicId !== authorization.clinicId ||
    userRecord.role !== authorization.role ||
    !isPersonnelRole(userRecord.role)
  ) {
    return oauthError("invalid_grant", "Authorized user is no longer valid.");
  }

  const user = toAuthUser(userRecord);
  const response = {
    access_token: createStaffAccessToken(user, clientId, secret),
    token_type: "Bearer",
    expires_in: STAFF_ACCESS_TOKEN_TTL_SECONDS,
    scope: authorization.offlineAccess
      ? `${STAFF_MCP_SCOPE} ${STAFF_OFFLINE_SCOPE}`
      : STAFF_MCP_SCOPE,
    ...(authorization.offlineAccess
      ? { refresh_token: createStaffRefreshToken(user, clientId, secret) }
      : {}),
  };

  return json(response);
}
