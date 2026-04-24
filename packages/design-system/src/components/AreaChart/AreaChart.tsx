import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils";
import { ChartTooltip } from "../ChartTooltip/ChartTooltip";
import { Popover, PopoverSection } from "../Popover/Popover";

export interface AreaChartDatum {
  label: string;
  value: number;
}

export interface AreaChartProps {
  data: AreaChartDatum[];
  yTicks?: number[];
  className?: string;
  footerLabel?: string;
  showToolbar?: boolean;
  downloadFilePrefix?: string;
  formatYTick?: (value: number) => string;
  showTooltip?: boolean;
  chartHeight?: number;
}

export function AreaChart({
  data,
  yTicks,
  className,
  footerLabel,
  showToolbar = false,
  downloadFilePrefix = "chart",
  formatYTick = defaultFormatYTick,
  showTooltip = true,
  chartHeight = 260,
}: AreaChartProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: number;
    color: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 640;
  const height = chartHeight;
  const margin = { top: 16, right: 20, bottom: 44, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const resolvedYTicks = yTicks?.length ? yTicks : buildDefaultYTicks(data);
  const maxValue = Math.max(resolvedYTicks[resolvedYTicks.length - 1] ?? 0, ...data.map((item) => item.value), 1);

  const points = data.map((item, index) => {
    const x = margin.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
    const y = margin.top + plotHeight - (item.value / maxValue) * plotHeight;
    return { ...item, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? margin.left} ${margin.top + plotHeight} L ${points[0]?.x ?? margin.left} ${margin.top + plotHeight} Z`;

  function closeMenu() {
    setDownloadOpen(false);
  }

  function downloadTextFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadCsv() {
    const csv = ["label,value", ...data.map((item) => `${item.label},${item.value}`)].join("\n");
    downloadTextFile(`${downloadFilePrefix}.csv`, csv, "text/csv;charset=utf-8");
    closeMenu();
  }

  function getSerializedSvg() {
    if (!svgRef.current) return null;
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgRef.current);
  }

  function handleDownloadSvg() {
    const svg = getSerializedSvg();
    if (!svg) return;
    downloadTextFile(`${downloadFilePrefix}.svg`, svg, "image/svg+xml;charset=utf-8");
    closeMenu();
  }

  function handleDownloadPng() {
    const svg = getSerializedSvg();
    if (!svg) return;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${downloadFilePrefix}.png`;
        link.click();
      }
      URL.revokeObjectURL(url);
      closeMenu();
    };

    img.src = url;
  }

  return (
    <div className={cn("relative rounded-xl border border-slate-100 bg-white p-2", className)}>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
      {showToolbar ? (
        <div className="mb-1 flex items-center justify-end gap-0.5 px-2 text-slate-500">
          <ChartToolButton label="Zoom in">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" />
              <path d="M6 3.5v5M3.5 6h5M10.5 10.5L13 13" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </ChartToolButton>
          <ChartToolButton label="Zoom out">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" />
              <path d="M3.5 6h5M10.5 10.5L13 13" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </ChartToolButton>
          <ChartToolButton label="Search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" />
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </ChartToolButton>
          <ChartToolButton label="Pan">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5v11M3.5 5v6M10.5 4v7M1.5 7h11" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </ChartToolButton>
          <ChartToolButton label="Home">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 6.5L7 2l5 4.5M3.5 5.5v6h7v-6" stroke="currentColor" strokeLinejoin="round" />
            </svg>
          </ChartToolButton>
          <Popover
            open={downloadOpen}
            onOpenChange={setDownloadOpen}
            align="end"
            contentClassName="min-w-[132px] p-1"
            trigger={
              <ChartToolButton label="Download">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 2v6M4.5 5.5L7 8l2.5-2.5M2.5 10.5h9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </ChartToolButton>
            }
          >
            <PopoverSection className="space-y-0">
              <button type="button" onClick={handleDownloadSvg} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                Download SVG
              </button>
              <button type="button" onClick={handleDownloadPng} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                Download PNG
              </button>
              <button type="button" onClick={handleDownloadCsv} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                Download CSV
              </button>
            </PopoverSection>
          </Popover>
        </div>
      ) : null}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Area chart"
      >
        {resolvedYTicks.map((tick) => {
          const y = margin.top + plotHeight - (tick / maxValue) * plotHeight;
          return (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />
              <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748B">
                {formatYTick(tick)}
              </text>
            </g>
          );
        })}

        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="#CBD5E1" />

        {points.length > 1 ? (
          <>
            <path d={areaPath} fill="rgba(37, 99, 235, 0.14)" />
            <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          </>
        ) : null}

        {points.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="14"
              fill="transparent"
              onMouseEnter={() => {
                if (!showTooltip) return;
                setTooltip({
                  x: (point.x / width) * 100,
                  y: (point.y / height) * 100,
                  label: point.label,
                  series: "Sales",
                  value: point.value,
                  color: "#2563EB",
                });
              }}
              onMouseLeave={() => {
                if (!showTooltip) return;
                setTooltip(null);
              }}
            />
            <circle cx={point.x} cy={point.y} r="4.5" fill="#2563EB" />
            <rect x={point.x - 12} y={point.y - 26} width="24" height="18" rx="4" fill="#2563EB" />
            <text x={point.x} y={point.y - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">
              {point.value}
            </text>
            <text x={point.x} y={height - 14} textAnchor="middle" fontSize="12" fill="#334155">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      {footerLabel ? <div className="text-center text-sm font-semibold text-slate-700">{footerLabel}</div> : null}
    </div>
  );
}

function ChartToolButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-5 w-5 items-center justify-center rounded-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
    >
      {children}
    </button>
  );
}

function defaultFormatYTick(value: number) {
  return value === 0 ? "0" : `Rs ${value}`;
}

function buildDefaultYTicks(data: AreaChartDatum[]) {
  const maxDatum = Math.max(0, ...data.map((item) => item.value));

  if (maxDatum <= 0) {
    return [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2.0];
  }

  const roughStep = maxDatum / 5;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;
  const stepMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = stepMultiplier * magnitude;
  const top = Math.ceil(maxDatum / step) * step;

  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}
