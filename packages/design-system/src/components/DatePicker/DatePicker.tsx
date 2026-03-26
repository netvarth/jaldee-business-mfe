import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../utils";

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type="date"
          className={cn(
            "h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800",
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
