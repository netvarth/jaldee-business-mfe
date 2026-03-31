import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QuickActionTileProps {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function QuickActionTile({ label, icon: Icon, onClick, iconColor, iconBg, className }: QuickActionTileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-full w-full flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 transition-all",
        "hover:shadow-sm hover:border-primary/30 hover:bg-primary-soft/50",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        "min-h-[86px]",
        className
      )}
    >
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", iconBg || "bg-primary-soft")}>
        <Icon className={cn("h-4 w-4", iconColor || "text-primary")} />
      </div>
      <span className="text-[11px] whitespace-nowrap font-medium text-foreground text-center leading-tight">{label}</span>
    </button>
  );
}
