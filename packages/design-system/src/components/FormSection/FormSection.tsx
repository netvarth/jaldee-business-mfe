import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface FormSectionProps {
  title:        string;
  description?: string;
  children:     ReactNode;
  className?:   string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div
      data-testid="form-section"
      className={cn("space-y-4", className)}
    >
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 m-0">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 m-0">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}