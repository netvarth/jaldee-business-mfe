import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "../../utils";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  testId?: string;
  containerClassName?: string;
  fullWidth?: string | boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      hint,
      options,
      placeholder,
      id,
      multiple,
      disabled,
      required,
      testId,
      fullWidth = true,
      ...props
    },
    ref
  ) => {
    const fallbackId = label
      ? label.toLowerCase().trim().replace(/\s+/g, "-")
      : "select";

    const selectId = id ?? fallbackId;
    const resolvedTestId = testId ?? selectId;

    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [errorId, !error && hintId].filter(Boolean).join(" ") || undefined;

    const isInvalid = Boolean(error);
    const isMultiple = Boolean(multiple);

    return (
      <div
        className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}
        data-testid={`${resolvedTestId}-field`}
        data-state={isInvalid ? "error" : disabled ? "disabled" : "default"}
      >
        {label && (
          <label htmlFor={selectId} className="ds-select__label">
            {label}
            {required && (
              <span aria-hidden="true" className="ds-select__required">
                *
              </span>
            )}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          multiple={multiple}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          data-testid={resolvedTestId}
          data-state={isInvalid ? "error" : "default"}
          className={cn(
            "ds-select",
            fullWidth && "w-full",
            isMultiple ? "ds-select--multiple min-h-[88px] py-2" : "ds-select--single h-[38px]",
            className
          )}
          {...props}
        >
          {!isMultiple && placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}

          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {hint && !error && (
          <p id={hintId} data-testid={`${resolvedTestId}-hint`} className="ds-select__hint">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            data-testid={`${resolvedTestId}-error`}
            className="ds-select__error"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
