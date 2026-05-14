import { useEffect, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { DatePicker } from "../DatePicker/DatePicker";
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
      {label ? (
        <label className="ds-form-label">
          {label}
        </label>
      ) : null}

      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-start`} className="text-xs font-medium text-gray-500">
            {startLabel}
          </label>
          <DatePicker
            id={`${baseId}-start`}
            value={currentValue.start}
            onChange={(event) => updateValue("start", event.target.value)}
            aria-invalid={!!error}
            {...props}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-end`} className="text-xs font-medium text-gray-500">
            {endLabel}
          </label>
          <DatePicker
            id={`${baseId}-end`}
            value={currentValue.end}
            min={currentValue.start || props.min}
            onChange={(event) => updateValue("end", event.target.value)}
            aria-invalid={!!error}
            {...props}
          />
        </div>
      </div>

      {hint && !error ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
