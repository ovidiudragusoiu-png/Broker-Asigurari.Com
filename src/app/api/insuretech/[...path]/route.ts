import { NextRequest, NextResponse } from "next/server";
import { appEnv, insureTechEnv } from "@/lib/config/env";
import { logAudit, getClientInfo } from "@/lib/audit/logger";
import {
  MALPRAXIS_TRACE_HEADER,
  isMalpraxisDebugEnabled,
  logMalpraxisTrace,
  parseTraceBody,
  serializeTraceError,
} from "@/lib/debug/malpraxisTrace";

const API_URL = insureTechEnv.apiUrl;
const USERNAME = insureTechEnv.username;
const PASSWORD = insureTechEnv.password;
const API_KEY = insureTechEnv.apiKey;

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
  /^online\/products\/travel($|\?)/,
  /^online\/products\/house\//,
  /^online\/products\/malpraxis($|\?)/,
  /^online\/offers\/rca\/order(\/v3($|\?)|\/v3\/\d+)/,
  /^online\/offers\/rca\/v3($|\?)/,
  /^online\/offers\/rca\/\d+\/details\/v3($|\?)/,
  /^online\/offers\/order\/v3($|\?|\/)/,
  /^online\/offers\/order($|\?)/,
  /^online\/offers\/payment\/v3($|\?)/,
  /^online\/offers\/payment($|\?)/,
  /^online\/offers\/payment\/check\/v3($|\?)/,
  /^online\/offers\/payment\/loan\/v3($|\?)/,
  /^online\/offers\/payment\/loan($|\?)/,
  /^online\/offers\/paid\/pad(\/v3)?($|\?)/,
  /^online\/offers\/\d+\/document\/v3($|\?)/,
  /^online\/offers\/travel\//,
  /^online\/offers\/house\//,
  /^online\/offers\/malpraxis\//,
  /^online\/client\/documents\//,
  /^online\/policies($|\/)/,
  /^online\/idtypes($|\?)/,
  /^online\/companytypes($|\?)/,
  /^online\/caencodes($|\?)/,
  /^online\/utils\//,
  /^online\/paid\/pad\//,
];

const MAX_BODY_SIZE = 1_048_576;

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
        console.error(`[InsureTech API] ${method} ${pathSegments} -> ${response.status}`, responseBody);
      }

      if (response.ok && (method === "POST" || method === "PUT")) {
        const auditAction = getAuditAction(pathSegments);
        if (auditAction) {
          const { ipAddress, userAgent } = getClientInfo(req);
          let payload: Record<string, unknown> | undefined;
          try {
            payload = requestBody ? JSON.parse(requestBody) : undefined;
          } catch {
            // ignore non-JSON payloads
          }

          const orderHash = url.searchParams.get("orderHash") || undefined;

          let respData: Record<string, unknown> = {};
          try {
            respData = JSON.parse(responseBody);
          } catch {
            // ignore non-JSON payloads
          }

          await logAudit({
            action: auditAction,
            orderHash,
            orderId: (respData.id as number) || (respData.orderId as number) || undefined,
            offerId: (payload?.offerId as number) || (payload?.rcaOfferId as number) || undefined,
            ipAddress,
            userAgent,
            payload,
          });
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
