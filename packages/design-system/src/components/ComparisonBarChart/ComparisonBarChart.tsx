import { useState } from "react";
import { cn } from "../../utils";
import { ChartTooltip } from "../ChartTooltip/ChartTooltip";

export interface ComparisonBarChartDatum {
  label: string;
  value: number;
}

export interface ComparisonBarChartLegendItem {
  label: string;
  color: string;
}

export interface ComparisonBarChartProps {
  data: ComparisonBarChartDatum[];
  className?: string;
  legend?: ComparisonBarChartLegendItem[];
  maxValue?: number;
  chartHeight?: number;
  showTooltip?: boolean;
}

export function ComparisonBarChart({
  data,
  className,
  legend = [
    { label: "Sales Cost", color: "#3B82F6" },
    { label: "Item Sold", color: "#34D399" },
  ],
  maxValue,
  chartHeight = 220,
  showTooltip = true,
}: ComparisonBarChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: number;
    color: string;
  } | null>(null);
  const width = 420;
  const height = chartHeight;
  const margin = { top: 14, right: 18, bottom: 48, left: 18 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const resolvedMaxValue = Math.max(maxValue ?? 0, ...data.map((item) => item.value), 1);
  const barWidth = Math.min(26, plotWidth / Math.max(data.length, 1) - 14);
  const gap = data.length > 1 ? (plotWidth - barWidth * data.length) / (data.length - 1) : 0;

  return (
    <div className={cn("relative rounded-xl border border-slate-100 bg-white p-2", className)}>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Comparison bar chart">
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="#CBD5E1" />

        {data.map((item, index) => {
          const barHeight = (item.value / resolvedMaxValue) * plotHeight;
          const x = margin.left + index * (barWidth + gap);
          const y = margin.top + plotHeight - barHeight;
          const hoverWidth = Math.max(barWidth, 22);
          const hoverX = x - (hoverWidth - barWidth) / 2;
          const tooltipY = item.value > 0 ? y : margin.top + plotHeight;

          return (
            <g key={item.label}>
              <rect
                x={hoverX}
                y={margin.top}
                width={hoverWidth}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => {
                  if (!showTooltip) return;
                  setTooltip({
                    x: ((x + barWidth / 2) / width) * 100,
                    y: (tooltipY / height) * 100,
                    label: item.label,
                    series: "Item Sold",
                    value: item.value,
                    color: "#3B82F6",
                  });
                }}
                onMouseLeave={() => {
                  if (!showTooltip) return;
                  setTooltip(null);
                }}
              />
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="#3B82F6" />
              <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" fontSize="12" fill="#334155">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs font-medium text-slate-600">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
