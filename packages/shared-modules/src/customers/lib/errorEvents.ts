import { getReadableApiError as parseApiError } from "@jaldee/api-client";
import { SHELL_TOAST_EVENT, type EventBus, type ShellToastPayload } from "@jaldee/auth-context";

export function emitCustomerErrorToast(
  eventBus: EventBus | undefined,
  error: unknown,
  fallbackMessage: string,
  title = "Customers"
) {
  const { message, correlationId } = getReadableCustomerApiError(error, fallbackMessage);
  const payload: ShellToastPayload = {
    intent: "error",
    title,
    message,
    correlationId,
  };

  eventBus?.emit(SHELL_TOAST_EVENT, payload);
}

export function emitCustomerSuccessToast(
  eventBus: EventBus | undefined,
  message: string,
  title = "Customers"
) {
  const payload: ShellToastPayload = {
    intent: "success",
    title,
    message,
  };

  eventBus?.emit(SHELL_TOAST_EVENT, payload);
}

export function getReadableCustomerApiError(error: unknown, fallbackMessage: string) {
  const parsed = parseApiError(error, fallbackMessage);
  return { message: parsed.message, correlationId: parsed.correlationId };
}
