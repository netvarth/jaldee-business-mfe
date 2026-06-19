import { useCallback } from "react";
import {
  SHELL_TOAST_EVENT,
  useMFEProps,
  type ShellToastPayload,
} from "@jaldee/auth-context";

export type ToastType = "success" | "error" | "warning" | "info";

/**
 * Compatibility hook for existing bookings call sites.
 *
 * Toast rendering is owned by the shell, matching the other MFEs. Bookings
 * emits the shared shell event instead of mounting a separate toast viewport.
 */
export function useToast() {
  const { eventBus } = useMFEProps();

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      options?: Pick<ShellToastPayload, "title" | "durationMs" | "correlationId">,
    ) => {
      eventBus.emit(SHELL_TOAST_EVENT, {
        message,
        intent: type,
        ...options,
      } satisfies ShellToastPayload);
    },
    [eventBus],
  );

  return { showToast };
}
