import { NextRequest, NextResponse } from "next/server";
import { appEnv, insureTechEnv } from "@/lib/config/env";
import { logAudit, getClientInfo } from "@/lib/audit/logger";

const API_URL = insureTechEnv.apiUrl;
const USERNAME = insureTechEnv.username;
const PASSWORD = insureTechEnv.password;
const API_KEY = insureTechEnv.apiKey;

// ---- Security: endpoint whitelist ----
const ALLOWED_PATHS: RegExp[] = [
  /^online\/vehicles($|\?)/, // VIN lookup
  /^online\/vehicles\/categories(\/|$)/, // categories, subcategories
  /^online\/vehicles\/makes($|\?)/, // makes
  /^online\/vehicles\/registrationtypes($|\?)/, // registration types
  /^online\/vehicles\/fueltypes($|\?)/, // fuel types
  /^online\/vehicles\/activitytypes($|\?)/, // activity types
  /^online\/address\/utils\//, // counties, cities, postal codes, street types, floors
  /^online\/companies\/utils\//, // company lookup
  /^online\/products\/rca($|\?)/, // RCA products list
  /^online\/products\/travel($|\?)/, // travel products
  /^online\/products\/house\//, // house products
  /^online\/products\/malpraxis($|\?)/, // malpraxis products
  /^online\/offers\/rca\/order(\/v3($|\?)|\/v3\/\d+)/, // create/update RCA order
  /^online\/offers\/rca\/v3($|\?)/, // generate RCA offers
  /^online\/offers\/rca\/\d+\/details\/v3($|\?)/, // offer details
  /^online\/offers\/order\/v3($|\?|\/)/, // order operations (v3)
  /^online\/offers\/order($|\?)/, // order operations (non-v3, PAD)
  /^online\/offers\/payment\/v3($|\?)/, // create payment (v3)
  /^online\/offers\/payment($|\?)/, // create payment (non-v3, PAD)
  /^online\/offers\/payment\/check\/v3($|\?)/, // check payment
  /^online\/offers\/payment\/loan\/v3($|\?)/, // loan payment (v3)
  /^online\/offers\/payment\/loan($|\?)/, // loan payment (non-v3, PAD)
  /^online\/offers\/paid\/pad(\/v3)?($|\?)/, // PAD offer creation (v3 + non-v3)
  /^online\/offers\/\d+\/document\/v3($|\?)/, // offer document
  /^online\/offers\/travel\//, // travel offers
  /^online\/offers\/house\//, // house offers
  /^online\/offers\/malpraxis\//, // malpraxis offers
  /^online\/client\/documents\//, // consent documents
  /^online\/policies($|\/)/, // policy creation & documents
  /^online\/idtypes($|\?)/, // ID types
  /^online\/companytypes($|\?)/, // company types
  /^online\/caencodes($|\?)/, // CAEN codes
  /^online\/utils\//, // building structures, seismic risk, etc.
  /^online\/paid\/pad\//, // PAD
];

const MAX_BODY_SIZE = 1_048_576; // 1 MB

// Sensitive operations that warrant audit logging
const AUDIT_PATHS: { pattern: RegExp; action: string }[] = [
  { pattern: /^online\/offers\/rca\/order\/v3/, action: "ORDER_CREATED" },
  { pattern: /^online\/offers\/order\/v3/, action: "ORDER_CREATED" },
  { pattern: /^online\/offers\/order($|\?)/, action: "ORDER_CREATED" },
  { pattern: /^online\/policies/, action: "POLICY_CREATED" },
  { pattern: /^online\/offers\/payment\/v3/, action: "PAYMENT_INITIATED" },
  { pattern: /^online\/offers\/payment($|\?)/, action: "PAYMENT_INITIATED" },
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

function getAuthHeaders(): Record<string, string> {
  const credentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    Api_key: API_KEY,
  };
}

async function proxyRequest(req: NextRequest, method: string) {
  const url = new URL(req.url);
  // Extract the path after /api/insuretech/
  const pathSegments = url.pathname.replace(/^\/api\/insuretech\//, "");

  // Security: reject paths not in the whitelist
  if (!isPathAllowed(pathSegments)) {
    return NextResponse.json(
      { message: "Forbidden" },
      { status: 403 }
    );
  }

  const targetUrl = `${API_URL}/${pathSegments}${url.search}`;

  // Payment URL endpoints (payment/v3, payment/loan/v3) need Accept: text/plain
  // to return the redirect URL. Everything else MUST use application/json —
  // sending text/plain to payment/check or policies causes 500 errors.
  const isPaymentUrlEndpoint =
    /^online\/offers\/payment\/(v3|loan\/v3|loan)($|\?)/.test(pathSegments) &&
    !/check/.test(pathSegments);
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    Accept: isPaymentUrlEndpoint ? "text/plain" : "application/json",
  };

  const fetchOptions: RequestInit = { method, headers };
  const controller = new AbortController();
  // Policy creation can be slow — allow 2 minutes for those endpoints
  const isSlowEndpoint = /^online\/(policies|offers\/payment)(\/|$)/.test(pathSegments);
  const timeoutMs = isSlowEndpoint
    ? Math.max(appEnv.requestTimeoutMs, 120000)
    : appEnv.requestTimeoutMs;
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeoutMs
  );
  fetchOptions.signal = controller.signal;

  let requestBody = "";
  if (method !== "GET" && method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    requestBody = await req.text();
    // Security: enforce body size limit
    if (requestBody.length > MAX_BODY_SIZE) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { message: "Request body too large" },
        { status: 413 }
      );
    }
    if (requestBody) {
      fetchOptions.body = requestBody;
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }
    // Forward content-disposition for file downloads
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    // Use arrayBuffer for binary responses (PDF, etc.), text for everything else
    const isTextResponse =
      !contentType ||
      contentType.includes("json") ||
      contentType.includes("text") ||
      contentType.includes("xml");

    if (isTextResponse) {
      const responseBody = await response.text();

      // DEBUG: verbose curl-format logging for payment/policy/malpraxis endpoints
      // Persisted to DebugLog table so we never lose them
      const isDebugEndpoint = /^online\/(policies|offers\/(malpraxis|payment))/.test(pathSegments);
      if (isDebugEndpoint) {
        const ts = new Date().toISOString();
        const curlHeaders = Object.entries(headers)
          .filter(([k]) => k !== "Authorization" && k !== "Api_key")
          .map(([k, v]) => `-H "${k}: ${v}"`)
          .join(" \\\n  ");
        const curlBody = requestBody ? `\\\n  -d '${requestBody}'` : "";
        const curlCommand = `curl -X ${method} "${targetUrl}" \\\n  ${curlHeaders} ${curlBody}`;
        console.log(`\n[DEBUG ${ts}] ${curlCommand}\n[DEBUG ${ts}] Response: ${response.status}\n${responseBody}\n`);

        // Persist to database (fire-and-forget)
        import("@/lib/db/prisma").then(({ prisma }) =>
          prisma.debugLog.create({
            data: {
              id: `dbg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              method,
              path: pathSegments,
              requestBody: requestBody || null,
              responseStatus: response.status,
              responseBody: responseBody.substring(0, 4000),
              curlCommand,
            },
          }).catch(() => {})
        );
      }

      if (!response.ok) {
        console.error(`[InsureTech API] ${method} ${pathSegments} → ${response.status}`, responseBody);
      }

      // Audit logging for sensitive POST/PUT operations
      if (response.ok && (method === "POST" || method === "PUT")) {
        const auditAction = getAuditAction(pathSegments);
        if (auditAction) {
          const { ipAddress, userAgent } = getClientInfo(req);
          let payload: Record<string, unknown> | undefined;
          try {
            payload = requestBody ? JSON.parse(requestBody) : undefined;
          } catch { /* not JSON */ }

          // Extract orderHash from URL search params
          const orderHash = url.searchParams.get("orderHash") || undefined;

          // Extract identifiers from response
          let respData: Record<string, unknown> = {};
          try { respData = JSON.parse(responseBody); } catch { /* */ }

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
    } else {
      const responseBody = await response.arrayBuffer();
      return new NextResponse(responseBody, {
        status: response.status,
        headers: responseHeaders,
      });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { message: "InsureTech API timeout" },
        { status: 504 }
      );
    }
    console.error("InsureTech API proxy error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { message: "Failed to connect to InsureTech API" },
      { status: 502 }
    );
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
