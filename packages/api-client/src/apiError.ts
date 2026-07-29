export interface ReadableApiError {
  message: string;
  correlationId: string | null;
  code: string | null;
  status: number | null;
}

type ErrorBody = {
  message?: unknown;
  technicalMessage?: unknown;
  details?: unknown;
  error?: unknown;
  detail?: unknown;
  correlationId?: unknown;
  code?: unknown;
  status?: unknown;
};

type HttpErrorLike = {
  message?: unknown;
  response?: { status?: unknown; data?: unknown };
};

const GENERIC_MESSAGES = [
  "unexpected error occurred",
  "internal server error",
  "something went wrong",
  "an error occurred",
  "request failed",
];

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function detailsToMessage(details: unknown): string | null {
  const direct = asString(details);
  if (direct) return direct;
  if (Array.isArray(details)) {
    const messages = details.map(detailsToMessage).filter(Boolean);
    return messages.length ? messages.join("; ") : null;
  }
  if (!details || typeof details !== "object") return null;
  const messages = Object.entries(details as Record<string, unknown>)
    .map(([field, value]) => {
      const message = detailsToMessage(value);
      return message ? `${field}: ${message}` : null;
    })
    .filter(Boolean);
  return messages.length ? messages.join("; ") : null;
}

function fieldErrorsToMessage(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const messages = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      return asString((entry as Record<string, unknown>).message);
    })
    .filter((message): message is string => Boolean(message));
  return messages.length ? messages.join("; ") : null;
}

function findFieldErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const message = findFieldErrorMessage(entry);
      if (message) return message;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const direct = fieldErrorsToMessage(record.fieldErrors);
  if (direct) return direct;
  for (const entry of Object.values(record)) {
    const message = findFieldErrorMessage(entry);
    if (message) return message;
  }
  return null;
}

function technicalValidationMessage(technicalMessage: string | null): string | null {
  if (!technicalMessage) return null;

  // Dependency/Feign errors commonly embed the downstream JSON response inside
  // a larger technical message, e.g. `...: [{"details":{"fieldErrors":...}}]`.
  for (const openingToken of ["[{", "{"]) {
    const start = technicalMessage.indexOf(openingToken);
    if (start < 0) continue;
    const candidate = technicalMessage.slice(start);
    try {
      const message = findFieldErrorMessage(JSON.parse(candidate));
      if (message) return message;
    } catch {
      // The downstream body may be followed by transport text; try a shorter
      // balanced-looking suffix before falling back to the public error.
      const closingToken = openingToken === "[{" ? "}]" : "}";
      const end = candidate.lastIndexOf(closingToken);
      if (end >= 0) {
        try {
          const message = findFieldErrorMessage(
            JSON.parse(candidate.slice(0, end + closingToken.length))
          );
          if (message) return message;
        } catch {
          // Ignore malformed or truncated dependency payloads.
        }
      }
    }
  }

  // Feign can truncate the embedded response before it is valid JSON. The
  // first field-error message is still safe to surface when its standard
  // `field`/`message` shape is present.
  const truncatedFieldError = technicalMessage.match(
    /"field"\s*:\s*"[^"]+"\s*,\s*"message"\s*:\s*"([^"]*)/
  )?.[1];
  if (truncatedFieldError) {
    return truncatedFieldError
      .replace(/\s*\(\d+\s+bytes\)\]?\s*$/, "")
      .trim();
  }
  return null;
}

function isGeneric(message: string | null) {
  if (!message) return true;
  const normalized = message.toLowerCase();
  return GENERIC_MESSAGES.some((candidate) => normalized.includes(candidate));
}

export function getReadableApiError(
  error: unknown,
  fallbackMessage = "Request failed."
): ReadableApiError {
  const httpError = error as HttpErrorLike;
  const responseData = httpError?.response?.data;
  const body =
    responseData && typeof responseData === "object" && !Array.isArray(responseData)
      ? (responseData as ErrorBody)
      : null;

  const publicMessage = asString(body?.message);
  const technicalMessage = asString(body?.technicalMessage);
  const validationMessage = technicalValidationMessage(technicalMessage);
  const message =
    detailsToMessage(body?.details) ??
    validationMessage ??
    (isGeneric(publicMessage) ? technicalMessage : publicMessage) ??
    technicalMessage ??
    asString(body?.error) ??
    asString(body?.detail) ??
    asString(responseData) ??
    asString(httpError?.message) ??
    fallbackMessage;

  const rawStatus = body?.status ?? httpError?.response?.status;
  const status =
    typeof rawStatus === "number"
      ? rawStatus
      : typeof rawStatus === "string" && rawStatus.trim()
        ? Number(rawStatus)
        : null;

  return {
    message,
    correlationId: asString(body?.correlationId),
    code: asString(body?.code),
    status: status != null && Number.isFinite(status) ? status : null,
  };
}

export function enrichApiError(error: unknown): unknown {
  if (!error || typeof error !== "object") return error;
  const readable = getReadableApiError(error);
  const enriched = error as Error & {
    correlationId?: string | null;
    apiCode?: string | null;
    status?: number | null;
  };
  enriched.message = readable.message;
  enriched.correlationId = readable.correlationId;
  enriched.apiCode = readable.code;
  enriched.status = readable.status;
  return enriched;
}
