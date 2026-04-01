import type { ReactNode } from "react";
import { cn } from "../../utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down"; label?: string };
  icon?: ReactNode;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "slate";
  layout?: "default" | "compact";
  className?: string;
  loading?: boolean;
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
  layout = "default",
  className,
  loading,
}: StatCardProps) {
  const accentStyle = accentStyles[accent];
  const isCompact = layout === "compact";

  return (
    <div
      data-testid="stat-card"
      className={cn("rounded-lg border bg-white p-4", accentStyle.frame, className)}
    >
      <div className={cn(isCompact ? "flex items-center gap-4" : "flex items-start justify-between")}>
        {icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg text-lg",
              isCompact ? "h-10 w-10" : "h-9 w-9",
              accentStyle.icon,
            )}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {isCompact ? (
            <>
              {loading ? (
                <div className="h-7 w-16 animate-pulse rounded bg-gray-100" />
              ) : (
                <p className="m-0 text-[length:var(--text-lg)] font-bold leading-[var(--line-height-tight)] text-gray-900">{value}</p>
              )}
              <p className="m-0 mt-1 text-[length:var(--text-sm)] font-medium leading-[var(--line-height-base)] text-gray-500">{label}</p>
            </>
          ) : (
            <>
              <p className="m-0 mb-1 text-[length:var(--text-xs)] font-medium leading-[var(--line-height-base)] text-gray-500">{label}</p>
              {loading ? (
                <div className="h-7 w-24 animate-pulse rounded bg-gray-100" />
              ) : (
                <p className="m-0 text-[length:var(--text-xl)] font-bold leading-[var(--line-height-tight)] text-gray-900">{value}</p>
              )}
              {trend && !loading && (
                <div className="mt-1 flex items-center gap-1">
                  <span
                    className={cn(
                      "text-[length:var(--text-xs)] font-semibold leading-[var(--line-height-base)]",
                      trend.direction === "up" ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
                  </span>
                  {trend.label && <span className="text-[length:var(--text-xs)] leading-[var(--line-height-base)] text-gray-400">{trend.label}</span>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
