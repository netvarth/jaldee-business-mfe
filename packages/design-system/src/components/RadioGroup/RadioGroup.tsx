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
  className?: string;
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
  className,
  optionClassName,
  indicatorClassName,
  labelClassName,
}: RadioGroupProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid="radio-group">
      {label && (
        <span className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]">{label}</span>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-start gap-2 cursor-pointer",
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
                "w-4 h-4 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 mt-0.5",
                indicatorClassName
              )}
            />
            <span className={cn("text-sm text-gray-700", labelClassName)}>
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
