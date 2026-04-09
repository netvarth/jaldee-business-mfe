import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface EmptyStateProps {
  icon?:        ReactNode;
  title:        string;
  description?: string;
  action?:      ReactNode;
  className?:   string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      data-state="empty"
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="text-4xl mb-4 text-gray-300">{icon}</div>
      )}
      <h3 className="m-0 mb-2 text-[length:var(--text-sm)] font-semibold text-gray-800">{title}</h3>
      {description && (
        <p className="m-0 mb-6 max-w-xs text-[length:var(--text-sm)] text-gray-500">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
