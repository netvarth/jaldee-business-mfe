import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface SectionCardProps {
  title?:     string;
  actions?:   ReactNode;
  children:   ReactNode;
  className?: string;
  padding?:   boolean;
}

export function SectionCard({
  title, actions, children, className, padding = true
}: SectionCardProps) {
  return (
    <div
      data-testid="section-card"
      className={cn(
        "bg-white rounded-lg border border-gray-200 overflow-hidden",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          {title && (
            <h3 className="text-sm font-semibold text-gray-800 m-0">{title}</h3>
          )}
          {actions && (
            <div data-testid="section-card-actions" className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={padding ? "p-4" : ""}>{children}</div>
    </div>
  );
}