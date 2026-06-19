import { forwardRef }                              from "react";
import type { TextareaHTMLAttributes }             from "react";
import { cn }                                      from "../../utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:  string;
  error?:  string;
  hint?:   string;
  fullWidth?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, fullWidth = true, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={textareaId}
            className="ds-form-label"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            fullWidth && "w-full",
            "rounded-[var(--radius-control)] border px-[var(--control-padding-x)] py-[var(--control-padding-y)] text-[length:var(--text-sm)] leading-normal",
            "bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] text-[var(--color-text-primary)]",
            "border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] placeholder:text-[var(--color-text-secondary)] resize-y",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
            "focus:outline-none focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]",
            "disabled:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed",
            "transition-colors duration-100",
            error && "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-0",
            className
          )}
          aria-invalid={!!error}
          {...props}
        />
        {hint && !error && <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">{hint}</p>}
        {error && <p role="alert" className="text-[length:var(--text-xs)] text-[var(--color-danger)]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export { Textarea };
