import { useState } from "react";
import { cn } from "../../utils";
import { ChartTooltip } from "../ChartTooltip/ChartTooltip";

export interface BarChartDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartDatum[];
  yTicks?: number[];
  className?: string;
  "data-testid"?: string;
  formatYTick?: (value: number) => string;
  showTooltip?: boolean;
}

export function BarChart({
  data,
  yTicks,
  className,
  "data-testid": testId = "bar-chart",
  formatYTick = defaultFormatYTick,
  showTooltip = true,
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: number;
    color: string;
  } | null>(null);
  const width = 640;
  const height = 220;
  const margin = { top: 12, right: 16, bottom: 34, left: 56 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const values = data.map((item) => item.value);
  const maxValue = Math.max(...(yTicks?.length ? yTicks : values), 1);
  const ticks = yTicks && yTicks.length ? yTicks : [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];

  const barWidth = data.length > 0 ? Math.min(96, plotWidth / Math.max(data.length, 1) - 18) : 0;
  const gap = data.length > 1 ? (plotWidth - barWidth * data.length) / (data.length - 1) : 0;

  return (
    <div data-testid={testId} className={cn("relative w-full", className)}>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Bar chart">
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / maxValue) * plotHeight;

          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                stroke="var(--color-chart-grid)"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="var(--text-xs)"
                fill="var(--color-chart-label)"
              >
                {formatYTick(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          x2={margin.left}
          y1={margin.top}
          y2={margin.top + plotHeight}
          stroke="var(--color-chart-axis)"
        />
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={margin.top + plotHeight}
          y2={margin.top + plotHeight}
          stroke="var(--color-chart-axis)"
        />

        {data.map((item, index) => {
          const x = data.length === 1 ? margin.left + (plotWidth - barWidth) / 2 : margin.left + index * (barWidth + gap);
          const barHeight = (item.value / maxValue) * plotHeight;
          const y = margin.top + plotHeight - barHeight;
          const labelX = x + barWidth / 2;

          return (
            <g key={`${item.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill="var(--color-chart-1)"
                onMouseEnter={() => {
                  if (!showTooltip) return;
                  setTooltip({
                    x: ((x + barWidth / 2) / width) * 100,
                    y: (y / height) * 100,
                    label: item.label,
                    series: "Value",
                    value: item.value,
                    color: "var(--color-chart-1)",
                  });
                }}
                onMouseLeave={() => {
                  if (!showTooltip) return;
                  setTooltip(null);
                }}
              />
              <text
                x={labelX}
                y={height - 10}
                textAnchor="middle"
                fontSize="var(--text-xs)"
                fill="var(--color-chart-label)"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function defaultFormatYTick(value: number) {
  return value === 0 ? "Rs 0K" : `Rs ${Math.round(value / 1000)}K`;
}
