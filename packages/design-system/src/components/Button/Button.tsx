import { forwardRef }             from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn }                     from "../../utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer border-0",
  {
    variants: {
      variant: {
        primary:   "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
        secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200",
        ghost:     "bg-transparent text-gray-500 hover:bg-gray-100",
        danger:    "bg-red-600 text-white hover:bg-red-700",
        outline:   "bg-transparent border border-gray-200 text-gray-700 hover:bg-gray-50",
      },
      size: {
        sm: "h-7  px-3 text-xs",
        md: "h-9  px-4 text-sm",
        lg: "h-11 px-5 text-base",
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
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, iconOnly, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
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