import type { ReactNode } from "react";
import { cn } from "../../utils";

export interface RadioOption {
  value:    string;
  label:    ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface RadioGroupProps {
  label?:     ReactNode;
  options:    RadioOption[];
  value?:     string;
  onChange?:  (value: string) => void;
  error?:     string;
  name:       string;
  variant?:   "default" | "segmented";
  className?: string;
  optionsClassName?: string;
  optionClassName?: string;
  indicatorClassName?: string;
  labelClassName?: string;
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  error,
  name,
  variant = "default",
  className,
  optionsClassName,
  optionClassName,
  indicatorClassName,
  labelClassName,
}: RadioGroupProps) {
  const isSegmented = variant === "segmented";

  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid="radio-group">
      {label && (
        <span className="ds-form-label">{label}</span>
      )}
      <div
        className={cn(
          isSegmented
            ? "flex rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1"
            : "flex flex-col gap-2",
          optionsClassName
        )}
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              isSegmented
                ? "flex min-w-0 flex-1 cursor-pointer items-center justify-center"
                : "flex items-start gap-2 cursor-pointer",
              opt.disabled && "opacity-50 cursor-not-allowed",
              optionClassName,
              opt.className
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange?.(opt.value)}
              className={cn(
                isSegmented
                  ? "sr-only"
                  : "w-4 h-4 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 mt-0.5",
                indicatorClassName
              )}
            />
            <span
              className={cn(
                isSegmented
                  ? cn(
                      "block w-full rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-center text-[length:var(--text-sm)] font-semibold transition-colors",
                      value === opt.value
                        ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm ring-1 ring-[var(--color-border)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[color:color-mix(in_srgb,var(--color-surface)_55%,transparent)] hover:text-[var(--color-text-primary)]"
                    )
                  : "text-sm text-gray-700",
                labelClassName
              )}
            >
              <span className="block">{opt.label}</span>
              {opt.description && (
                <span className="mt-0.5 block text-xs text-gray-500">{opt.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
