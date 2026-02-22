/**
 * Frontend API client - calls our Next.js API proxy routes.
 * NEVER contains any InsureTech credentials.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers: extraHeaders,
    timeoutMs = 15000,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    signal: controller.signal,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`/api/insuretech${path}`, fetchOptions);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "Request timed out");
    }
    throw new ApiError(502, "Network error");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || errorData.detail || errorData.title || "Request failed",
      errorData
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  // For binary responses (PDF, etc.), return blob URL or null
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream")
  ) {
    const blob = await response.blob();
    return URL.createObjectURL(blob) as T;
  }
  return (await response.text()) as T;
}

// ----- Convenience wrappers -----

export const api = {
  get: <T = unknown>(path: string, options?: { timeoutMs?: number }) =>
    request<T>(path, options),
  post: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: { timeoutMs?: number }
  ) => request<T>(path, { method: "POST", body, headers, ...options }),
  put: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: { timeoutMs?: number }
  ) => request<T>(path, { method: "PUT", body, headers, ...options }),
};
