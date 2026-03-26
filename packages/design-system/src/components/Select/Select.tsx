import { forwardRef } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../../utils";

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
        className={cn("flex w-full flex-col gap-1.5", containerClassName)}
        data-testid={`${resolvedTestId}-field`}
        data-state={isInvalid ? "error" : disabled ? "disabled" : "default"}
      >
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {label}
            {required && (
              <span
                aria-hidden="true"
                className="ml-0.5"
                style={{ color: "var(--color-danger)" }}
              >
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
            "w-full rounded-md border bg-[var(--color-surface)] px-3 text-sm transition-colors duration-100",
            isMultiple ? "min-h-[88px] py-2" : "h-9",
            "focus:outline-none focus:ring-1",
            "disabled:cursor-not-allowed disabled:opacity-60",
            !disabled && "cursor-pointer",
            className
          )}
          style={{
            color: "var(--color-text-primary)",
            borderColor: isInvalid
              ? "var(--color-danger)"
              : "var(--color-border)",
            boxShadow: "none",
          }}
          {...props}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = isInvalid
              ? "var(--color-danger)"
              : "var(--color-border-focus)";
            e.currentTarget.style.boxShadow = `0 0 0 1px ${
              isInvalid ? "var(--color-danger)" : "var(--color-border-focus)"
            }`;
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = isInvalid
              ? "var(--color-danger)"
              : "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
            props.onBlur?.(e);
          }}
        >
          {!isMultiple && placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}

          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>

        {hint && !error && (
          <p
            id={hintId}
            data-testid={`${resolvedTestId}-hint`}
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            data-testid={`${resolvedTestId}-error`}
            className="text-xs"
            style={{ color: "var(--color-danger)" }}
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