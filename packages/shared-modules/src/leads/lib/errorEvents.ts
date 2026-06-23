import { SHELL_TOAST_EVENT, type EventBus, type ShellToastPayload } from "@jaldee/auth-context";
import { getReadableApiError as parseApiError } from "@jaldee/api-client";

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
  const parsed = parseApiError(error, fallbackMessage);
  return { message: parsed.message, correlationId: parsed.correlationId };
}
