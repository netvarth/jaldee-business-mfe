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
            "rounded-[var(--radius-control)] border border-gray-200 bg-white text-gray-800 text-sm px-3 py-2",
            "placeholder:text-gray-400 resize-y",
            "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
            "disabled:bg-gray-50 disabled:cursor-not-allowed",
            "transition-colors duration-100",
            error && "border-red-500",
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

Textarea.displayName = "Textarea";
export { Textarea };
