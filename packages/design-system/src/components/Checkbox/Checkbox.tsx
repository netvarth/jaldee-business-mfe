import { forwardRef }                           from "react";
import type { InputHTMLAttributes, ReactNode }  from "react";
import { cn }                                   from "../../utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?:     ReactNode;
  error?:     string;
  description?: ReactNode;
  containerClassName?: string;
  controlClassName?: string;
  labelClassName?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      error,
      description,
      containerClassName,
      controlClassName,
      labelClassName,
      id,
      ...props
    },
    ref
  ) => {
    const checkboxId =
      id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className={cn("flex flex-col gap-1", containerClassName)}>
        <div className={cn("flex items-center gap-2", controlClassName)}>
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              "w-4 h-4 rounded border-gray-300 text-indigo-600",
              "focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
              "cursor-pointer",
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn("text-[var(--form-label-size)] leading-[var(--form-label-line-height)] font-[var(--form-label-weight)] text-[var(--color-text-primary)] cursor-pointer select-none", labelClassName)}
            >
              {label}
            </label>
          )}
        </div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
export { Checkbox };
