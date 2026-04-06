import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils";

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, hint, id, fullWidth = true, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={inputId} className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]">
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type="date"
          className={cn(
            fullWidth && "w-full",
            "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800",
            "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:bg-gray-50",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />

        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";
export { DatePicker };
