import type { HTMLAttributes, ReactNode } from "react";
import { cn }             from "../../utils";

export interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title?:     string;
  actions?:   ReactNode;
  children:   ReactNode;
  className?: string;
  padding?:   boolean;
}

export function SectionCard({
  title, actions, children, className, padding = true, ...rest
}: SectionCardProps) {
  const testId = (rest as { "data-testid"?: string })["data-testid"] ?? "section-card";

  return (
    <div
      {...rest}
      data-testid={testId}
      className={cn(
        "min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
          {title && (
            <h3 className="min-w-0 text-sm font-semibold text-gray-800 m-0">{title}</h3>
          )}
          {actions && (
            <div data-testid="section-card-actions" className="flex min-w-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={padding ? "min-w-0 p-4" : "min-w-0"}>{children}</div>
    </div>
  );
}
