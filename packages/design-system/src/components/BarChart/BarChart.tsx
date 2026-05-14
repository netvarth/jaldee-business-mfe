import { useState } from "react";
import { cn } from "../../utils";
import { ChartTooltip } from "../ChartTooltip/ChartTooltip";

export interface BarChartDatum {
  label: string;
  value: number;
  revenue?: number;
  payout?: number;
  expense?: number;
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
  const margin = { top: 12, right: 16, bottom: 34, left: 68 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const values = data.flatMap((item) => [item.value, item.revenue ?? 0, item.payout ?? 0, item.expense ?? 0]);
  const maxValue = Math.max(...(yTicks?.length ? yTicks : values), 1);
  
  let ticks = yTicks && yTicks.length ? yTicks : [];
  if (!ticks.length) {
    if (maxValue > 1000000) {
      const step = Math.max(Math.ceil(maxValue / 7 / 1000000) * 1000000, 2000000);
      ticks = Array.from({ length: 8 }, (_, i) => i * step);
    } else {
      const step = Math.max(Math.ceil(maxValue / 10 / 50) * 50, 50);
      ticks = Array.from({ length: 11 }, (_, i) => i * step);
    }
  }
  const plotScaleMax = ticks.length > 0 && ticks[ticks.length - 1] > 0 ? ticks[ticks.length - 1] : maxValue;

  const barWidth = data.length > 0 ? Math.min(96, plotWidth / Math.max(data.length, 1) - 18) : 0;
  const gap = data.length > 1 ? (plotWidth - barWidth * data.length) / (data.length - 1) : 0;

  return (
    <div data-testid={testId} className={cn("relative w-full", className)}>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Bar chart">
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / plotScaleMax) * plotHeight;

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
          const labelX = x + barWidth / 2;

          const isGrouped = item.revenue !== undefined || item.payout !== undefined || item.expense !== undefined;

          if (isGrouped) {
            const subBarWidth = Math.max(Math.floor(barWidth / 3) - 2, 4);
            const revVal = item.revenue ?? 0;
            const revHeight = (revVal / plotScaleMax) * plotHeight;
            const revY = margin.top + plotHeight - revHeight;

            const payVal = item.payout ?? 0;
            const payHeight = (payVal / plotScaleMax) * plotHeight;
            const payY = margin.top + plotHeight - payHeight;

            const expVal = item.expense ?? 0;
            const expHeight = (expVal / plotScaleMax) * plotHeight;
            const expY = margin.top + plotHeight - expHeight;

            return (
              <g key={`${item.label}-${index}`}>
                <rect
                  x={x}
                  y={revY}
                  width={subBarWidth}
                  height={revHeight}
                  rx={2}
                  fill="#34D399"
                  onMouseEnter={() => {
                    if (!showTooltip) return;
                    setTooltip({
                      x: ((x + subBarWidth / 2) / width) * 100,
                      y: (revY / height) * 100,
                      label: item.label,
                      series: "Revenue",
                      value: revVal,
                      color: "#34D399",
                    });
                  }}
                  onMouseLeave={() => {
                    if (!showTooltip) return;
                    setTooltip(null);
                  }}
                />
                <rect
                  x={x + subBarWidth + 1}
                  y={payY}
                  width={subBarWidth}
                  height={payHeight}
                  rx={2}
                  fill="#FBBF24"
                  onMouseEnter={() => {
                    if (!showTooltip) return;
                    setTooltip({
                      x: ((x + subBarWidth * 1.5 + 1) / width) * 100,
                      y: (payY / height) * 100,
                      label: item.label,
                      series: "Payout",
                      value: payVal,
                      color: "#FBBF24",
                    });
                  }}
                  onMouseLeave={() => {
                    if (!showTooltip) return;
                    setTooltip(null);
                  }}
                />
                <rect
                  x={x + (subBarWidth + 1) * 2}
                  y={expY}
                  width={subBarWidth}
                  height={expHeight}
                  rx={2}
                  fill="#FB7185"
                  onMouseEnter={() => {
                    if (!showTooltip) return;
                    setTooltip({
                      x: ((x + subBarWidth * 2.5 + 2) / width) * 100,
                      y: (expY / height) * 100,
                      label: item.label,
                      series: "Expense",
                      value: expVal,
                      color: "#FB7185",
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
          }

          const barHeight = (item.value / plotScaleMax) * plotHeight;
          const y = margin.top + plotHeight - barHeight;

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
  return Math.round(value).toLocaleString();
}
