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
        "cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="focus:outline-none"
        style={{
          position: "relative",
          width: "40px",
          minWidth: "40px",
          height: "24px",
          flexShrink: 0,
          appearance: "none",
          border: 0,
          borderRadius: "9999px",
          padding: 0,
          margin: 0,
          background: checked ? "#4F46E5" : "#E5E7EB",
          transition: "background-color 200ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: "2px",
            width: "20px",
            height: "20px",
            borderRadius: "9999px",
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.2)",
            transform: checked ? "translateX(16px)" : "translateX(0)",
            transition: "transform 200ms ease",
          }}
        />
      </button>
      {label && (
        <span
          style={{
            minWidth: 0,
            fontSize: "15px",
            fontWeight: 600,
            lineHeight: 1.4,
            color: "#334155",
            userSelect: "none",
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
}
