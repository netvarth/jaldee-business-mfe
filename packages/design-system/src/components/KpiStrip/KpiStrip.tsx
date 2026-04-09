import type { ReactNode } from "react";

export interface KpiStripItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "slate";
  loading?: boolean;
}

export interface KpiStripProps {
  items: KpiStripItem[];
  className?: string;
}

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <div className={`flex flex-row gap-6 w-full ${className ?? ""}`.trim()}>
      {items.map((item, idx) => (
        <div
          key={item.label + idx}
          className="flex-1 min-w-[120px] max-w-[220px] rounded-lg border border-slate-200 bg-white p-4 flex flex-col items-center justify-center shadow-sm"
        >
          {item.icon && (
            <span className="mb-2 text-xl">{item.icon}</span>
          )}
          <div className="text-[length:var(--text-xl)] font-bold text-gray-900">
            {item.loading ? <span className="animate-pulse">-</span> : item.value}
          </div>
          <div className="mt-1 text-[length:var(--text-xs)] font-medium text-gray-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
