import { forwardRef }                                  from "react";
import type { InputHTMLAttributes, ReactNode }         from "react";
import { cn }                                          from "../../utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?:  string;
  error?:  string;
  hint?:   string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  icon?:   ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-gray-400 pointer-events-none text-sm">
              {icon}
            </span>
          )}
          {prefix && (
            <span className="absolute left-3 text-gray-500 text-sm">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-9 rounded-md border border-gray-200 bg-white text-gray-800 text-sm px-3",
              "placeholder:text-gray-400",
              "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
              "disabled:bg-gray-50 disabled:cursor-not-allowed",
              "transition-colors duration-100",
              error  && "border-red-500 focus:border-red-500 focus:ring-red-500",
              icon   && "pl-9",
              prefix && "pl-8",
              suffix && "pr-8",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-gray-500 text-sm">{suffix}</span>
          )}
        </div>

        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };