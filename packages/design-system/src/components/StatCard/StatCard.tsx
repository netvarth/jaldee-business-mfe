import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface StatCardProps {
  label:      string;
  value:      string | number;
  trend?:     { value: number; direction: "up" | "down"; label?: string };
  icon?:      ReactNode;
  className?: string;
  loading?:   boolean;
}

export function StatCard({ label, value, trend, icon, className, loading }: StatCardProps) {
  return (
    <div
      data-testid="stat-card"
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-4",
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
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}