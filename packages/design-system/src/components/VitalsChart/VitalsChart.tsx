import { cn } from "../../utils";
import { Badge } from "../Badge/Badge";

export interface VitalPoint {
  label: string;
  value: number;
  timestamp?: string;
}

export interface VitalsChartProps {
  title?: string;
  unit?: string;
  series: VitalPoint[];
  minThreshold?: number;
  maxThreshold?: number;
  className?: string;
  "data-testid"?: string;
}

function buildPath(points: VitalPoint[], width: number, height: number) {
  if (points.length === 0) {
    return "";
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - ((point.value - minValue) / range) * height;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}

export function VitalsChart({
  title = "Vitals Trend",
  unit,
  series,
  minThreshold,
  maxThreshold,
  className,
  "data-testid": testId = "vitals-chart",
}: VitalsChartProps) {
  const values = series.map((point) => point.value);
  const current = values[values.length - 1];
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const status =
    current === undefined
      ? "neutral"
      : (minThreshold !== undefined && current < minThreshold) || (maxThreshold !== undefined && current > maxThreshold)
        ? "danger"
        : "success";

  const path = buildPath(series, 100, 48);

  return (
    <section
      data-testid={testId}
      className={cn("rounded-xl border border-gray-200 bg-white p-4 shadow-sm", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {series.length ? `${series.length} readings captured` : "No readings captured"}
          </p>
        </div>
        <Badge variant={status}>
          {current !== undefined ? `${current}${unit ? ` ${unit}` : ""}` : "No data"}
        </Badge>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        {series.length ? (
          <svg
            viewBox="0 0 100 48"
            preserveAspectRatio="none"
            className="h-32 w-full"
            aria-label={`${title} chart`}
          >
            {minThreshold !== undefined && (
              <line
                x1="0"
                x2="100"
                y1={48 - ((minThreshold - min) / ((max - min) || 1)) * 48}
                y2={48 - ((minThreshold - min) / ((max - min) || 1)) * 48}
                stroke="#F59E0B"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
            )}
            {maxThreshold !== undefined && (
              <line
                x1="0"
                x2="100"
                y1={48 - ((maxThreshold - min) / ((max - min) || 1)) * 48}
                y2={48 - ((maxThreshold - min) / ((max - min) || 1)) * 48}
                stroke="#EF4444"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
            )}
            <path d={path} fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {series.map((point, index) => {
              const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
              const y = 48 - ((point.value - min) / ((max - min) || 1)) * 48;
              return <circle key={`${point.label}-${index}`} cx={x} cy={y} r="1.8" fill="#312E81" />;
            })}
          </svg>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-gray-500">
            Add readings to render the chart.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Current" value={current} unit={unit} />
        <Metric label="Min" value={min} unit={unit} />
        <Metric label="Max" value={max} unit={unit} />
      </div>

      {series.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {series.map((point) => (
            <span
              key={`${point.label}-${point.timestamp ?? point.value}`}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
            >
              {point.label}: {point.value}{unit ? ` ${unit}` : ""}{point.timestamp ? ` at ${point.timestamp}` : ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | undefined;
  unit?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
      <p className="m-0 text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">
        {value !== undefined ? `${value}${unit ? ` ${unit}` : ""}` : "--"}
      </p>
    </div>
  );
}
