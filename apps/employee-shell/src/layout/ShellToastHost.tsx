import { useEffect, useState } from "react";
import { SHELL_TOAST_EVENT, type ShellToastPayload } from "@jaldee/auth-context";

type ToastIntent = NonNullable<ShellToastPayload["intent"]>;

interface ToastItem {
  id: string;
  intent: ToastIntent;
  title?: string;
  message: string;
}

const DEFAULT_DURATION_MS = 5000;

const intentStyles: Record<ToastIntent, { border: string; background: string; title: string }> = {
  success: { border: "#16a34a", background: "#f0fdf4", title: "#166534" },
  error: { border: "#dc2626", background: "#fef2f2", title: "#991b1b" },
  warning: { border: "#d97706", background: "#fffbeb", title: "#92400e" },
  info: { border: "#2563eb", background: "#eff6ff", title: "#1d4ed8" },
};

export default function ShellToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = (event as CustomEvent<unknown>).detail;
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
    };

    window.addEventListener(SHELL_TOAST_EVENT, handler as EventListener);
    return () => window.removeEventListener(SHELL_TOAST_EVENT, handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={viewportStyle} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const style = intentStyles[toast.intent];
        return (
          <div
            key={toast.id}
            style={{
              ...toastStyle,
              borderLeft: `4px solid ${style.border}`,
              background: style.background,
            }}
          >
            <div style={toastBodyStyle}>
              {toast.title ? <div style={{ ...toastTitleStyle, color: style.title }}>{toast.title}</div> : null}
              <div style={toastMessageStyle}>{toast.message}</div>
            </div>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              aria-label="Dismiss notification"
              style={dismissButtonStyle}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}

function isShellToastPayload(payload: unknown): payload is ShellToastPayload {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  );
}

const viewportStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "min(360px, calc(100vw - 32px))",
};

const toastStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  borderRadius: 14,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
};

const toastBodyStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const toastTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.3,
};

const toastMessageStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  color: "#334155",
};

const dismissButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
};
