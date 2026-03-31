import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, iconColor, iconBg, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn("erp-card flex items-center gap-3", className)}>
      {Icon && (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg || "bg-primary-soft")}>
          <Icon className={cn("h-5 w-5", iconColor || "text-primary")} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
      {trend && (
        <span className={cn("ml-auto text-xs font-medium", trendUp ? "text-success" : "text-destructive")}>
          {trend}
        </span>
      )}
    </div>
  );
}
