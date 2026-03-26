import { cn }             from "../../utils";
import { Button }         from "../Button/Button";

export interface BulkAction {
  label:    string;
  onClick:  () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
}

export interface BulkActionBarProps {
  count:    number;
  actions:  BulkAction[];
  onClear:  () => void;
  className?: string;
}

export function BulkActionBar({ count, actions, onClear, className }: BulkActionBarProps) {
  return (
    <div
      data-testid="bulk-action-bar"
      className={cn(
        "flex items-center gap-3 px-4 py-2.5",
        "bg-indigo-50 border border-indigo-200 rounded-lg mb-3",
        className
      )}
    >
      <span className="text-sm font-semibold text-indigo-700">
        {count} selected
      </span>
      <div className="h-4 w-px bg-indigo-200" />
      <div className="flex items-center gap-2 flex-1">
        {actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? "secondary"}
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <button
        onClick={onClear}
        className="text-xs text-indigo-500 hover:text-indigo-700 bg-transparent border-0 cursor-pointer"
        data-testid="bulk-action-clear"
      >
        Clear selection
      </button>
    </div>
  );
}