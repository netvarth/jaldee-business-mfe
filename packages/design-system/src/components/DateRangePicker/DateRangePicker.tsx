import { useEffect, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils";

export interface DateRangeValue {
  start: string;
  end: string;
}

export interface DateRangePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> {
  label?: string;
  error?: string;
  hint?: string;
  value?: Partial<DateRangeValue>;
  defaultValue?: Partial<DateRangeValue>;
  onChange?: (value: DateRangeValue) => void;
  startLabel?: string;
  endLabel?: string;
}

export function DateRangePicker({
  label,
  error,
  hint,
  value,
  defaultValue,
  onChange,
  startLabel = "Start",
  endLabel = "End",
  className,
  id,
  ...props
}: DateRangePickerProps) {
  const rangeId = useId();
  const baseId = id ?? rangeId;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<DateRangeValue>({
    start: defaultValue?.start ?? "",
    end: defaultValue?.end ?? "",
  });

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    setInternalValue({
      start: value?.start ?? "",
      end: value?.end ?? "",
    });
  }, [isControlled, value?.start, value?.end]);

  const currentValue = isControlled
    ? { start: value?.start ?? "", end: value?.end ?? "" }
    : internalValue;

  function updateValue(key: keyof DateRangeValue, nextValue: string) {
    const next = { ...currentValue, [key]: nextValue };

    if (!isControlled) {
      setInternalValue(next);
    }

    onChange?.(next);
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-start`} className="text-xs font-medium text-gray-500">
            {startLabel}
          </label>
          <input
            id={`${baseId}-start`}
            type="date"
            value={currentValue.start}
            onChange={(event) => updateValue("start", event.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800",
              "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
              "disabled:cursor-not-allowed disabled:bg-gray-50",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-end`} className="text-xs font-medium text-gray-500">
            {endLabel}
          </label>
          <input
            id={`${baseId}-end`}
            type="date"
            value={currentValue.end}
            min={currentValue.start || props.min}
            onChange={(event) => updateValue("end", event.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800",
              "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
              "disabled:cursor-not-allowed disabled:bg-gray-50",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>
      </div>

      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
