import { cn } from "../../utils";

export interface SwitchProps {
  label?:     string;
  checked:    boolean;
  onChange:   (checked: boolean) => void;
  disabled?:  boolean;
  className?: string;
}

export function Switch({ label, checked, onChange, disabled, className }: SwitchProps) {
  return (
    <label
      data-testid="switch"
      className={cn(
        "flex items-center gap-3 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          checked ? "bg-indigo-600" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
      {label && (
        <span className="ds-form-label select-none">{label}</span>
      )}
    </label>
  );
}
