import { cn } from "../../utils";

export interface RadioOption {
  value:    string;
  label:    string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label?:     string;
  options:    RadioOption[];
  value?:     string;
  onChange?:  (value: string) => void;
  error?:     string;
  name:       string;
  className?: string;
}

export function RadioGroup({
  label, options, value, onChange, error, name, className
}: RadioGroupProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} data-testid="radio-group">
      {label && (
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              opt.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange?.(opt.value)}
              className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}