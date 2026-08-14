import { useId, useRef, useState } from "react";
import { DatePickerPopover } from "../DatePickerPopover/DatePickerPopover";
import { TimePicker } from "../TimePicker/TimePicker";
import { cn } from "../../utils";

export interface DateTimePickerProps {
  id?: string;
  "data-testid"?: string;
  label?: string;
  ariaLabel?: string;
  error?: string;
  hint?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
  dateLabel?: string;
  timeLabel?: string;
  popoverWidth?: number;
  compact?: boolean;
}

export function DateTimePicker({
  id,
  "data-testid": testId,
  label,
  ariaLabel,
  error,
  hint,
  value,
  defaultValue = "",
  onChange,
  disabled,
  required,
  fullWidth = true,
  className,
  dateLabel: _dateLabel = "Date",
  timeLabel = "Time",
  popoverWidth = 310,
  compact = false,
}: DateTimePickerProps) {
  const generatedId = useId();
  const baseId = id || generatedId;
  const baseTestId = testId || baseId;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentValue = controlled ? value || "" : internalValue;
  const [date = "", rawTime = ""] = currentValue.split(/[T ]/);
  const time = rawTime.slice(0, 5);
  const selectedDate = date ? new Date(`${date}T00:00:00`) : null;
  const displayValue = selectedDate && !Number.isNaN(selectedDate.getTime())
    ? `${selectedDate.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}${time ? `, ${time}` : ""}`
    : "";

  const update = (nextValue: string) => {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", className)}>
      {label ? <label htmlFor={baseId} className="ds-form-label">{label}{required ? " *" : ""}</label> : null}
      <button
        id={baseId}
        ref={triggerRef}
        data-testid={baseTestId}
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-label={ariaLabel || label || "Select date and time"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left text-sm text-gray-800",
          "border-gray-200 hover:border-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
          "disabled:cursor-not-allowed disabled:bg-gray-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        )}
      >
        <span className={cn("truncate", !displayValue && "text-gray-400")}>{displayValue || "Select date and time"}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M12 13v3l2 1" />
        </svg>
      </button>
      {open ? (
        <DatePickerPopover
          anchorRef={triggerRef}
          align="start"
          width={popoverWidth}
          compact={compact}
          title={label || "Select date and time"}
          selectedDate={selectedDate}
          onClose={() => setOpen(false)}
          onSelectDate={(nextDate) => {
            const nextDateValue = [nextDate.getFullYear(), String(nextDate.getMonth() + 1).padStart(2, "0"), String(nextDate.getDate()).padStart(2, "0")].join("-");
            update(`${nextDateValue}T${time || "00:00"}`);
          }}
          footer={
            <div className="flex items-center gap-2.5">
              <label htmlFor={`${baseId}-time`} className="shrink-0 text-xs font-medium text-gray-500">{timeLabel}</label>
              <TimePicker
                id={`${baseId}-time`}
                data-testid={`${baseTestId}-time`}
                className="h-8"
                value={time}
                use12Hour
                onChange={(event) => {
                  const match = event.target.value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                  let nextTime = event.target.value;
                  if (match) {
                    let hour = Number(match[1]);
                    if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
                    if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
                    nextTime = `${String(hour).padStart(2, "0")}:${match[2]}`;
                  }
                  const nextDate = date || new Date().toLocaleDateString("en-CA");
                  update(`${nextDate}T${nextTime}`);
                }}
              />
            </div>
          }
        />
      ) : null}
      {hint && !error ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
