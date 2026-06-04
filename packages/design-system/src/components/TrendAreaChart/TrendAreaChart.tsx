import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils";

const DEFAULT_LINE_PATH =
  "M 0 90 C 95 112, 170 128, 260 154 C 345 180, 430 184, 520 154 C 610 124, 680 164, 745 178 C 825 194, 910 160, 1000 68";

const DEFAULT_POINT_COORDINATES = [
  { x: 0, y: 90 },
  { x: 170, y: 128 },
  { x: 345, y: 180 },
  { x: 520, y: 154 },
  { x: 680, y: 164 },
  { x: 825, y: 194 },
  { x: 1000, y: 68 },
];

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 260;
const PLOT_TOP = 30;
const PLOT_BOTTOM = 214;

export interface TrendAreaChartDatum {
  label: string;
  value: number | string;
}

export interface TrendAreaChartProps {
  eyebrow?: string;
  title: string;
  statusLabel?: string;
  data?: TrendAreaChartDatum[];
  className?: string;
  chartClassName?: string;
  decorativeIcon?: ReactNode;
  gradientId?: string;
  linePath?: string;
  areaPath?: string;
  strokeColor?: string;
  tooltipSeriesLabel?: string;
  showTooltip?: boolean;
  showPoints?: boolean;
}

export function TrendAreaChart({
  eyebrow,
  title,
  statusLabel,
  data,
  className,
  chartClassName,
  decorativeIcon,
  gradientId = "trend-area-chart-fill",
  linePath = DEFAULT_LINE_PATH,
  areaPath,
  strokeColor = "#7687ff",
  tooltipSeriesLabel = "Leads",
  showTooltip = true,
  showPoints = true,
}: TrendAreaChartProps) {
  const [activePoint, setActivePoint] = useState<{
    label: string;
    value: number | string;
    x: number;
    y: number;
  } | null>(null);
  const numericData = data
    ?.map((item) => ({ ...item, numericValue: typeof item.value === "number" ? item.value : Number(item.value) }))
    .filter((item) => Number.isFinite(item.numericValue));
  const useDataDrivenPath = !areaPath && linePath === DEFAULT_LINE_PATH && numericData && numericData.length > 1;
  const pointCoordinates = useDataDrivenPath ? buildDataDrivenPoints(numericData) : DEFAULT_POINT_COORDINATES;
  const resolvedLinePath = useDataDrivenPath ? buildSmoothPath(pointCoordinates) : linePath;
  const resolvedAreaPath = areaPath ?? `${resolvedLinePath} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;
  const chartPoints = pointCoordinates.map((point, index) => {
    const datum = data?.[index];
    return {
      ...point,
      label: datum?.label ?? `Point ${index + 1}`,
      value: datum?.value ?? "",
    };
  });

  return (
    <div
      className={cn(
        "relative min-h-[430px] overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm",
        className,
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="text-2xl font-semibold uppercase leading-tight text-slate-950">{title}</h3>
        </div>
        {statusLabel ? (
          <span className="rounded-full border border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {statusLabel}
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none absolute right-10 top-8 text-slate-900/5">
        {decorativeIcon ?? <DefaultDecorativeIcon />}
      </div>

      <div className={cn("absolute inset-x-8 bottom-10 top-32", chartClassName)}>
        {activePoint ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[94px] rounded-2xl border border-slate-100 bg-white px-3.5 py-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
            style={{
              left: `${(activePoint.x / CHART_WIDTH) * 100}%`,
              top: `${(activePoint.y / CHART_HEIGHT) * 100}%`,
              transform: "translate(64px, 28px)",
            }}
          >
            <p className="m-0 text-xs font-semibold leading-none text-slate-400">{activePoint.label}</p>
            <p className="m-0 mt-2 text-xs font-semibold uppercase leading-none text-indigo-400">
              {tooltipSeriesLabel}: {activePoint.value}
            </p>
          </div>
        ) : null}
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
              <stop offset="58%" stopColor={strokeColor} stopOpacity="0.055" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={resolvedAreaPath} fill={`url(#${gradientId})`} />
          <path
            d={resolvedLinePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {activePoint ? (
            <g>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1="0"
                y2={CHART_HEIGHT}
                stroke="#cbd5e1"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill={strokeColor}
                stroke="#ffffff"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null}
          {showPoints
            ? chartPoints.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    fill="transparent"
                    onMouseEnter={() => {
                      if (!showTooltip) return;
                      setActivePoint({
                        label: point.label,
                        value: point.value,
                        x: point.x,
                        y: point.y,
                      });
                    }}
                    onMouseLeave={() => {
                      if (!showTooltip) return;
                      setActivePoint(null);
                    }}
                  />
                </g>
              ))
            : null}
        </svg>
      </div>
    </div>
  );
}

function buildDataDrivenPoints(data: Array<TrendAreaChartDatum & { numericValue: number }>) {
  const values = data.map((item) => item.numericValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;

  return data.map((item, index) => {
    const x = data.length === 1 ? CHART_WIDTH / 2 : (index / (data.length - 1)) * CHART_WIDTH;
    const y = range === 0 ? PLOT_TOP + plotHeight / 2 : PLOT_TOP + ((maxValue - item.numericValue) / range) * plotHeight;

    return { x, y };
  });
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const next = points[index + 1] ?? point;
    const controlDistance = (point.x - previous.x) * 0.45;
    const previousSlope = index > 1 ? point.y - points[index - 2].y : point.y - previous.y;
    const nextSlope = next.y - previous.y;
    const control1Y = previous.y + previousSlope * 0.18;
    const control2Y = point.y - nextSlope * 0.18;

    return `${path} C ${previous.x + controlDistance} ${control1Y}, ${point.x - controlDistance} ${control2Y}, ${point.x} ${point.y}`;
  }, "");
}

function DefaultDecorativeIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-36 w-36" aria-hidden="true">
      <path
        d="M60 12 106 36 60 60 14 36 60 12Z"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <path
        d="M14 62 60 86 106 62"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 86 60 110 106 86"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
