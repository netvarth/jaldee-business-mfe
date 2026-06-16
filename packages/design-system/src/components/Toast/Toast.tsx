import { cn } from "../../utils";

export type ToastIntent = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  intent?: ToastIntent;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  metadata?: string;
}

export interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
}

const intentClassMap: Record<ToastIntent, string> = {
  success: "border-emerald-200 bg-white text-slate-900",
  error: "border-rose-200 bg-white text-slate-900",
  warning: "border-amber-200 bg-white text-slate-900",
  info: "border-blue-200 bg-white text-slate-900",
};

const accentClassMap: Record<ToastIntent, string> = {
  success: "bg-emerald-500",
  error: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
};

const iconClassMap: Record<ToastIntent, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  error: "bg-rose-50 text-rose-700 ring-rose-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
};

const iconMap: Record<ToastIntent, string> = {
  success: "OK",
  error: "!",
  warning: "!",
  info: "i",
};

export function ToastViewport({ toasts, onDismiss, className }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="toast-viewport"
      className={cn(
        "fixed right-4 top-4 z-[1000] flex w-[min(420px,calc(100vw-32px))] flex-col gap-3",
        className
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const intent = toast.intent ?? "info";

  return (
    <div
      data-testid="toast"
      data-intent={intent}
      role={intent === "error" ? "alert" : "status"}
      className={cn(
        "relative overflow-hidden rounded-lg border text-sm shadow-xl shadow-slate-900/15",
        "backdrop-blur-sm transition-all",
        intentClassMap[intent]
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", accentClassMap[intent])} />
      <div className="flex gap-3 px-4 py-3 pl-5">
        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1", iconClassMap[intent])}>
          {iconMap[intent]}
        </span>
        <div className="min-w-0 flex-1 pr-1">
          {toast.title ? <p className="m-0 text-sm font-semibold leading-5 text-slate-950">{toast.title}</p> : null}
          <p className="m-0 text-sm font-medium leading-5 text-slate-700">{toast.message}</p>
          {toast.metadata ? <p className="m-0 mt-1 text-xs font-medium text-slate-500">{toast.metadata}</p> : null}
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              className="mt-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={toast.onAction}
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-50 text-xl font-semibold leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          x
        </button>
      </div>
    </div>
  );
}
