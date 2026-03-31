import { cn } from "@/lib/utils";
import { getGoldErpAssetUrl } from "@/lib/gold-erp-utils";

interface EmptyStateBlockProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  imageType?: "data" | "chart";
}

export function EmptyStateBlock({ icon, title, description, action, className, imageType = "data" }: EmptyStateBlockProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <img
        src={getGoldErpAssetUrl(imageType === "chart" ? "analytics.gif" : "noData.png")}
        alt={imageType === "chart" ? "No chart data" : "No data"}
        className="mb-4 h-28 w-auto object-contain opacity-90"
      />
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
