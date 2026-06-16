import { useEffect, useState } from "react";
import { ToastViewport, type ToastItem } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, type ShellToastPayload } from "@jaldee/auth-context";
import { eventBus } from "../eventBus/eventBus";

const DEFAULT_DURATION_MS = 5000;

export default function ShellToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return eventBus.on(SHELL_TOAST_EVENT, (payload) => {
      if (!isShellToastPayload(payload)) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const durationMs = payload.durationMs ?? DEFAULT_DURATION_MS;
      setToasts((current) => [
        ...current,
        {
          id,
          intent: payload.intent ?? "info",
          title: payload.title,
          message: payload.message,
        },
      ]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, durationMs);
      }
    });
  }, []);

  return <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />;
}

function isShellToastPayload(payload: unknown): payload is ShellToastPayload {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  );
}
