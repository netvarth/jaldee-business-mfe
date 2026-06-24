import { forwardRef, useEffect, useMemo, useRef } from "react";
import type { InputHTMLAttributes, ChangeEvent } from "react";
import { cn } from "../../utils";
import { Popover } from "../Popover/Popover";

export interface TimePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  use12Hour?: boolean;
  value?: string;
}

const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  ({ className, label, error, hint, id, fullWidth = true, use12Hour = false, value, onChange, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    const hours12 = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")), []);
    const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

    // Parse the current value (e.g. "05:30 PM", "17:30", "09:00 AM") into 12-hour components and 24-hour HH:MM
    const [h12Str, minStr, period, time24] = useMemo<[string, string, "AM" | "PM", string]>(() => {
      const valStr = String(value ?? "").trim();
      
      // 1. Try matching 12-hour format: "05:30 PM"
      const match12 = valStr.match(/^(\d{1,2})[.:](\d{2})\s*([AP]M)$/i);
      if (match12) {
        const h12 = String(Number(match12[1])).padStart(2, "0");
        const min = match12[2];
        const p = match12[3].toUpperCase() as "AM" | "PM";
        let h24 = Number(h12);
        if (p === "AM" && h24 === 12) h24 = 0;
        if (p === "PM" && h24 !== 12) h24 += 12;
        return [h12, min, p, `${String(h24).padStart(2, "0")}:${min}`];
      }

      // 2. Try matching 24-hour format: "17:30"
      const match24 = valStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      if (match24) {
        const h24 = Number(match24[1]);
        const min = match24[2];
        const p = h24 >= 12 ? "PM" : "AM";
        const h12 = String(h24 % 12 || 12).padStart(2, "0");
        return [h12, min, p, valStr];
      }

      return ["09", "00", "AM", "09:00"];
    }, [value]);

    const displayValue = useMemo(() => {
      if (!value) return "";
      return `${h12Str}:${minStr} ${period}`;
    }, [h12Str, minStr, period, value]);

    const handleHourChange = (newHour: string) => {
      if (!onChange) return;
      const newValue = `${newHour}:${minStr} ${period}`;
      onChange({
        target: {
          value: newValue,
          id: inputId,
          name: props.name,
        }
      } as unknown as ChangeEvent<HTMLInputElement>);
    };

    const handleMinChange = (newMin: string) => {
      if (!onChange) return;
      const newValue = `${h12Str}:${newMin} ${period}`;
      onChange({
        target: {
          value: newValue,
          id: inputId,
          name: props.name,
        }
      } as unknown as ChangeEvent<HTMLInputElement>);
    };

    const handlePeriodChange = (newPeriod: "AM" | "PM") => {
      if (!onChange) return;
      const newValue = `${h12Str}:${minStr} ${newPeriod}`;
      onChange({
        target: {
          value: newValue,
          id: inputId,
          name: props.name,
        }
      } as unknown as ChangeEvent<HTMLInputElement>);
    };

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={inputId} className="ds-form-label">
            {label}
          </label>
        )}

        {use12Hour ? (
          <Popover
            trigger={
              <div className={cn("relative cursor-pointer", fullWidth && "w-full")}>
                <input
                  ref={ref}
                  id={inputId}
                  value={displayValue}
                  readOnly
                  disabled={props.disabled}
                  placeholder={props.placeholder || "Select time"}
                  className={cn(
                    "w-full h-9 rounded-md border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-800 cursor-pointer",
                    "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
                    "disabled:cursor-not-allowed disabled:bg-gray-50",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                    className
                  )}
                  aria-invalid={!!error}
                  {...props}
                />
                <button
                  type="button"
                  disabled={props.disabled}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center text-gray-400 hover:text-gray-600 pointer-events-none"
                >
                  <ClockIcon />
                </button>
              </div>
            }
            contentClassName="!p-2.5 bg-white border border-gray-200 shadow-md rounded-xl overflow-hidden"
            disabled={props.disabled}
          >
            <TimePickerPopoverContent
              hours12={hours12}
              minutes={minutes}
              h12Str={h12Str}
              minStr={minStr}
              period={period}
              onHourChange={handleHourChange}
              onMinChange={handleMinChange}
              onPeriodChange={handlePeriodChange}
            />
          </Popover>
        ) : (
          <input
            ref={ref}
            id={inputId}
            type="time"
            value={time24}
            onChange={onChange}
            className={cn(
              "w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800",
              "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
              "disabled:cursor-not-allowed disabled:bg-gray-50",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
        )}

        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";
export { TimePicker };

interface TimePickerPopoverContentProps {
  hours12: string[];
  minutes: string[];
  h12Str: string;
  minStr: string;
  period: "AM" | "PM";
  onHourChange: (h: string) => void;
  onMinChange: (m: string) => void;
  onPeriodChange: (p: "AM" | "PM") => void;
}

function TimePickerPopoverContent({
  hours12,
  minutes,
  h12Str,
  minStr,
  period,
  onHourChange,
  onMinChange,
  onPeriodChange,
}: TimePickerPopoverContentProps) {
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToActive = (container: HTMLDivElement | null) => {
      if (!container) return;
      const active = container.querySelector("[data-active='true']") as HTMLElement;
      if (active) {
        container.scrollTop = active.offsetTop - container.offsetHeight / 2 + active.offsetHeight / 2;
      }
    };
    const t = setTimeout(() => {
      scrollToActive(hourRef.current);
      scrollToActive(minRef.current);
    }, 50);
    return () => clearTimeout(t);
  }, [h12Str, minStr]); // Re-scroll when selection changes

  return (
    <div className="flex gap-2 items-center h-48 overflow-hidden bg-white">
      {/* Hours Column */}
      <div
        ref={hourRef}
        className="w-14 h-full overflow-y-auto flex flex-col gap-0.5 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {hours12.map((h) => {
          const isSelected = h === h12Str;
          return (
            <button
              key={h}
              type="button"
              data-active={isSelected}
              onClick={() => onHourChange(h)}
              className={cn(
                "w-full py-1.5 text-center text-sm rounded-md font-bold transition-all duration-100 shrink-0",
                isSelected
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
              )}
            >
              {h}
            </button>
          );
        })}
      </div>

      <div className="w-px h-full bg-gray-100 self-stretch shrink-0" />

      {/* Minutes Column */}
      <div
        ref={minRef}
        className="w-14 h-full overflow-y-auto flex flex-col gap-0.5 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {minutes.map((m) => {
          const isSelected = m === minStr;
          return (
            <button
              key={m}
              type="button"
              data-active={isSelected}
              onClick={() => onMinChange(m)}
              className={cn(
                "w-full py-1.5 text-center text-sm rounded-md font-bold transition-all duration-100 shrink-0",
                isSelected
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
              )}
            >
              {m}
            </button>
          );
        })}
      </div>

      <div className="w-px h-full bg-gray-100 self-stretch shrink-0" />

      {/* AM/PM Column */}
      <div className="w-16 flex flex-col justify-center gap-1.5 px-0.5 shrink-0">
        {(["AM", "PM"] as const).map((p) => {
          const isSelected = p === period;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p)}
              className={cn(
                "w-full py-2.5 text-center text-xs rounded-md font-extrabold transition-all duration-100",
                isSelected
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-100"
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[16px] w-[16px]">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
