import { useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils";
import { ChartTooltip } from "../ChartTooltip/ChartTooltip";
import { Popover, PopoverSection } from "../Popover/Popover";

export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
  revenue?: number;
  payout?: number;
  expense?: number;
}

export interface BarChartLegendItem {
  label: string;
  color: string;
}

export interface BarChartProps {
  data: BarChartDatum[];
  yTicks?: number[];
  className?: string;
  "data-testid"?: string;
  formatYTick?: (value: number) => string;
  showTooltip?: boolean;
  legend?: BarChartLegendItem[];
  yAxisLabel?: string;
  tooltipSeriesLabel?: string;
  showMenuIcon?: boolean;
  showValueInsideBars?: boolean;
  barRadius?: number;
  roundTopOnly?: boolean;
  variant?: "default" | "report";
  showXAxisLabels?: boolean;
  width?: number;
  height?: number;
  startOffset?: number;
}

export function BarChart({
  data,
  yTicks,
  className,
  "data-testid": testId = "bar-chart",
  formatYTick = defaultFormatYTick,
  showTooltip = true,
  legend,
  yAxisLabel,
  tooltipSeriesLabel = "Value",
  showMenuIcon = false,
  showValueInsideBars = false,
  barRadius = 2,
  roundTopOnly = false,
  variant = "default",
  showXAxisLabels = true,
  width = 800,
  height = 220,
  startOffset = 32,
}: BarChartProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: number;
    color: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
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
      ticks = buildDefaultTicks(maxValue);
    }
  }
  const plotScaleMax = ticks.length > 0 && ticks[ticks.length - 1] > 0 ? ticks[ticks.length - 1] : maxValue;

  const availableWidth = plotWidth - 2 * startOffset;
  const barWidth = data.length > 0 ? Math.min(96, availableWidth / Math.max(data.length, 1) - 18) : 0;
  const gap = data.length > 1 ? (availableWidth - barWidth * data.length) / (data.length - 1) : 0;
  const isReportVariant = variant === "report";
  const gridStroke = isReportVariant ? "#dbe5f0" : "var(--color-chart-grid)";
  const gridDasharray = isReportVariant ? undefined : "3 3";
  const axisStroke = isReportVariant ? "#e2e8f0" : "var(--color-chart-axis)";
  const tickFill = isReportVariant ? "#334155" : "var(--color-chart-label)";
  const tickFontSize = isReportVariant ? "13" : "var(--text-xs)";
  const xLabelFontSize = isReportVariant ? "14" : "var(--text-xs)";

  const hasLegend = legend && legend.length > 0;
  const extraHeight = hasLegend ? 32 : 0;
  const svgHeight = height + extraHeight;
  const renderedHeight = (isReportVariant ? 260 : 220) + extraHeight;

  const legendItemWidths = legend ? legend.map(item => 12 + 8 + item.label.length * 7 + 24) : [];
  const totalLegendWidth = legend ? legendItemWidths.reduce((sum, w) => sum + w, 0) - 24 : 0;

  function closeMenu() {
    setMenuOpen(false);
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

  function getSerializedSvg() {
    if (!svgRef.current) return null;
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgRef.current);
    
    // Replace CSS variables with standard computed values for standalone rendering
    svgString = svgString
      .replace(/var\(--color-chart-label\)/g, "#6B7280")
      .replace(/var\(--color-chart-axis\)/g, "#D1D5DB")
      .replace(/var\(--color-chart-grid\)/g, "#E5E7EB")
      .replace(/var\(--color-chart-1\)/g, "#4C1DB3")
      .replace(/var\(--color-chart-2\)/g, "#059669")
      .replace(/var\(--color-chart-3\)/g, "#D97706")
      .replace(/var\(--text-xs\)/g, "13px")
      .replace(/var\(--font-family-base\)/g, "ui-sans-serif, system-ui, sans-serif");
      
    return svgString;
  }

  function handleDownloadCsv() {
    const csv = ["label,value", ...data.map((item) => `${item.label},${item.value}`)].join("\n");
    downloadTextFile("chart.csv", csv, "text/csv;charset=utf-8");
    closeMenu();
  }

  function handleDownloadSvg() {
    const svg = getSerializedSvg();
    if (!svg) return;
    downloadTextFile("chart.svg", svg, "image/svg+xml;charset=utf-8");
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
      canvas.height = svgHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, svgHeight);
        context.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "chart.png";
        link.click();
      }
      URL.revokeObjectURL(url);
      closeMenu();
    };

    img.src = url;
  }

  return (
    <div data-testid={testId} className={cn("relative w-full", className)}>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
      {showMenuIcon ? (
        <div className="mb-1 flex items-center justify-end px-2 text-slate-500">
          <Popover
            open={menuOpen}
            onOpenChange={setMenuOpen}
            align="end"
            portal
            contentClassName="min-w-[132px] p-1"
            trigger={
              <ChartToolButton label="Menu">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2.5 4H13.5M2.5 8H13.5M2.5 12H13.5" stroke="currentColor" strokeLinecap="round" />
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
        viewBox={`0 0 ${width} ${svgHeight}`}
        style={{ height: renderedHeight }}
        className="w-full"
        role="img"
        aria-label="Bar chart"
      >
        {ticks.map((tick) => {
          const y = margin.top + plotHeight - (tick / plotScaleMax) * plotHeight;

          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                stroke={gridStroke}
                strokeDasharray={gridDasharray}
              />
              <text
                x={margin.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={tickFontSize}
                fill={tickFill}
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
          stroke={axisStroke}
        />
        {yAxisLabel ? (
          <text
            x={16}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${margin.top + plotHeight / 2})`}
            fontSize="12"
            fontWeight="700"
            fill="#0f172a"
          >
            {yAxisLabel}
          </text>
        ) : null}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={margin.top + plotHeight}
          y2={margin.top + plotHeight}
          stroke={axisStroke}
        />

        {data.map((item, index) => {
          const x = data.length === 1 ? margin.left + (plotWidth - barWidth) / 2 : margin.left + startOffset + index * (barWidth + gap);
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
                {showXAxisLabels ? (
                  <text
                    x={labelX}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize={xLabelFontSize}
                    fill={tickFill}
                  >
                    {item.label}
                  </text>
                ) : null}
              </g>
            );
          }

          const barHeight = (item.value / plotScaleMax) * plotHeight;
          const y = margin.top + plotHeight - barHeight;

          return (
            <g key={`${item.label}-${index}`}>
              {roundTopOnly ? (
                <path
                  d={buildTopRoundedBarPath(x, y, barWidth, barHeight, barRadius)}
                  fill={item.color ?? "var(--color-chart-1)"}
                  onMouseEnter={() => {
                    if (!showTooltip) return;
                    setTooltip({
                      x: ((x + barWidth / 2) / width) * 100,
                      y: (y / height) * 100,
                      label: item.label,
                      series: tooltipSeriesLabel,
                      value: item.value,
                      color: item.color ?? "var(--color-chart-1)",
                    });
                  }}
                  onMouseLeave={() => {
                    if (!showTooltip) return;
                    setTooltip(null);
                  }}
                />
              ) : (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={barRadius}
                  fill={item.color ?? "var(--color-chart-1)"}
                  onMouseEnter={() => {
                    if (!showTooltip) return;
                    setTooltip({
                      x: ((x + barWidth / 2) / width) * 100,
                      y: (y / height) * 100,
                      label: item.label,
                      series: tooltipSeriesLabel,
                      value: item.value,
                      color: item.color ?? "var(--color-chart-1)",
                    });
                  }}
                  onMouseLeave={() => {
                    if (!showTooltip) return;
                    setTooltip(null);
                  }}
                />
              )}
              {showValueInsideBars && item.value > 0 ? (
                <text
                  x={labelX}
                  y={y + barHeight / 2 + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  fill="#FFFFFF"
                >
                  {item.value}
                </text>
              ) : null}
              {showXAxisLabels ? (
                <text
                  x={labelX}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize={xLabelFontSize}
                  fill={tickFill}
                >
                  {item.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {hasLegend ? (
          <g transform={`translate(0, ${height + 12})`}>
            {legend.map((item, index) => {
              const xCoord = (width - totalLegendWidth) / 2 + legendItemWidths.slice(0, index).reduce((sum, w) => sum + w, 0);
              return (
                <g key={item.label} transform={`translate(${xCoord}, 0)`}>
                  <rect
                    width="12"
                    height="12"
                    rx="2"
                    fill={item.color}
                  />
                  <text
                    x="20"
                    y="10"
                    fontSize="13"
                    fill="#334155"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    textAnchor="start"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>
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

function defaultFormatYTick(value: number) {
  return Math.round(value).toLocaleString();
}

function buildTopRoundedBarPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  const bottomY = y + height;

  if (r === 0) {
    return `M ${x} ${bottomY} L ${x} ${y} L ${x + width} ${y} L ${x + width} ${bottomY} Z`;
  }

  return [
    `M ${x} ${bottomY}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${bottomY}`,
    "Z",
  ].join(" ");
}

function buildDefaultTicks(maxValue: number) {
  if (maxValue <= 10) {
    return Array.from({ length: Math.ceil(maxValue) + 1 }, (_, i) => i);
  }

  const roughStep = maxValue / 6;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;
  const stepMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = stepMultiplier * magnitude;
  const top = Math.ceil(maxValue / step) * step;

  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
}
