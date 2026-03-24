import { cva, type VariantProps } from "class-variance-authority";
import { cn }                      from "../../utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-0.5",
  {
    variants: {
      variant: {
        success: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-700",
        danger:  "bg-red-100 text-red-600",
        info:    "bg-blue-100 text-blue-700",
        neutral: "bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "success" && "bg-green-500",
          variant === "warning" && "bg-yellow-500",
          variant === "danger"  && "bg-red-500",
          variant === "info"    && "bg-blue-500",
          variant === "neutral" && "bg-gray-400",
        )} />
      )}
      {children}
    </span>
  );
}