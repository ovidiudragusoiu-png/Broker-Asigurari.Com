import { NextRequest, NextResponse } from "next/server";
import { appEnv, insureTechEnv } from "@/lib/config/env";

const API_URL = insureTechEnv.apiUrl;
const USERNAME = insureTechEnv.username;
const PASSWORD = insureTechEnv.password;
const API_KEY = insureTechEnv.apiKey;

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
  const targetUrl = `${API_URL}/${pathSegments}${url.search}`;

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    Accept: req.headers.get("accept") || "application/json",
  };

  const fetchOptions: RequestInit = { method, headers };
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    appEnv.requestTimeoutMs
  );
  fetchOptions.signal = controller.signal;

  if (method !== "GET" && method !== "HEAD") {
    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    const body = await req.text();
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
    console.error("InsureTech API proxy error:", error);
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

export async function DELETE(req: NextRequest) {
  return proxyRequest(req, "DELETE");
}
