import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  muted: "bg-muted text-muted-foreground",
};

const statusVariantMap: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  IN_STOCK: "success",
  CONFIRMED: "info",
  COMPLETED: "success",
  CLOSED: "success",
  FULLY_INVOICED: "success",
  RECEIVED: "success",
  RESERVED: "warning",
  PENDING_TAG_ASSIGNMENT: "warning",
  PARTIALLY_INVOICED: "warning",
  DISPATCHED: "info",
  DRAFT: "muted",
  INACTIVE: "muted",
  SOLD: "default",
  RETURNED: "danger",
  CANCELLED: "danger",
  TRANSFERRED: "info",
  GRN_CREATED: "info",
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant || statusVariantMap[status] || "muted";
  const displayStatus = status.replace(/_/g, " ");

  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", variantClasses[resolvedVariant], className)}>
      {displayStatus}
    </span>
  );
}
