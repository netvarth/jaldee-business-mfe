import type { HTMLAttributes } from "react";
import { cn } from "../../utils";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "md" | "lg" | "xl" | "2xl";
  gutters?: boolean;
}

const sizes = { md: "max-w-4xl", lg: "max-w-6xl", xl: "max-w-7xl", "2xl": "max-w-[1536px]" };

export function Container({ size = "xl", gutters = true, className, ...props }: ContainerProps) {
  return <div className={cn("mx-auto w-full", sizes[size], gutters && "px-4 sm:px-6 lg:px-8", className)} {...props} />;
}
