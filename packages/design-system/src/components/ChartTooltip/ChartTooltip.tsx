export interface ChartTooltipProps {
  x: number;
  y: number;
  label: string;
  series: string;
  value: number | string;
  color: string;
}

export function ChartTooltip({
  x,
  y,
  label,
  series,
  value,
  color,
}: ChartTooltipProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[78px] rounded-[6px] bg-black px-2.5 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -102%)",
        backgroundColor: "#000000",
        color: "#ffffff",
        opacity: 1,
      }}
    >
      <p className="m-0 text-[11px] font-semibold leading-none text-white">{label}</p>
      <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] leading-none text-white">
        <span
          aria-hidden="true"
          className="inline-block h-[9px] w-[9px] shrink-0 rounded-[2px]"
          style={{ backgroundColor: color }}
        />
        <span>{`${series}: ${value}`}</span>
      </div>
    </div>
  );
}
