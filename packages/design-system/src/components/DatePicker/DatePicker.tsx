import { forwardRef, useMemo, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent } from "react";
import { DatePickerPopover } from "../DatePickerPopover/DatePickerPopover";
import { cn } from "../../utils";

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  containerClassName?: string;
}

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

function parseDateValue(value?: string | number | readonly string[]) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayValue(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      id,
      name,
      fullWidth = true,
      value,
      defaultValue,
      onChange,
      onBlur,
      required,
      disabled,
      placeholder = "Select date",
      min,
      max,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const fieldRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const selectedDate = useMemo(
      () => parseDateValue(value ?? defaultValue),
      [defaultValue, value]
    );

    const hiddenValue = typeof value === "string"
      ? value
      : selectedDate
        ? formatDateValue(selectedDate)
        : typeof defaultValue === "string"
          ? defaultValue
          : "";

    function handleSelectDate(date: Date) {
      const nextValue = formatDateValue(date);

      if (typeof min === "string" && nextValue < min) {
        return;
      }

      if (typeof max === "string" && nextValue > max) {
        return;
      }

      onChange?.({
        target: { value: nextValue, name: name ?? "", id: inputId ?? "" },
        currentTarget: { value: nextValue, name: name ?? "", id: inputId ?? "" },
      } as ChangeEvent<HTMLInputElement>);

      setIsOpen(false);
    }

    function openPicker() {
      if (!disabled) {
        setIsOpen(true);
      }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (disabled) {
        return;
      }

      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        setIsOpen(true);
      }
    }

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
        {label ? (
          <label htmlFor={inputId} className="ds-form-label">
            {label}
            {required ? <span aria-hidden="true"> *</span> : null}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          name={name}
          {...props}
          type="hidden"
          value={hiddenValue}
          readOnly
        />

        <div ref={fieldRef} className={cn("relative", fullWidth && "w-full")}>
          <input
            value={selectedDate ? formatDisplayValue(selectedDate) : ""}
            readOnly
            disabled={disabled}
            placeholder={String(placeholder)}
            onClick={openPicker}
            onFocus={openPicker}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            className={cn(
              fullWidth && "block w-full",
              "ds-form-control pr-14 text-left text-[var(--text-sm)] leading-normal align-middle",
              "h-[38px] rounded-[calc(var(--radius-control)+4px)] border bg-[var(--color-surface)] text-[var(--color-text-primary)]",
              "border-[color:color-mix(in_srgb,var(--color-border)_76%,white)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
              "placeholder:text-[var(--color-text-secondary)]",
              "focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]",
              "disabled:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed",
              "transition-colors duration-100",
              error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-0",
              className
            )}
            aria-invalid={!!error}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          />

          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((current) => !current)}
            className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] border border-[var(--color-primary-muted)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
            aria-label="Open date picker"
            tabIndex={-1}
          >
            <CalendarIcon />
          </button>
        </div>

        {isOpen ? (
          <DatePickerPopover
            selectedDate={selectedDate}
            anchorRect={fieldRef.current?.getBoundingClientRect() ?? null}
            align="end"
            onSelectDate={handleSelectDate}
            onClose={() => setIsOpen(false)}
          />
        ) : null}

        {hint && !error ? (
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">{hint}</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-[length:var(--text-xs)] text-[var(--color-danger)]">{error}</p>
        ) : null}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
export { DatePicker };

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}
