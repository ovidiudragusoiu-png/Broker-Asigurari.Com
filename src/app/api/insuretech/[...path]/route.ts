import { NextRequest, NextResponse } from "next/server";
import { appEnv, insureTechEnv } from "@/lib/config/env";
import { logAudit, getClientInfo } from "@/lib/audit/logger";
import {
  buildOfferFailureAuditPayload,
  isComparatorOfferPath,
  OFFER_FAILURE_AUDIT_ACTION,
} from "@/lib/audit/offerFailureLog";
import {
  MALPRAXIS_TRACE_HEADER,
  isMalpraxisDebugEnabled,
  logMalpraxisTrace,
  parseTraceBody,
  serializeTraceError,
} from "@/lib/debug/malpraxisTrace";
import { normalizeMalpraxisPostBody } from "@/lib/flows/malpraxisOfferPayload";

const API_URL = insureTechEnv.apiUrl;
const USERNAME = insureTechEnv.username;
const PASSWORD = insureTechEnv.password;
const API_KEY = insureTechEnv.apiKey;

// Explicit allowlist — document PDF endpoints are served via /api/documents/* instead.
const ALLOWED_PATHS: RegExp[] = [
  /^online\/vehicles($|\?)/,
  /^online\/vehicles\/categories(\/|$)/,
  /^online\/vehicles\/makes($|\?)/,
  /^online\/vehicles\/registrationtypes($|\?)/,
  /^online\/vehicles\/fueltypes($|\?)/,
  /^online\/vehicles\/activitytypes($|\?)/,
  /^online\/address\/utils\//,
  /^online\/companies\/utils\//,
  /^online\/products\/rca($|\?)/,
  /^online\/products\/rca\/additionals($|\?)/,
  /^online\/products\/travel($|\?)/,
  /^online\/products\/house\/facultative($|\?)/,
  /^online\/products\/malpraxis($|\?)/,
  /^online\/offers\/rca\/order(\/v3($|\?)|\/v3\/\d+)/,
  /^online\/offers\/rca\/v3($|\?)/,
  /^online\/offers\/rca\/additionals($|\?)/,
  /^online\/offers\/rca\/\d+\/details\/v3($|\?)/,
  /^online\/offers\/rca\/order\/\d+\/referenceTariff\/v3($|\?)/,
  /^online\/offers\/order\/v3($|\?|\/)/,
  /^online\/offers\/order($|\?)/,
  /^online\/offers\/payment\/v3($|\?)/,
  /^online\/offers\/payment($|\?)/,
  /^online\/offers\/payment\/check\/v3($|\?)/,
  /^online\/offers\/payment\/loan\/v3($|\?)/,
  /^online\/offers\/payment\/loan($|\?)/,
  /^online\/offers\/paid\/pad(\/v3)?($|\?)/,
  /^online\/offers\/travel\//,
  /^online\/offers\/house\//,
  /^online\/offers\/malpraxis\//,
  /^online\/offers\/\d+\/details\/v3($|\?)/,
  /^online\/client\/documents\//,
  /^online\/policies\/v3($|\?)/,
  /^online\/policies\/rca\/v3($|\?)/,
  /^online\/idtypes($|\?)/,
  /^online\/companytypes($|\?)/,
  /^online\/caencodes($|\?)/,
  /^online\/utils\/buildingStructures(\/\d+)?($|\?)/,
  /^online\/utils\/constructionTypes(\/\d+)?($|\?)/,
  /^online\/utils\/constructionType($|\?)/,
  /^online\/utils\/seismicRiskTypes($|\?)/,
  /^online\/utils\/insuredSumTypes($|\?)/,
  /^online\/paid\/pad\//,
];

const MAX_BODY_SIZE = 1_048_576;

// ── Best-effort per-IP rate limiting ──
// Throttles anonymous abuse of the upstream (quote/order/payment cost & DoS).
// Limits are generous so legitimate multi-call flows (form lookups, parallel
// RCA quotes) are never affected. Note: in-memory and per-instance on
// serverless, so this is a mitigation, not a hard global guarantee.
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_GENERAL = 600; // any proxied call, per IP per minute
const RATE_LIMIT_MUTATING = 40; // order/payment/policy writes, per IP per minute

const MUTATING_RATE_PATHS: RegExp[] = [
  /^online\/offers\/order(\/v3)?($|\?|\/)/,
  /^online\/offers\/rca\/order\/v3/,
  /^online\/offers\/payment(\/loan)?(\/v3)?($|\?)/,
  /^online\/policies(\/|$)/,
];

type RateBucket = { count: number; resetAt: number };
const generalRateBuckets = new Map<string, RateBucket>();
const mutatingRateBuckets = new Map<string, RateBucket>();

function takeRateToken(
  buckets: Map<string, RateBucket>,
  key: string,
  limit: number,
  now: number
): boolean {
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

function isMutatingRatePath(path: string): boolean {
  return MUTATING_RATE_PATHS.some((re) => re.test(path));
}

const AUDIT_PATHS: { pattern: RegExp; action: string }[] = [
  { pattern: /^online\/offers\/rca\/order\/v3/, action: "ORDER_CREATED" },
  { pattern: /^online\/offers\/order\/v3/, action: "ORDER_CREATED" },
  { pattern: /^online\/offers\/order($|\?)/, action: "ORDER_CREATED" },
  { pattern: /^online\/policies/, action: "POLICY_CREATED" },
  { pattern: /^online\/offers\/payment\/v3/, action: "PAYMENT_INITIATED" },
  { pattern: /^online\/offers\/payment($|\?)/, action: "PAYMENT_INITIATED" },
];

const ACCEPT_TEXT_PLAIN: RegExp[] = [
  /^online\/offers\/payment\/v3($|\?)/,
  /^online\/offers\/payment\/loan\/v3($|\?)/,
  /^online\/offers\/payment($|\?)/,
  /^online\/offers\/payment\/loan($|\?)/,
];

const RCA_BACKEND_DEFAULT_PATHS: RegExp[] = [
  /^online\/offers\/rca\/order\/v3($|\?)/,
  /^online\/offers\/rca\/v3($|\?)/,
  /^online\/policies\/rca\/v3($|\?)/,
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRcaFallbackItpExpiration(now = new Date()): string {
  const bucharestNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" })
  );
  bucharestNow.setDate(bucharestNow.getDate() - 7);
  const year = String(bucharestNow.getFullYear());
  const month = String(bucharestNow.getMonth() + 1).padStart(2, "0");
  const day = String(bucharestNow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00`;
}

function applyMissingItpExpiration(
  target: Record<string, unknown>,
  fallbackItpExpiration: string
) {
  const current = target.itpExpiration;
  if (typeof current !== "string" || !current.trim()) {
    target.itpExpiration = fallbackItpExpiration;
  }
}

function normalizeRcaBackendDefaults(path: string, rawBody: string): string {
  if (!rawBody || !RCA_BACKEND_DEFAULT_PATHS.some((re) => re.test(path))) {
    return rawBody;
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return rawBody;
  }

  if (!isPlainObject(parsedBody)) {
    return rawBody;
  }

  const fallbackItpExpiration = getRcaFallbackItpExpiration();

  const vehicleDetails = parsedBody.vehicleDetails;
  if (isPlainObject(vehicleDetails)) {
    applyMissingItpExpiration(vehicleDetails, fallbackItpExpiration);
  }

  const rcaProductRequests = parsedBody.rcaProductRequests;
  if (Array.isArray(rcaProductRequests)) {
    for (const productRequest of rcaProductRequests) {
      if (!isPlainObject(productRequest)) {
        continue;
      }

      const requestVehicleDetails = productRequest.vehicleDetails;
      if (isPlainObject(requestVehicleDetails)) {
        applyMissingItpExpiration(requestVehicleDetails, fallbackItpExpiration);
      }

      const specificFields = productRequest.specificFields;
      if (isPlainObject(specificFields)) {
        applyMissingItpExpiration(specificFields, fallbackItpExpiration);
      }
    }
  }

  return JSON.stringify(parsedBody);
}

function getAuditAction(path: string): string | null {
  for (const { pattern, action } of AUDIT_PATHS) {
    if (pattern.test(path)) return action;
  }
  return null;
}

function isPathAllowed(path: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(path));
}

function isTraceableMalpraxisPath(path: string): boolean {
  return path.startsWith("online/offers/malpraxis/") || path.startsWith("online/policies");
}

function getAuthHeaders(): Record<string, string> {
  const credentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    Api_key: API_KEY,
  };
}

async function proxyRequest(req: NextRequest, method: string) {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const pathSegments = url.pathname.replace(/^\/api\/insuretech\//, "");
  const traceId = req.headers.get(MALPRAXIS_TRACE_HEADER);
  const shouldTrace = isMalpraxisDebugEnabled() && !!traceId && isTraceableMalpraxisPath(pathSegments);

  if (!isPathAllowed(pathSegments)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Rate limiting (per-IP, best-effort). Applied after the allowlist check so
  // it never affects legitimate, in-flow requests beyond the generous limits.
  const { ipAddress: rateKey } = getClientInfo(req);
  const rateNow = Date.now();
  if (!takeRateToken(generalRateBuckets, rateKey, RATE_LIMIT_GENERAL, rateNow)) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }
  if (method !== "GET" && isMutatingRatePath(pathSegments)) {
    if (!takeRateToken(mutatingRateBuckets, rateKey, RATE_LIMIT_MUTATING, rateNow)) {
      return NextResponse.json({ message: "Too many requests" }, { status: 429 });
    }
  }

  const targetUrl = `${API_URL}/${pathSegments}${url.search}`;
  const acceptHeader = ACCEPT_TEXT_PLAIN.some((re) => re.test(pathSegments))
    ? "text/plain"
    : "application/json";

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    Accept: acceptHeader,
  };

  const fetchOptions: RequestInit = { method, headers };
  const controller = new AbortController();
  const isSlowEndpoint = /^online\/(policies|offers\/payment)(\/|$)/.test(pathSegments);
  const timeoutMs = isSlowEndpoint
    ? Math.max(appEnv.requestTimeoutMs, 120000)
    : appEnv.requestTimeoutMs;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  fetchOptions.signal = controller.signal;

  let requestBody = "";
  if (method !== "GET" && method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    requestBody = await req.text();
    if (requestBody.length > MAX_BODY_SIZE) {
      clearTimeout(timeoutId);
      return NextResponse.json({ message: "Request body too large" }, { status: 413 });
    }
    let normalizedRequestBody = normalizeRcaBackendDefaults(pathSegments, requestBody);
    if (normalizedRequestBody !== requestBody) {
      console.info(`[InsureTech API] Applied RCA ITP fallback for ${pathSegments}`);
    }
    const malpraxisNormalizedBody = normalizeMalpraxisPostBody(
      pathSegments,
      normalizedRequestBody
    );
    if (malpraxisNormalizedBody !== normalizedRequestBody) {
      console.info(`[InsureTech API] Applied Malpraxis payload normalization for ${pathSegments}`);
    }
    requestBody = malpraxisNormalizedBody;
    if (requestBody) {
      fetchOptions.body = requestBody;
    }
  }

  if (shouldTrace) {
    logMalpraxisTrace({
      traceId,
      phase: "proxy_request",
      path: pathSegments,
      payload: {
        method,
        query: Object.fromEntries(url.searchParams.entries()),
        headers,
        body: parseTraceBody(requestBody),
      },
    });
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type") || "";
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    const isTextResponse =
      !contentType ||
      contentType.includes("json") ||
      contentType.includes("text") ||
      contentType.includes("xml");

    if (isTextResponse) {
      const responseBody = await response.text();
      const parsedResponseBody = parseTraceBody(responseBody);
      const durationMs = Date.now() - startedAt;

      if (shouldTrace) {
        logMalpraxisTrace({
          traceId,
          phase: response.ok ? "proxy_response" : "proxy_error",
          path: pathSegments,
          status: response.status,
          durationMs,
          payload: {
            contentType,
            body: parsedResponseBody,
          },
        });
      }

      if (!response.ok) {
        const isParallelRcaQuote =
          method === "POST" &&
          /^online\/offers\/rca\/v3($|\?)/.test(pathSegments);
        if (isParallelRcaQuote) {
          // Expected when some insurers reject a quote; client surfaces per-vendor errors.
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[InsureTech API] RCA quote ${pathSegments} -> ${response.status}`
            );
          }
        } else {
          // Log status only — the upstream response body may contain PII.
          console.error(
            `[InsureTech API] ${method} ${pathSegments} -> ${response.status}`
          );
        }
      }

      if (method === "POST" || method === "PUT") {
        const { ipAddress, userAgent } = getClientInfo(req);
        const orderHash = url.searchParams.get("orderHash") || undefined;

        let reqData: Record<string, unknown> = {};
        let respData: Record<string, unknown> = {};
        try {
          reqData = requestBody ? JSON.parse(requestBody) : {};
        } catch {
          // ignore non-JSON payloads
        }
        try {
          respData =
            typeof parsedResponseBody === "object" &&
            parsedResponseBody !== null &&
            !Array.isArray(parsedResponseBody)
              ? (parsedResponseBody as Record<string, unknown>)
              : {};
        } catch {
          // ignore non-JSON payloads
        }

        if (response.ok) {
          const auditAction = getAuditAction(pathSegments);
          if (auditAction) {
            await logAudit({
              action: auditAction,
              orderHash,
              orderId: (respData.id as number) || (respData.orderId as number) || undefined,
              offerId:
                (reqData.offerId as number) || (reqData.rcaOfferId as number) || undefined,
              ipAddress,
              userAgent,
              payload: reqData,
            });
          }
        }

        if (
          method === "POST" &&
          isComparatorOfferPath(pathSegments) &&
          contentType.includes("json")
        ) {
          const failurePayload = buildOfferFailureAuditPayload({
            path: pathSegments,
            httpStatus: response.status,
            requestBody: reqData,
            responseBody: respData,
          });

          if (failurePayload) {
            await logAudit({
              action: OFFER_FAILURE_AUDIT_ACTION,
              productType: String(failurePayload.productType || ""),
              orderHash,
              orderId: (reqData.orderId as number) || (respData.orderId as number) || undefined,
              ipAddress,
              userAgent,
              payload: failurePayload,
            });
          }
        }
      }

      return new NextResponse(responseBody, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    const responseBody = await response.arrayBuffer();
    if (shouldTrace) {
      logMalpraxisTrace({
        traceId,
        phase: response.ok ? "proxy_response" : "proxy_error",
        path: pathSegments,
        status: response.status,
        durationMs: Date.now() - startedAt,
        payload: {
          contentType,
          byteLength: responseBody.byteLength,
          body: "[binary response omitted]",
        },
      });
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (shouldTrace) {
      logMalpraxisTrace({
        traceId,
        phase: "proxy_exception",
        path: pathSegments,
        durationMs: Date.now() - startedAt,
        payload: serializeTraceError(error),
      });
    }

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ message: "InsureTech API timeout" }, { status: 504 });
    }

    console.error("InsureTech API proxy error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ message: "Failed to connect to InsureTech API" }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxyRequest(req, "POST");
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req, "PUT");
}
