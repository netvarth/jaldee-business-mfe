import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface ErrorStateProps {
  title:        string;
  description?: string;
  action?:      ReactNode;
  className?:   string;
}

export function ErrorState({ title, description, action, className }: ErrorStateProps) {
  return (
    <div
      data-testid="error-state"
      data-state="error"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      <div className="text-4xl mb-4 text-red-300">⚠</div>
      <h3 className="m-0 text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      {description && (
        <p className="m-0 text-sm text-gray-500 mb-6 max-w-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}