import { cn } from "../../utils";

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
}: PieChartProps) {
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

  return (
    <div
      data-testid={testId}
      className={cn(
        "relative flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4",
        className,
      )}
    >
      <div
        className="h-36 w-36 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundImage }}
      />

      {segments.map((item) => (
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
      ))}
    </div>
  );
}

function truncateChartLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}
