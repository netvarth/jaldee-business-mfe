import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "../Button/Button";
import { Select } from "../Select/Select";
import { cn } from "../../utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export interface DatePickerPopoverProps {
  selectedDate?: Date | null;
  anchorRect?: DOMRect | null;
  anchorRef?: React.RefObject<HTMLElement> | null;
  onSelectDate?: (date: Date) => void;
  onClose?: () => void;
  title?: string;
  width?: number;
  align?: "start" | "end";
  className?: string;
  overlayClassName?: string;
}

const buildDays = (target: Date): Array<Date | null> => {
  const days: Array<Date | null> = [];
  const year = target.getFullYear();
  const month = target.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const lead = firstDay.getDay();

  for (let i = 0; i < lead; i += 1) days.push(null);
  for (let day = 1; day <= totalDays; day += 1) days.push(new Date(year, month, day));

  return days;
};

const isSameDay = (left?: Date | null, right?: Date | null): boolean =>
  Boolean(
    left &&
      right &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  );

export function DatePickerPopover({
  selectedDate,
  anchorRect,
  anchorRef,
  onSelectDate,
  onClose,
  title = "Change date",
  width = 310,
  align = "end",
  className,
  overlayClassName,
}: DatePickerPopoverProps) {
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());
  const [coords, setCoords] = useState<{ top?: number; left?: number; width?: number }>({});

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => buildDays(viewDate), [viewDate]);
  const monthLabel = `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const yearOptions = useMemo(() => {
    const current = today.getFullYear();
    const years: number[] = [];

    for (let year = current - 100; year <= current + 10; year += 1) {
      years.push(year);
    }

    return years;
  }, [today]);

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setViewDate((prev) => new Date(prev.getFullYear(), Number(event.target.value), 1));
  };

  const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setViewDate((prev) => new Date(Number(event.target.value), prev.getMonth(), 1));
  };

  const { innerWidth, innerHeight } = typeof window !== "undefined" ? window : { innerWidth: 1024, innerHeight: 768 };
  const estimatedHeight = 350;

  useEffect(() => {
    const updatePosition = () => {
      const rect = anchorRef?.current?.getBoundingClientRect() || anchorRect;
      if (!rect) return;

      const spaceBelow = innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const shouldOpenAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      const computedTop = shouldOpenAbove
        ? Math.max(8, rect.top - estimatedHeight - 6)
        : rect.bottom + 6;

      const anchorLeft = align === "end" ? rect.right - width : rect.left;
      const computedLeft = Math.min(Math.max(8, anchorLeft), innerWidth - width - 16);

      setCoords({
        top: computedTop,
        left: computedLeft,
        width: Math.min(width, innerWidth - 16),
      });
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePosition, { capture: true });
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRect, anchorRef, width, align, innerWidth, innerHeight]);

  const popoverStyle: CSSProperties = {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    width: coords.width ? `${coords.width}px` : `min(${width}px, 92vw)`,
  };

  const content = (
    <div
      className={cn("fixed inset-0 z-[9999] pointer-events-auto", overlayClassName)}
      onClick={onClose}
    >
      <div
        className={cn(
          "box-border flex h-auto max-h-[360px] flex-col gap-2.5 rounded-[16px] border border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)]",
          className
        )}
        style={popoverStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[0.7rem] text-[#8a8aa8]">{title}</p>
            <strong className="m-0 block overflow-hidden text-ellipsis whitespace-nowrap text-[1.1rem] font-bold leading-none text-[#252b56]">
              {monthLabel}
            </strong>
          </div>

          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-[28px] min-w-[28px] rounded-[8px] border border-[#d9dcf2] bg-[#f8f7ff] p-0 text-[0.85rem] font-semibold text-[#6e61b5]"
              onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-[28px] min-w-[28px] rounded-[8px] border border-[#d9dcf2] bg-[#f8f7ff] p-0 text-[0.85rem] font-semibold text-[#6e61b5]"
              onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              ›
            </Button>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <div className="flex flex-1 flex-col gap-0.5">
            <label htmlFor="date-picker-popover-month" className="text-[0.65rem] uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
              Month
            </label>
            <Select
              id="date-picker-popover-month"
              value={String(viewDate.getMonth())}
              onChange={handleMonthChange}
              options={MONTH_LABELS.map((label, index) => ({ value: String(index), label }))}
              className="!min-h-0 !h-8 !py-0 !pl-2 rounded-[8px] border-[var(--color-primary-muted)] bg-[var(--color-primary-subtle)] text-[var(--color-text-primary)]"
            />
          </div>

          <div className="flex flex-1 flex-col gap-0.5">
            <label htmlFor="date-picker-popover-year" className="text-[0.65rem] uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
              Year
            </label>
            <Select
              id="date-picker-popover-year"
              value={String(viewDate.getFullYear())}
              onChange={handleYearChange}
              options={yearOptions.map((year) => ({ value: String(year), label: String(year) }))}
              className="!min-h-0 !h-8 !py-0 !pl-2 rounded-[8px] border-[var(--color-primary-muted)] bg-[var(--color-primary-subtle)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] uppercase tracking-[0.05em] text-[#a3a5c6]">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-7 gap-y-1 gap-x-1 overflow-hidden">
            {days.map((day, index) => {
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <Button
                  key={`${index}-${day?.toDateString() ?? "empty"}`}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-[8px] border-0 bg-transparent p-0 text-[0.82rem] font-medium text-[#1b2040]",
                    "transition-colors duration-200 hover:bg-[#f4f1ff]",
                    isSelected && "bg-[linear-gradient(180deg,#7C3AED_0%,#5B21D1_100%)] text-white shadow-[0_8px_16px_rgba(108,50,255,0.24)] hover:bg-[linear-gradient(180deg,#7C3AED_0%,#5B21D1_100%)]",
                    isToday && "border border-[rgba(108,50,255,0.24)] bg-[#faf7ff]",
                    !day && "cursor-default opacity-0 hover:bg-transparent"
                  )}
                  onClick={() => day && onSelectDate?.(day)}
                  disabled={!day}
                >
                  {day?.getDate() ?? ""}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
