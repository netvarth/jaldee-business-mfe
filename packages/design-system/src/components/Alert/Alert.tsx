import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface AlertProps {
  variant?:    "success" | "warning" | "danger" | "info" | "neutral";
  title?:      string;
  children:    ReactNode;
  dismissible?: boolean;
  onDismiss?:  () => void;
  className?:  string;
}

const variantMap = {
  success: "bg-green-50  border-green-200  text-green-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  danger:  "bg-red-50    border-red-200    text-red-800",
  info:    "bg-blue-50   border-blue-200   text-blue-800",
  neutral: "bg-gray-50   border-gray-200   text-gray-800",
};

const iconMap = {
  success: "✓",
  warning: "⚠",
  danger:  "✕",
  info:    "ℹ",
  neutral: "•",
};

export function Alert({
  variant = "info", title, children, dismissible, onDismiss, className
}: AlertProps) {
  return (
    <div
      data-testid="alert"
      data-variant={variant}
      role="alert"
      className={cn(
        "flex gap-3 p-3 rounded-lg border text-sm",
        variantMap[variant],
        className
      )}
    >
      <span className="flex-shrink-0 font-bold">{iconMap[variant]}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5 m-0">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer text-inherit"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}