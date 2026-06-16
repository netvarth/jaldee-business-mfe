import { SHELL_TOAST_EVENT, type EventBus, type ShellToastPayload } from "@jaldee/auth-context";

interface ApiErrorBody {
  message?: unknown;
  technicalMessage?: unknown;
  correlationId?: unknown;
  code?: unknown;
}

interface HttpErrorLike {
  response?: {
    data?: unknown;
  };
  message?: unknown;
}

export function emitLeadErrorToast(
  eventBus: EventBus | undefined,
  error: unknown,
  fallbackMessage: string
) {
  const { message, correlationId } = getReadableApiError(error, fallbackMessage);
  const payload: ShellToastPayload = {
    intent: "error",
    title: "Leads",
    message,
    correlationId,
  };

  eventBus?.emit(SHELL_TOAST_EVENT, payload);
}

export function emitLeadSuccessToast(
  eventBus: EventBus | undefined,
  message: string,
  title = "Leads"
) {
  const payload: ShellToastPayload = {
    intent: "success",
    title,
    message,
  };

  eventBus?.emit(SHELL_TOAST_EVENT, payload);
}

export function getReadableApiError(error: unknown, fallbackMessage: string) {
  const apiBody = getApiErrorBody(error);
  const message = firstString(apiBody?.message, apiBody?.technicalMessage, (error as HttpErrorLike)?.message) ?? fallbackMessage;
  const correlationId = firstString(apiBody?.correlationId) ?? null;

  return { message, correlationId };
}

function getApiErrorBody(error: unknown): ApiErrorBody | null {
  const responseData = (error as HttpErrorLike)?.response?.data;
  if (!responseData || typeof responseData !== "object") return null;
  return responseData as ApiErrorBody;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
