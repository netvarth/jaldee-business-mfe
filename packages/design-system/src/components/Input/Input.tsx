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
            className="text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)]"
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
              "min-h-[38px] px-4 py-2 text-left text-[var(--text-sm)] leading-normal align-middle",
              "rounded-[var(--radius-control)] border bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] text-[var(--color-text-primary)]",
              "border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] placeholder:text-[var(--color-text-secondary)]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
              "focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]",
              "disabled:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed",
              "transition-colors duration-100",
              error  && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-0",
              icon   && "pl-11",
              prefix && "pl-11",
              suffix && "pr-11",
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
