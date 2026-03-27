import { forwardRef }             from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn }                     from "../../utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer border-0",
  {
    variants: {
      variant: {
        primary:   "bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
        secondary: "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] border border-[var(--color-border)]",
        ghost:     "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)]",
        link:      "bg-transparent text-[var(--color-text-link)] hover:bg-transparent hover:underline underline-offset-4 shadow-none",
        danger:    "bg-[var(--color-danger)] text-[var(--color-primary-text)] hover:opacity-90",
        outline:   "bg-transparent border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)]",
      },
      size: {
        sm: "h-7  px-3 text-xs",
        md: "h-9  px-4 text-sm",
        lg: "h-11 px-5 text-base",
        inline: "h-auto px-0 py-0 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size:    "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?:  boolean;
  iconOnly?: boolean;
  icon?:     React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, iconOnly, children, disabled, fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), fullWidth && "w-full", className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span>⟳</span>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {!iconOnly && children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button, buttonVariants };
