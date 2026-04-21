import { useState } from "react";
import { cn } from "../../utils";
import { ChartTooltip } from "../ChartTooltip/ChartTooltip";

export interface PieChartDatum {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartDatum[];
  className?: string;
  "data-testid"?: string;
  labelMaxLength?: number;
  variant?: "pie" | "donut";
  showLabels?: boolean;
  holeInset?: number;
  chartSize?: number;
  showTooltip?: boolean;
}

const defaultColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-1)",
];

export function PieChart({
  data,
  className,
  "data-testid": testId = "pie-chart",
  labelMaxLength = 12,
  variant = "pie",
  showLabels = true,
  holeInset = 24,
  chartSize = 144,
  showTooltip = false,
}: PieChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: number;
    color: string;
  } | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;

  const segments = data.map((item, index) => {
    const start = cursor;
    cursor += (item.value / total) * 360;
    const midAngle = start + ((item.value / total) * 360) / 2 - 90;
    return {
      ...item,
      color: item.color ?? defaultColors[index % defaultColors.length],
      gradient: `${item.color ?? defaultColors[index % defaultColors.length]} ${start}deg ${cursor}deg`,
      midAngle,
    };
  });

  const backgroundImage = segments.length
    ? `conic-gradient(${segments.map((segment) => segment.gradient).join(", ")})`
    : "conic-gradient(#e5e7eb 0 360deg)";
  const tooltipTargetSize = Math.max(40, Math.min(64, chartSize * 0.26));

  return (
    <div
      data-testid={testId}
      className={cn(
        "relative flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4",
        className,
      )}
    >
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
      <div
        className="relative rounded-full border-2 border-white shadow-sm"
        style={{ backgroundImage, width: chartSize, height: chartSize }}
      >
        {variant === "donut" ? (
          <div
            className="rounded-full bg-white"
            style={{
              position: "absolute",
              inset: holeInset,
            }}
          />
        ) : null}
      </div>

      {showTooltip
        ? segments.map((segment) => {
          const radiusPercent = variant === "donut" ? 24 : 28;
          const left = 50 + Math.cos((segment.midAngle * Math.PI) / 180) * radiusPercent;
          const top = 50 + Math.sin((segment.midAngle * Math.PI) / 180) * radiusPercent;

          return (
            <button
              key={`${segment.label}-tooltip-target`}
              type="button"
              aria-label={`${segment.label}: ${segment.value}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-0 bg-transparent p-0"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: tooltipTargetSize,
                height: tooltipTargetSize,
              }}
              onMouseEnter={() =>
                setTooltip({
                  x: left,
                  y: top,
                  label: segment.label,
                  series: "Value",
                  value: segment.value,
                  color: segment.color,
                })
              }
              onMouseLeave={() => setTooltip(null)}
              onFocus={() =>
                setTooltip({
                  x: left,
                  y: top,
                  label: segment.label,
                  series: "Value",
                  value: segment.value,
                  color: segment.color,
                })
              }
              onBlur={() => setTooltip(null)}
            />
          );
        })
        : null}

      {showLabels
        ? segments.map((item) => (
        <div
          key={item.label}
          className="absolute max-w-[110px] text-xs font-medium"
          style={{
            color: item.color,
            left: `${50 + Math.cos((item.midAngle * Math.PI) / 180) * 34}%`,
            top: `${50 + Math.sin((item.midAngle * Math.PI) / 180) * 34}%`,
            transform: "translate(-50%, -50%)",
            textAlign: item.midAngle > 90 || item.midAngle < -90 ? "right" : "left",
          }}
          title={`${item.label}: ${item.value}`}
        >
          {truncateChartLabel(item.label, labelMaxLength)}: {item.value}
        </div>
        ))
        : null}
    </div>
  );
}

function truncateChartLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
