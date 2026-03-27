import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
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
  onSelectDate?: (date: Date) => void;
  onClose?: () => void;
  title?: string;
  width?: number;
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
  onSelectDate,
  onClose,
  title = "Change date",
  width = 340,
  className,
  overlayClassName,
}: DatePickerPopoverProps) {
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());

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

    for (let year = current - 100; year <= current + 5; year += 1) {
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

  const { innerWidth } = typeof window !== "undefined" ? window : { innerWidth: 1024 };
  const computedLeft =
    anchorRect != null ? Math.min(Math.max(8, anchorRect.left), innerWidth - width - 16) : undefined;

  const popoverStyle: CSSProperties =
    anchorRect != null
      ? { position: "fixed", top: anchorRect.bottom + 6, left: computedLeft, width: `min(${width}px, 92vw)` }
      : { position: "fixed", width: `min(${width}px, 92vw)` };

  return (
    <div
      className={cn("fixed inset-0 z-50 pointer-events-auto", overlayClassName)}
      onClick={onClose}
    >
      <div
        className={cn(
          "box-border flex h-auto max-h-[460px] flex-col gap-3 rounded-[22px] bg-white p-5 shadow-[0_35px_60px_rgba(9,6,31,0.25)]",
          className
        )}
        style={popoverStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[0.85rem] text-[#8a8aa8]">{title}</p>
            <strong className="m-0 block overflow-hidden text-ellipsis whitespace-nowrap text-[1.1rem] text-[#1f2040]">
              {monthLabel}
            </strong>
          </div>

          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-[34px] min-w-[34px] rounded-[10px] border border-[#d2d4e8] bg-[#f5f3ff] p-0 text-[1.2rem] font-semibold text-[#4f4a94]"
              onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="h-[34px] min-w-[34px] rounded-[10px] border border-[#d2d4e8] bg-[#f5f3ff] p-0 text-[1.2rem] font-semibold text-[#4f4a94]"
              onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              ›
            </Button>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="date-picker-popover-month" className="text-[0.65rem] uppercase tracking-[0.05em] text-[#a3a5c6]">
              Month
            </label>
            <Select
              id="date-picker-popover-month"
              value={String(viewDate.getMonth())}
              onChange={handleMonthChange}
              options={MONTH_LABELS.map((label, index) => ({ value: String(index), label }))}
              className="min-h-[38px] rounded-[10px] border-[#dfe1f2] bg-[#f8f7ff] px-[10px] text-[0.9rem] text-[#1f2040]"
            />
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="date-picker-popover-year" className="text-[0.65rem] uppercase tracking-[0.05em] text-[#a3a5c6]">
              Year
            </label>
            <Select
              id="date-picker-popover-year"
              value={String(viewDate.getFullYear())}
              onChange={handleYearChange}
              options={yearOptions.map((year) => ({ value: String(year), label: String(year) }))}
              className="min-h-[38px] rounded-[10px] border-[#dfe1f2] bg-[#f8f7ff] px-[10px] text-[0.9rem] text-[#1f2040]"
            />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] uppercase tracking-[0.08em] text-[#a3a5c6]">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="grid flex-1 grid-cols-7 gap-2 overflow-hidden pr-2">
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
                    "flex h-10 w-10 items-center justify-center rounded-xl border-0 bg-transparent p-0 text-[0.85rem] text-[#141432]",
                    "transition-colors duration-200 hover:bg-[#f4f1ff]",
                    isSelected && "bg-[#6c32ff] text-white shadow-[0_10px_20px_rgba(108,50,255,0.35)] hover:bg-[#6c32ff]",
                    isToday && "border border-[rgba(108,50,255,0.7)]",
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
}
