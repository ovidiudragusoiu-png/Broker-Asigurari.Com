const EXACT_SENSITIVE_KEYS = new Set([
  "authorization",
  "apikey",
  "api_key",
  "token",
  "password",
  "secret",
  "clientsecret",
  "accesstoken",
  "refreshtoken",
  "credentials",
  "cif",
  "cnp",
  "orderhash",
]);

const PARTIAL_SENSITIVE_KEY_PATTERNS = [
  /email/i,
  /phone/i,
];

/**
 * Non-PII technical/structural keys whose string values are safe to log in
 * cleartext. Everything else is masked by default (deny-by-default), so newly
 * added PII fields (names, addresses, health categories, etc.) never leak even
 * if they are not in the sensitive-key list.
 */
const SAFE_STRING_KEYS = new Set([
  "method",
  "phase",
  "path",
  "contenttype",
  "status",
  "durationms",
  "timestamp",
  "traceid",
  "currency",
  "productcode",
  "vendorproductcode",
  "code",
  "policystartdate",
  "policyenddate",
  "startdate",
  "enddate",
  "duedate",
  "createdat",
  "updatedat",
]);

export const MALPRAXIS_TRACE_HEADER = "X-Debug-Trace-Id";

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  return (
    EXACT_SENSITIVE_KEYS.has(key.toLowerCase()) ||
    EXACT_SENSITIVE_KEYS.has(normalizedKey) ||
    PARTIAL_SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
  );
}

function isSafeStringKey(key: string): boolean {
  return SAFE_STRING_KEYS.has(normalizeKey(key));
}

function maskPrimitive(value: string): string {
  if (!value) return value;
  if (value.length <= 4) return "[REDACTED]";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function maskValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    if (value instanceof Date) {
      return value.toISOString();
    }

    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        if (typeof nestedValue === "string") {
          result[key] = maskPrimitive(nestedValue);
        } else {
          result[key] = "[REDACTED]";
        }
      } else if (typeof nestedValue === "string") {
        // Deny-by-default: only known-safe technical keys are shown in clear.
        result[key] = isSafeStringKey(key)
          ? nestedValue
          : maskPrimitive(nestedValue);
      } else {
        result[key] = maskValue(nestedValue, seen);
      }
    }
    return result;
  }

  return value;
}

export function maskMalpraxisTracePayload(payload: unknown): unknown {
  return maskValue(payload);
}

export function isMalpraxisDebugEnabled(enabledOverride?: boolean): boolean {
  if (typeof enabledOverride === "boolean") {
    return enabledOverride;
  }
  // Never emit verbose PII traces in production, regardless of env flag.
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.MALPRAXIS_DEBUG === "1";
}

export function createMalpraxisTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `malpraxis-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function parseTraceBody(body: string): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function serializeTraceError(error: unknown): unknown {
  if (error instanceof Error) {
    return maskMalpraxisTracePayload({
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(typeof (error as { status?: unknown }).status !== "undefined"
        ? { status: (error as { status?: unknown }).status }
        : {}),
      ...(typeof (error as { data?: unknown }).data !== "undefined"
        ? { data: (error as { data?: unknown }).data }
        : {}),
    });
  }

  return maskMalpraxisTracePayload(error);
}

export function logMalpraxisTrace(
  event: {
    traceId?: string | null;
    phase: string;
    path?: string;
    status?: number;
    durationMs?: number;
    payload?: unknown;
  },
  enabledOverride?: boolean
) {
  if (!isMalpraxisDebugEnabled(enabledOverride)) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId: event.traceId || null,
    phase: event.phase,
    ...(event.path ? { path: event.path } : {}),
    ...(typeof event.status === "number" ? { status: event.status } : {}),
    ...(typeof event.durationMs === "number" ? { durationMs: event.durationMs } : {}),
    ...(typeof event.payload !== "undefined"
      ? { payload: maskMalpraxisTracePayload(event.payload) }
      : {}),
  };

  console.log("[MalpraxisTrace]", JSON.stringify(logEntry));
}



