import { cn } from "../../utils";

export interface TabItem {
  value:     string;
  label:     string;
  disabled?: boolean;
  count?:    number;
}

export interface TabsProps {
  value:         string;
  onValueChange: (value: string) => void;
  items:         TabItem[];
  className?:    string;
}

export function Tabs({ value, onValueChange, items, className }: TabsProps) {
  return (
    <div
      data-testid="tabs"
      role="tablist"
      className={cn(
        "flex border-b border-gray-200 gap-0",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          data-testid={`tab-${item.value}`}
          data-active={value === item.value}
          aria-selected={value === item.value}
          disabled={item.disabled}
          onClick={() => !item.disabled && onValueChange(item.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
            "border-b-2 -mb-px transition-colors duration-150",
            "cursor-pointer bg-transparent border-x-0 border-t-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            value === item.value
              ? "border-b-indigo-600 text-indigo-600"
              : "border-b-transparent text-gray-500 hover:text-gray-700 hover:border-b-gray-300",
            item.disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-xs font-semibold",
              value === item.value
                ? "bg-indigo-100 text-indigo-600"
                : "bg-gray-100 text-gray-500"
            )}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}