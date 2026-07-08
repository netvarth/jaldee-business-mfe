import { useCallback, useEffect, useRef } from "react";
import { SHELL_TOAST_EVENT, useMFEProps, type ShellToastPayload } from "@jaldee/auth-context";

type ToastIntent = NonNullable<ShellToastPayload["intent"]>;

export function useShellFeedback(scope: string) {
  const { eventBus, telemetry } = useMFEProps();

  const toast = useCallback(
    (intent: ToastIntent, title: string, message: string) => {
      eventBus.emit(SHELL_TOAST_EVENT, { intent, title, message });
    },
    [eventBus]
  );

  const track = useCallback(
    (name: string, props?: Record<string, unknown>) => {
      telemetry.trackEvent(`${scope}.${name}`, props);
    },
    [scope, telemetry]
  );

  const capture = useCallback(
    (error: unknown, context?: Record<string, unknown>) => {
      telemetry.captureError(error instanceof Error ? error : new Error(String(error)), {
        scope,
        ...context,
      });
    },
    [scope, telemetry]
  );

  return { toast, track, capture };
}

export function useShellErrorToast(scope: string, title: string, error?: string | null) {
  const { toast, capture } = useShellFeedback(scope);
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (!error || lastError.current === error) return;
    lastError.current = error;
    toast("error", title, error);
    capture(new Error(error));
  }, [capture, error, title, toast]);
}
