import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface StatCardProps {
  label:      string;
  value:      string | number;
  trend?:     { value: number; direction: "up" | "down"; label?: string };
  icon?:      ReactNode;
  accent?:    "indigo" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
  loading?:   boolean;
}

const accentStyles = {
  indigo: {
    frame: "border-indigo-200",
    icon: "bg-indigo-50 text-indigo-600",
  },
  emerald: {
    frame: "border-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
  },
  amber: {
    frame: "border-amber-200",
    icon: "bg-amber-50 text-amber-600",
  },
  rose: {
    frame: "border-rose-200",
    icon: "bg-rose-50 text-rose-600",
  },
  slate: {
    frame: "border-slate-300",
    icon: "bg-slate-100 text-slate-700",
  },
} as const;

export function StatCard({
  label,
  value,
  trend,
  icon,
  accent = "indigo",
  className,
  loading,
}: StatCardProps) {
  const accentStyle = accentStyles[accent];

  return (
    <div
      data-testid="stat-card"
      className={cn(
        "bg-white rounded-lg border p-4",
        accentStyle.frame,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium m-0 mb-1">{label}</p>
          {loading ? (
            <div className="h-7 w-24 rounded bg-gray-100 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 m-0">{value}</p>
          )}
          {trend && !loading && (
            <div className="flex items-center gap-1 mt-1">
              <span className={cn(
                "text-xs font-semibold",
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              )}>
                {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg",
            accentStyle.icon
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
