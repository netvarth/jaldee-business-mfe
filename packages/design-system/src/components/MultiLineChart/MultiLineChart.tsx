import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils";

export interface MultiLineChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface MultiLineChartDatum {
  key: string;
  shortLabel?: string;
  fullLabel: string;
  values: Record<string, number>;
}

export interface MultiLineChartProps {
  data: MultiLineChartDatum[];
  series: MultiLineChartSeries[];
  className?: string;
  chartHeight?: number;
  minYMax?: number;
}

export function MultiLineChart({
  data,
  series,
  className,
  chartHeight = 320,
  minYMax = 3,
}: MultiLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number>(
    data.findIndex((point) => Object.values(point.values).some((value) => value > 0))
  );
  const width = 1120;
  const height = chartHeight;
  const margin = { top: 28, right: 34, bottom: 74, left: 34 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(minYMax, ...data.flatMap((point) => Object.values(point.values)));
  const yTicks = Array.from({ length: maxValue + 1 }, (_, index) => index);
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const hoveredPoint = hoveredIndex >= 0 ? data[hoveredIndex] : null;

  const seriesPaths = series.map((line) => {
    const points = data.map((point, index) => {
      const x = margin.left + stepX * index;
      const y = margin.top + plotHeight - ((point.values[line.key] ?? 0) / maxValue) * plotHeight;
      return { x, y };
    });

    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

    return { ...line, path };
  });

  return (
    <div className={cn("relative rounded-2xl border border-slate-200 bg-white px-6 pb-5 pt-4 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-end gap-1 text-slate-500">
        <ChartToolButton label="Zoom in">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" />
            <path d="M7 4.5v5M4.5 7h5M11.5 11.5L15 15" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </ChartToolButton>
        <ChartToolButton label="Zoom out">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" />
            <path d="M4.5 7h5M11.5 11.5L15 15" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </ChartToolButton>
        <ChartToolButton label="Search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.75" stroke="currentColor" />
            <path d="M10.5 10.5L14.5 14.5" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </ChartToolButton>
        <ChartToolButton label="Pan">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.5v13M4.5 5.5v7M11.5 4.5v8M1.5 8h13" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </ChartToolButton>
        <ChartToolButton label="Home">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 7L8 2.5L13.5 7M4.5 6.5V13H11.5V6.5" stroke="currentColor" strokeLinejoin="round" />
          </svg>
        </ChartToolButton>
        <ChartToolButton label="Menu">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4H13.5M2.5 8H13.5M2.5 12H13.5" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </ChartToolButton>
      </div>

      <div className="relative">
        {hoveredPoint ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[206px] rounded-lg border border-slate-200 bg-white shadow-lg"
            style={{
              left: `${((margin.left + stepX * hoveredIndex) / width) * 100}%`,
              top: "18px",
              transform: "translateX(12px)",
            }}
          >
            <div className="border-b border-slate-200 px-4 py-2.5 text-[14px] font-medium text-slate-800">{hoveredPoint.fullLabel}</div>
            <div className="space-y-3 px-4 py-3">
              {series.map((line) => (
                <div key={line.key} className="flex items-center gap-3 text-[13px] text-slate-900">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                  <span className="flex-1">{line.label}:</span>
                  <span className="font-semibold">{hoveredPoint.values[line.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ height }}
          role="img"
          aria-label="Multi-line chart"
        >
          {yTicks.map((tick) => {
            const y = margin.top + plotHeight - (tick / maxValue) * plotHeight;
            return (
              <g key={tick}>
                <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#dbe5f0" />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="13" fill="#0f172a">
                  {tick}
                </text>
              </g>
            );
          })}

          {hoveredIndex >= 0 ? (
            <line
              x1={margin.left + stepX * hoveredIndex}
              x2={margin.left + stepX * hoveredIndex}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#b8c3d1"
              strokeDasharray="3 4"
            />
          ) : null}

          {seriesPaths.map((line) => (
            <path
              key={line.key}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={line.key === "cancelled" ? 4 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {data.map((point, index) => {
            const x = margin.left + stepX * index;
            return (
              <g key={point.key}>
                <rect
                  x={x - stepX / 2}
                  y={margin.top}
                  width={Math.max(stepX, 32)}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(index)}
                />
                <text x={x} y={height - 18} textAnchor="middle" fontSize="14" fill="#0f172a">
                  {point.fullLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-slate-900">
        {series.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: line.color }} />
            <span>{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartToolButton({
  children,
  label,
  className,
  ...props
}: { children: ReactNode; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("flex h-6 w-6 items-center justify-center rounded-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700", className)}
      {...props}
    >
      {children}
    </button>
  );
}
