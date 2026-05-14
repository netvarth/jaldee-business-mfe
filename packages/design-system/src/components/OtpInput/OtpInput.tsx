import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "../../utils";

export interface OtpInputProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  testId?: string;
  className?: string;
  containerClassName?: string;
  fullWidth?: boolean;
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

export function OtpInput({
  id,
  label,
  error,
  hint,
  required,
  disabled,
  testId,
  className,
  containerClassName,
  fullWidth = true,
  length = 6,
  value,
  onChange,
}: OtpInputProps) {
  const reactId = useId();
  const fieldId = useMemo(
    () => id ?? label?.toLowerCase().trim().replace(/\s+/g, "-") ?? `otp-input-${reactId.replace(/:/g, "")}`,
    [id, label, reactId]
  );
  const resolvedTestId = testId ?? fieldId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, !error && hintId].filter(Boolean).join(" ") || undefined;
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => {
    const clean = value.replace(/\D/g, "").slice(0, length);
    return Array.from({ length }, (_, index) => clean[index] ?? "");
  }, [length, value]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  function focusIndex(index: number) {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  }

  function commit(nextDigits: string[]) {
    onChange(nextDigits.join(""));
  }

  function handleChange(index: number, rawValue: string) {
    const sanitized = rawValue.replace(/\D/g, "");
    if (!sanitized) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      commit(nextDigits);
      return;
    }

    const nextDigits = [...digits];
    const incomingDigits = sanitized.slice(0, length);
    incomingDigits.split("").forEach((digit, offset) => {
      const targetIndex = index + offset;
      if (targetIndex < length) {
        nextDigits[targetIndex] = digit;
      }
    });
    commit(nextDigits);

    const nextFocusIndex = Math.min(index + incomingDigits.length, length - 1);
    focusIndex(nextFocusIndex);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) {
      return;
    }

    const nextDigits = Array.from({ length }, (_, index) => pasted[index] ?? "");
    commit(nextDigits);
    focusIndex(Math.min(pasted.length - 1, length - 1));
  }

  return (
    <div
      className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}
      data-testid={`${resolvedTestId}-field`}
      data-state={error ? "error" : disabled ? "disabled" : "default"}
    >
      {label ? (
        <label htmlFor={`${fieldId}-digit-0`} className="ds-form-label">
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}

      <div className={cn("flex justify-center gap-3", fullWidth && "w-full")}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            id={`${fieldId}-digit-${index}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={label ? `${label} digit ${index + 1}` : `OTP digit ${index + 1}`}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            data-testid={`${resolvedTestId}-digit-${index}`}
            maxLength={1}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={cn(
              "h-12 w-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] outline-none transition-all focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-border-focus)]/20",
              error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20",
              className
            )}
          />
        ))}
      </div>

      {hint && !error ? (
        <p id={hintId} data-testid={`${resolvedTestId}-hint`} className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" data-testid={`${resolvedTestId}-error`} className="text-[length:var(--text-xs)] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
