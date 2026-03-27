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
  containerClassName?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, label, error, hint, prefix, suffix, icon, id, fullWidth = true, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]"
          >
            {label}
          </label>
        )}

        <div className={cn("relative flex items-center", fullWidth && "w-full")}>
          {icon && (
            <span className="absolute left-3 text-[var(--color-text-disabled)] pointer-events-none text-sm">
              {icon}
            </span>
          )}
          {prefix && (
            <span className="absolute left-3 text-[var(--color-text-secondary)] text-sm">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              fullWidth && "block w-full",
              "min-h-[44px] px-[10px] py-[10px] text-left text-[var(--text-base)] leading-normal align-middle",
              "rounded-[10px] border bg-[var(--color-surface)] text-[var(--color-text-primary)]",
              "border-[#cfd6e4] placeholder:text-[var(--color-text-disabled)]",
              "focus:outline-none focus:border-[#b9c3d8] focus:ring-0",
              "disabled:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed",
              "transition-colors duration-100",
              error  && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-0",
              icon   && "pl-10",
              prefix && "pl-10",
              suffix && "pr-10",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-[var(--color-text-secondary)] text-sm">{suffix}</span>
          )}
        </div>

        {hint && !error && (
          <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
