import express, { type NextFunction, type Request, type Response } from "express";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

initializeApp();

setGlobalOptions({
  region: process.env.FUNCTION_REGION ?? "europe-west1",
  maxInstances: 10,
});

type SupportedBank = "tbc" | "bog";

interface BankConfig {
  clientIdEnvName: "TBC_OAUTH_CLIENT_ID" | "BOG_OAUTH_CLIENT_ID";
  clientSecretEnvName: "TBC_CLIENT_SECRET" | "BOG_CLIENT_SECRET";
  authorizeUrlEnvName: "TBC_OAUTH_AUTHORIZE_URL" | "BOG_OAUTH_AUTHORIZE_URL";
  tokenUrlEnvName: "TBC_OAUTH_TOKEN_URL" | "BOG_OAUTH_TOKEN_URL";
  scopeEnvName: "TBC_OAUTH_SCOPE" | "BOG_OAUTH_SCOPE";
  accountsUrlEnvName: "TBC_ACCOUNTS_URL" | "BOG_ACCOUNTS_URL";
  transactionsUrlEnvName: "TBC_TRANSACTIONS_URL" | "BOG_TRANSACTIONS_URL";
}

type ValidationIssue = {
  field: string;
  message: string;
};

type TokenBundle = {
  bank: SupportedBank;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string | null;
  scope: string | null;
  expiresAt: Timestamp | null;
  refreshTokenExpiresAt: Timestamp | null;
  acquiredAt: Timestamp;
  updatedAt: FieldValue;
};

type BankingTokenDocument = {
  providers: Partial<Record<SupportedBank, TokenBundle>>;
  updatedAt: FieldValue;
};

const BANK_CONFIG: Record<SupportedBank, BankConfig> = {
  tbc: {
    clientIdEnvName: "TBC_OAUTH_CLIENT_ID",
    clientSecretEnvName: "TBC_CLIENT_SECRET",
    authorizeUrlEnvName: "TBC_OAUTH_AUTHORIZE_URL",
    tokenUrlEnvName: "TBC_OAUTH_TOKEN_URL",
    scopeEnvName: "TBC_OAUTH_SCOPE",
    accountsUrlEnvName: "TBC_ACCOUNTS_URL",
    transactionsUrlEnvName: "TBC_TRANSACTIONS_URL",
  },
  bog: {
    clientIdEnvName: "BOG_OAUTH_CLIENT_ID",
    clientSecretEnvName: "BOG_CLIENT_SECRET",
    authorizeUrlEnvName: "BOG_OAUTH_AUTHORIZE_URL",
    tokenUrlEnvName: "BOG_OAUTH_TOKEN_URL",
    scopeEnvName: "BOG_OAUTH_SCOPE",
    accountsUrlEnvName: "BOG_ACCOUNTS_URL",
    transactionsUrlEnvName: "BOG_TRANSACTIONS_URL",
  },
};

const allowedOrigins = new Set(
  (
    process.env.ALLOWED_ORIGINS ??
    [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ].join(",")
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const rateStore = new Map<string, { count: number; resetAt: number }>();
const app = express();
const firestore = getFirestore();
const auth = getAuth();

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(requestIdMiddleware);
app.use(
  express.json({
    limit: "16kb",
    strict: true,
    type: ["application/json", "application/*+json"],
  })
);
app.use(
  express.urlencoded({
    extended: false,
    limit: "16kb",
  })
);
app.use(securityHeaders);
app.use(corsMiddleware());
app.use(rateLimiter({ windowMs: 60_000, max: 60 }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/v1/status", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "shaurmyan-backend-proxy",
    ts: new Date().toISOString(),
  });
});

app.get("/api/banking/connect", rateLimiter({ windowMs: 60_000, max: 12 }), async (req, res, next) => {
  try {
    const user = await requireFirebaseUser(req);
    const bank = parseBank(getFirstQueryValue(req.query.bank as unknown));
    const responseMode = normalizeResponseMode(getFirstQueryValue(req.query.response as unknown));
    const returnTo = sanitizeReturnTo(getFirstQueryValue(req.query.returnTo as unknown));
    const authUrl = buildAuthorizeUrl(bank, user.uid, returnTo);

    if (responseMode === "redirect") {
      res.redirect(302, authUrl);
      return;
    }

    res.status(200).json({
      ok: true,
      bank,
      url: authUrl,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/banking/callback", rateLimiter({ windowMs: 60_000, max: 20 }), async (req, res, next) => {
  try {
    const errorValue = readCallbackParam(req, "error");
    if (errorValue) {
      throw new ApiError(
        400,
        "bank_authorization_failed",
        `Bank authorization failed: ${errorValue}`,
        {
          errorDescription: readCallbackParam(req, "error_description"),
        }
      );
    }

    const code = readCallbackParam(req, "code");
    const state = readCallbackParam(req, "state");

    if (!code) {
      throw new ApiError(400, "missing_code", "The authorization code is missing.");
    }

    const statePayload = verifyState(state);
    const bank = parseBank(statePayload.bank);
    const user = await auth.getUser(statePayload.uid);
    const tokenResponse = await exchangeAuthorizationCode({
      bank,
      code,
      request: req,
      redirectUri: resolveCallbackUrl(req),
    });

    const bundle = mapTokenResponseToBundle(bank, tokenResponse);
    await persistBankTokens(user.uid, bundle);

    const finishUrl = buildFinishUrl(statePayload.returnTo, bank);

    res.status(200).json({
      ok: true,
      bank,
      uid: user.uid,
      stored: true,
      expiresAt: bundle.expiresAt?.toDate().toISOString() ?? null,
      finishUrl,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/banking/accounts", rateLimiter({ windowMs: 60_000, max: 30 }), async (req, res) => {
  try {
    const user = await requireAdminUser(req);
    const providers = await readConnectedBankProviders(user.uid);
    const accounts = await fetchConnectedBankResources(
      providers,
      "accounts",
      req.requestId
    );

    res.status(200).json({
      ok: true,
      accounts,
      providers: Object.keys(providers),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    sendRouteError(error, req, res, "accounts");
  }
});

app.get("/api/banking/transactions", rateLimiter({ windowMs: 60_000, max: 30 }), async (req, res) => {
  try {
    const user = await requireAdminUser(req);
    const providers = await readConnectedBankProviders(user.uid);
    const transactions = await fetchConnectedBankResources(
      providers,
      "transactions",
      req.requestId
    );

    res.status(200).json({
      ok: true,
      transactions,
      providers: Object.keys(providers),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    sendRouteError(error, req, res, "transactions");
  }
});

app.post("/v1/open-banking/:bank/token", rateLimiter({ windowMs: 60_000, max: 12 }), async (req, res, next) => {
  try {
    const bank = parseBank(req.params.bank);
    const body = validateTokenRequestBody(req.body);
    const tokenResponse = await exchangeClientCredentialFlow(bank, body);
    res.status(200).json(tokenResponse);
  } catch (error) {
    next(error);
  }
});

app.use((req, _res, next) => {
  next(new ApiError(404, "not_found", `No route matches ${req.method} ${req.path}`));
});

app.use(errorHandler);

export const api = onRequest(app);

async function requireFirebaseUser(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    throw new ApiError(401, "unauthenticated", "Missing Firebase ID token.");
  }

  try {
    return await auth.verifyIdToken(token);
  } catch {
    throw new ApiError(401, "unauthenticated", "Firebase authentication failed.");
  }
}

async function requireAdminUser(req: Request) {
  const user = await requireFirebaseUser(req);
  const claimRole = typeof user.role === "string" ? user.role : null;
  const hasAdminClaim = user.admin === true || claimRole === "admin";

  if (hasAdminClaim) {
    return user;
  }

  try {
    const profileSnapshot = await firestore.doc(`users/${user.uid}`).get();
    const profile = profileSnapshot.data();
    const hasAdminProfile =
      profile?.role === "admin" ||
      profile?.isAdmin === true;

    if (hasAdminProfile) {
      return user;
    }
  } catch (error) {
    logger.error("Failed to resolve banking admin profile", {
      requestId: req.requestId,
      uid: user.uid,
      error,
    });
    throw new ApiError(
      503,
      "admin_profile_unavailable",
      "The admin profile could not be verified right now."
    );
  }

  throw new ApiError(
    403,
    "admin_required",
    "Administrator access is required for banking data."
  );
}

async function readConnectedBankProviders(
  uid: string
): Promise<Partial<Record<SupportedBank, TokenBundle>>> {
  const snapshot = await firestore.doc(`users/${uid}/banking/tokens`).get();
  if (!snapshot.exists) {
    throw new ApiError(
      409,
      "bank_not_connected",
      "No Open Banking connection was found. Connect TBC or BOG before loading banking data."
    );
  }

  const data = snapshot.data();
  const providersValue = data?.providers;
  if (!isPlainObject(providersValue)) {
    throw new ApiError(
      409,
      "invalid_banking_connection",
      "The stored Open Banking connection is incomplete. Reconnect the bank account."
    );
  }

  const providers: Partial<Record<SupportedBank, TokenBundle>> = {};
  for (const bank of ["tbc", "bog"] as const) {
    const value = providersValue[bank];
    if (!isPlainObject(value)) continue;

    const accessToken = stringOrNull(value.accessToken);
    if (!accessToken) continue;

    const expiresAt = value.expiresAt instanceof Timestamp ? value.expiresAt : null;
    if (expiresAt && expiresAt.toMillis() <= Date.now()) {
      throw new ApiError(
        401,
        "bank_token_expired",
        `${bank.toUpperCase()} access has expired. Reconnect the bank account to continue.`,
        { bank }
      );
    }

    providers[bank] = value as unknown as TokenBundle;
  }

  if (Object.keys(providers).length === 0) {
    throw new ApiError(
      409,
      "bank_not_connected",
      "No usable bank access token was found. Reconnect TBC or BOG."
    );
  }

  return providers;
}

async function fetchConnectedBankResources(
  providers: Partial<Record<SupportedBank, TokenBundle>>,
  resource: "accounts" | "transactions",
  requestId: string
): Promise<Record<string, unknown>[]> {
  const requests = Object.entries(providers).map(async ([bankValue, tokenBundle]) => {
    const bank = parseBank(bankValue);
    if (!tokenBundle?.accessToken) {
      throw new ApiError(
        409,
        "missing_bank_token",
        `${bank.toUpperCase()} does not have a usable access token.`,
        { bank }
      );
    }

    const config = BANK_CONFIG[bank];
    const envName =
      resource === "accounts"
        ? config.accountsUrlEnvName
        : config.transactionsUrlEnvName;
    const endpoint = readRequiredBankingUrl(envName);
    const payload = await fetchBankResource({
      bank,
      endpoint,
      accessToken: tokenBundle.accessToken,
      requestId,
      resource,
    });

    return extractBankResourceItems(payload, resource).map((item) => ({
      ...item,
      bank: item.bank ?? bank.toUpperCase(),
      provider: item.provider ?? bank,
    }));
  });

  const results = await Promise.all(requests);
  return results.flat();
}

async function fetchBankResource(input: {
  bank: SupportedBank;
  endpoint: string;
  accessToken: string;
  requestId: string;
  resource: "accounts" | "transactions";
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(input.endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
        "X-Request-Id": input.requestId,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    const payload = safeJsonParse(text);

    if (!response.ok) {
      throw new ApiError(
        502,
        "bank_api_error",
        `${input.bank.toUpperCase()} ${input.resource} request failed.`,
        {
          bank: input.bank,
          resource: input.resource,
          upstreamStatus: response.status,
          upstreamResponse: sanitizeUpstreamDetails(payload ?? text),
        }
      );
    }

    if (payload === null) {
      throw new ApiError(
        502,
        "invalid_bank_response",
        `${input.bank.toUpperCase()} returned an invalid JSON response for ${input.resource}.`,
        { bank: input.bank, resource: input.resource }
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        504,
        "bank_api_timeout",
        `${input.bank.toUpperCase()} ${input.resource} request timed out.`,
        { bank: input.bank, resource: input.resource }
      );
    }

    throw new ApiError(
      502,
      "bank_api_unreachable",
      `${input.bank.toUpperCase()} ${input.resource} service could not be reached.`,
      {
        bank: input.bank,
        resource: input.resource,
        reason: error instanceof Error ? error.message : "Unknown network error",
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extractBankResourceItems(
  payload: unknown,
  resource: "accounts" | "transactions"
): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isPlainObject);
  }

  if (!isPlainObject(payload)) {
    throw new ApiError(
      502,
      "invalid_bank_response",
      `The bank ${resource} response has an unsupported format.`
    );
  }

  const direct = payload[resource];
  if (Array.isArray(direct)) {
    return direct.filter(isPlainObject);
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    return data.filter(isPlainObject);
  }
  if (isPlainObject(data) && Array.isArray(data[resource])) {
    return data[resource].filter(isPlainObject);
  }

  throw new ApiError(
    502,
    "invalid_bank_response",
    `The bank response did not contain a ${resource} array.`
  );
}

function readRequiredBankingUrl(name: string): string {
  try {
    return readRequiredUrl(name);
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(
        503,
        "banking_configuration_missing",
        `Banking endpoint configuration is missing or invalid: ${name}.`,
        { environmentVariable: name }
      );
    }
    throw error;
  }
}

function sanitizeUpstreamDetails(value: unknown): unknown {
  if (typeof value === "string") {
    return value.slice(0, 500);
  }
  if (!isPlainObject(value)) {
    return null;
  }

  const sanitized = { ...value };
  for (const key of ["access_token", "refresh_token", "token", "authorization"]) {
    if (key in sanitized) sanitized[key] = "[redacted]";
  }
  return sanitized;
}

function sendRouteError(
  error: unknown,
  req: Request,
  res: Response,
  resource: "accounts" | "transactions"
) {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(
          500,
          "banking_request_failed",
          `The banking ${resource} request failed unexpectedly.`,
          { reason: error instanceof Error ? error.message : "Unknown server error" }
        );

  logger.error("Banking data route failure", {
    requestId: req.requestId,
    path: req.path,
    uid: extractBearerToken(req) ? "authenticated-token-present" : "missing-token",
    code: apiError.code,
    statusCode: apiError.statusCode,
    error,
  });

  res.status(apiError.statusCode).json({
    ok: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details ?? null,
      requestId: req.requestId,
    },
  });
}

function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
}

function corsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.header("origin");

    if (!origin) {
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }

      next();
      return;
    }

    if (!allowedOrigins.has(origin)) {
      next(new ApiError(403, "cors_denied", "Origin is not allowed."));
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Request-Id"
    );
    res.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
    res.setHeader("Access-Control-Max-Age", "600");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}

function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = sanitizeRequestId(
    getFirstHeader(req, "x-request-id") ?? `req_${randomBytes(8).toString("hex")}`
  );
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

function rateLimiter(options: { windowMs: number; max: number }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.method}:${req.path}`;
    const now = Date.now();
    const current = rateStore.get(key);

    if (!current || current.resetAt <= now) {
      rateStore.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.max) {
      next(new ApiError(429, "rate_limited", "Too many requests. Please try again later."));
      return;
    }

    current.count += 1;
    rateStore.set(key, current);
    next();
  };
}

function validateTokenRequestBody(body: unknown) {
  if (!isPlainObject(body)) {
    throw validationError([{ field: "body", message: "Request body must be JSON." }]);
  }

  const grantType = readString(body, "grantType", {
    min: 1,
    max: 64,
    allowed: ["client_credentials", "refresh_token"],
  });

  const refreshToken = optionalString(body, "refreshToken", { max: 4096 });

  if (grantType === "refresh_token" && !refreshToken) {
    throw validationError([
      { field: "refreshToken", message: "refreshToken is required for refresh grants." },
    ]);
  }

  return {
    grantType,
    refreshToken,
  };
}

function buildAuthorizeUrl(bank: SupportedBank, uid: string, returnTo?: string): string {
  const config = BANK_CONFIG[bank];
  const authorizeBase = readRequiredUrl(config.authorizeUrlEnvName);
  const clientId = readRequiredEnv(config.clientIdEnvName);
  const callbackUrl = resolveCallbackUrlFromEnv();
  const scope = readOptionalEnv(config.scopeEnvName) ?? "openid offline_access";
  const state = signState({
    uid,
    bank,
    returnTo,
    issuedAt: Date.now(),
  });

  const url = new URL(authorizeBase);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeAuthorizationCode(input: {
  bank: SupportedBank;
  code: string;
  request: Request;
  redirectUri: string;
}) {
  const config = BANK_CONFIG[input.bank];
  const tokenUrl = readRequiredUrl(config.tokenUrlEnvName);
  const clientId = readRequiredEnv(config.clientIdEnvName);
  const clientSecret = readRequiredEnv(config.clientSecretEnvName);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "X-Request-Id": input.request.requestId,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
    }).toString(),
  });

  const text = await response.text();
  const payload = safeJsonParse(text);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "token_exchange_failed",
      "The bank token exchange failed.",
      payload ?? text
    );
  }

  if (!isPlainObject(payload)) {
    throw new ApiError(502, "invalid_token_response", "Bank token response was not valid JSON.");
  }

  return payload as Record<string, unknown>;
}

async function exchangeClientCredentialFlow(
  bank: SupportedBank,
  body: { grantType: string; refreshToken?: string }
) {
  const config = BANK_CONFIG[bank];
  const tokenUrl = readRequiredUrl(config.tokenUrlEnvName);
  const clientId = readRequiredEnv(config.clientIdEnvName);
  const clientSecret = readRequiredEnv(config.clientSecretEnvName);

  const params = new URLSearchParams({
    grant_type: body.grantType,
  });

  if (body.refreshToken) {
    params.set("refresh_token", body.refreshToken);
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  const text = await response.text();
  const payload = safeJsonParse(text);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      "token_exchange_failed",
      "The bank token exchange failed.",
      payload ?? text
    );
  }

  return payload ?? { raw: text };
}

function mapTokenResponseToBundle(bank: SupportedBank, payload: Record<string, unknown>): TokenBundle {
  const now = new Date();
  const expiresIn = numberOrNull(payload.expires_in) ?? 3600;
  const refreshTokenExpiresIn =
    numberOrNull(payload.refresh_expires_in) ?? numberOrNull(payload.refresh_token_expires_in);

  return {
    bank,
    accessToken: stringOrThrow(payload.access_token, "access_token"),
    refreshToken: stringOrNull(payload.refresh_token),
    tokenType: stringOrNull(payload.token_type),
    scope: stringOrNull(payload.scope),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + expiresIn * 1000)),
    refreshTokenExpiresAt:
      refreshTokenExpiresIn === null
        ? null
        : Timestamp.fromDate(new Date(now.getTime() + refreshTokenExpiresIn * 1000)),
    acquiredAt: Timestamp.now(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function persistBankTokens(uid: string, bundle: TokenBundle) {
  const tokensRef = firestore.doc(`users/${uid}/banking/tokens`);
  const existing = (await tokensRef.get()).data() as BankingTokenDocument | undefined;
  const providers = {
    ...(existing?.providers ?? {}),
    [bundle.bank]: bundle,
  } satisfies BankingTokenDocument["providers"];

  await tokensRef.set(
    {
      providers,
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies BankingTokenDocument,
    { merge: true }
  );
}

function resolveCallbackUrl(req: Request): string {
  return readOptionalEnv("BANKING_CALLBACK_URL") ?? `${req.protocol}://${req.get("host")}/api/banking/callback`;
}

function resolveCallbackUrlFromEnv(): string {
  return readRequiredUrl("BANKING_CALLBACK_URL");
}

function buildFinishUrl(returnTo: string | null | undefined, bank: SupportedBank): string | null {
  if (!returnTo) {
    return null;
  }

  try {
    const url = new URL(returnTo);
    url.searchParams.set("bank", bank);
    return url.toString();
  } catch {
    return null;
  }
}

function signState(payload: { uid: string; bank: SupportedBank; issuedAt: number; returnTo?: string }) {
  const secret = readRequiredEnv("BANKING_STATE_SECRET");
  const raw = JSON.stringify(payload);
  const data = Buffer.from(raw).toString("base64url");
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifyState(state: string | undefined) {
  if (!state) {
    throw new ApiError(400, "missing_state", "The authorization state is missing.");
  }

  const secret = readRequiredEnv("BANKING_STATE_SECRET");
  const parts = state.split(".");
  if (parts.length !== 2) {
    throw new ApiError(400, "invalid_state", "The authorization state is invalid.");
  }

  const [data, signature] = parts;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");

  if (!safeCompare(signature, expected)) {
    throw new ApiError(400, "invalid_state", "The authorization state could not be verified.");
  }

  const payload = safeJsonParse(Buffer.from(data, "base64url").toString("utf8"));
  if (!isPlainObject(payload)) {
    throw new ApiError(400, "invalid_state", "The authorization state payload is malformed.");
  }

  const uid = stringOrThrow(payload.uid, "uid");
  const bank = parseBank(stringOrThrow(payload.bank, "bank"));
  const issuedAt = numberOrNull(payload.issuedAt);

  if (!issuedAt) {
    throw new ApiError(400, "invalid_state", "The authorization state timestamp is missing.");
  }

  const maxAgeMs = 10 * 60 * 1000;
  if (Date.now() - issuedAt > maxAgeMs) {
    throw new ApiError(400, "expired_state", "The authorization state has expired.");
  }

  return {
    uid,
    bank,
    issuedAt,
    returnTo: stringOrNull(payload.returnTo),
  };
}

function parseBank(value: string | undefined): SupportedBank {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "tbc" || normalized === "bog") {
    return normalized;
  }

  throw new ApiError(400, "invalid_bank", "Supported banks are TBC and BOG.");
}

function normalizeResponseMode(value: string | undefined): "redirect" | "json" {
  return value === "redirect" ? "redirect" : "json";
}

function sanitizeReturnTo(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("Invalid returnTo protocol.");
    }
    return url.toString();
  } catch {
    throw new ApiError(400, "invalid_return_to", "The returnTo URL is invalid.");
  }
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ApiError(500, "missing_secret", `Missing required environment variable: ${name}`);
  }
  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value : undefined;
}

function readRequiredUrl(name: string): string {
  const value = readRequiredEnv(name);
  try {
    new URL(value);
    return value;
  } catch {
    throw new ApiError(500, "invalid_config", `Environment variable ${name} must be a valid URL.`);
  }
}

function getFirstHeader(req: Request, headerName: string): string | undefined {
  const value = req.header(headerName);
  return value?.trim() || undefined;
}

function extractBearerToken(req: Request): string | undefined {
  const header = getFirstHeader(req, "authorization");
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
}

function getFirstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first.trim() || undefined : undefined;
  }
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function readCallbackParam(req: Request, key: "code" | "state" | "error" | "error_description") {
  const queryValue = getFirstQueryValue(req.query[key] as unknown);
  if (queryValue) {
    return queryValue;
  }

  const bodyValue = readBodyValue(req.body, key);
  return bodyValue ?? undefined;
}

function readBodyValue(
  body: unknown,
  key: "code" | "state" | "error" | "error_description"
): string | undefined {
  if (!isPlainObject(body)) {
    return undefined;
  }

  const value = body[key];
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  body: Record<string, unknown>,
  field: string,
  options: { min: number; max: number; allowed?: string[] }
): string {
  const value = body[field];
  if (typeof value !== "string") {
    throw validationError([{ field, message: "Must be a string." }]);
  }

  const trimmed = value.trim();
  if (trimmed.length < options.min || trimmed.length > options.max) {
    throw validationError([
      {
        field,
        message: `Must be between ${options.min} and ${options.max} characters.`,
      },
    ]);
  }

  if (options.allowed && !options.allowed.includes(trimmed)) {
    throw validationError([
      {
        field,
        message: `Must be one of: ${options.allowed.join(", ")}.`,
      },
    ]);
  }

  return trimmed;
}

function optionalString(
  body: Record<string, unknown>,
  field: string,
  options: { max: number }
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw validationError([{ field, message: "Must be a string." }]);
  }

  const trimmed = value.trim();
  if (trimmed.length > options.max) {
    throw validationError([
      { field, message: `Must be ${options.max} characters or fewer.` },
    ]);
  }

  return trimmed;
}

function validationError(details: ValidationIssue[]): ApiError {
  return new ApiError(400, "validation_error", "Request validation failed.", details);
}

function sanitizeRequestId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || `req_${randomBytes(8).toString("hex")}`;
}

function stringOrThrow(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, "invalid_token_response", `Missing ${field}.`);
  }
  return value.trim();
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value.trim();
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  let apiError: ApiError;

  if (
    error instanceof SyntaxError &&
    "type" in error &&
    (error as { type?: string }).type === "entity.parse.failed"
  ) {
    apiError = new ApiError(400, "invalid_json", "Malformed JSON payload.");
  } else if (error instanceof ApiError) {
    apiError = error;
  } else {
    apiError = new ApiError(500, "internal_error", "Unexpected server error.");
  }

  if (apiError.statusCode >= 500) {
    logger.error("Functions proxy failure", {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      error,
    });
  } else {
    logger.warn("Functions proxy rejected request", {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      code: apiError.code,
    });
  }

  res.status(apiError.statusCode).json({
    ok: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details ?? null,
      requestId: req.requestId,
    },
  });
}

class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
