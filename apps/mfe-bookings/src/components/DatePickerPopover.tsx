import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import "./DatePickerPopover.css";

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
}

const buildDays = (target: Date): Array<Date | null> => {
  const days: Array<Date | null> = [];
  const year = target.getFullYear();
  const month = target.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const lead = firstDay.getDay();

  for (let i = 0; i < lead; i += 1) {
    days.push(null);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }
  return days;
};

export default function DatePickerPopover({
  selectedDate,
  anchorRect,
  onSelectDate,
  onClose,
}: DatePickerPopoverProps): JSX.Element {
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  const days = useMemo(() => buildDays(viewDate), [viewDate]);
  const today = useMemo(() => new Date(), []);

  const yearOptions = useMemo(() => {
    const current = today.getFullYear();
    const start = current - 100;
    const end = current + 5;
    const years: number[] = [];

    for (let year = start; year <= end; year += 1) {
      years.push(year);
    }
    return years;
  }, [today]);

  const monthLabel = `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const handlePrev = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelect = (date: Date | null) => {
    if (!date) return;
    onSelectDate?.(date);
  };

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = Number(event.target.value);
    setViewDate((prev) => new Date(prev.getFullYear(), monthIndex, 1));
  };

  const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const yearValue = Number(event.target.value);
    setViewDate((prev) => new Date(yearValue, prev.getMonth(), 1));
  };

  const { innerWidth } = typeof window !== "undefined" ? window : { innerWidth: 1024 };
  const popoverWidth = 340;
  const computedLeft =
    anchorRect != null
      ? Math.min(Math.max(8, anchorRect.left), innerWidth - popoverWidth - 16)
      : undefined;

  const popoverStyle: CSSProperties =
    anchorRect != null
      ? {
          position: "fixed",
          top: anchorRect.bottom + 6,
          left: computedLeft,
        }
      : { position: "fixed" };

  return (
    <div className="date-picker-backdrop" onClick={onClose}>
      <div
        className="date-picker-popover"
        style={popoverStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="date-picker-header">
          <div>
            <p className="date-picker-title">Change date</p>
            <strong className="date-picker-month">{monthLabel}</strong>
          </div>

          <div className="date-picker-controls">
            <button type="button" onClick={handlePrev} aria-label="Previous month">
              ‹
            </button>
            <button type="button" onClick={handleNext} aria-label="Next month">
              ›
            </button>
          </div>
        </div>

        <div className="date-picker-selects">
          <div className="date-picker-select">
            <label htmlFor="month-select">Month</label>
            <select id="month-select" value={viewDate.getMonth()} onChange={handleMonthChange}>
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="date-picker-select">
            <label htmlFor="year-select">Year</label>
            <select id="year-select" value={viewDate.getFullYear()} onChange={handleYearChange}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="date-picker-weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="date-picker-grid-wrapper">
          <div className="date-picker-grid">
            {days.map((day, index) => {
              const isToday =
                !!day &&
                day.getFullYear() === today.getFullYear() &&
                day.getMonth() === today.getMonth() &&
                day.getDate() === today.getDate();

              const isSelected =
                !!day &&
                !!selectedDate &&
                day.getFullYear() === selectedDate.getFullYear() &&
                day.getMonth() === selectedDate.getMonth() &&
                day.getDate() === selectedDate.getDate();

              return (
                <button
                  key={`${index}-${day?.toDateString() ?? "empty"}`}
                  type="button"
                  className={`date-picker-day ${isSelected ? "selected" : ""} ${
                    isToday ? "today" : ""
                  }`}
                  onClick={() => handleSelect(day)}
                  disabled={!day}
                >
                  {day?.getDate() ?? ""}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}