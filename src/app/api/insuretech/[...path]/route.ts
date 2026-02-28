import { NextRequest, NextResponse } from "next/server";
import { appEnv, insureTechEnv } from "@/lib/config/env";

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

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    Accept: req.headers.get("accept") || "application/json",
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

  if (method !== "GET" && method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    const body = await req.text();
    // Security: enforce body size limit
    if (body.length > MAX_BODY_SIZE) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { message: "Request body too large" },
        { status: 413 }
      );
    }
    if (body) {
      fetchOptions.body = body;
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
      if (!response.ok) {
        console.error(`[InsureTech API] ${method} ${pathSegments} → ${response.status}`, responseBody);
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
