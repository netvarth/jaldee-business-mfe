import { cn } from "../../utils";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  label?:       string;
  className?:   string;
}

export function Divider({ orientation = "horizontal", label, className }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        data-testid="divider"
        className={cn("w-px self-stretch bg-gray-200", className)}
      />
    );
  }

  if (label) {
    return (
      <div
        data-testid="divider"
        className={cn("flex items-center gap-3 my-2", className)}
      >
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    );
  }

  return (
    <div
      data-testid="divider"
      className={cn("h-px bg-gray-200 my-2", className)}
    />
  );
}