import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
}

export function SectionCard({ title, subtitle, children, className, headerAction, noPadding }: SectionCardProps) {
  return (
    <div className={cn("erp-card", noPadding && "p-0", className)}>
      {title && (
        <div className={cn("flex items-center justify-between mb-3", noPadding ? " pt-[var(--card-padding)]" : "mb-4")}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn(noPadding && !title && "")}>{children}</div>
    </div>
  );
}
