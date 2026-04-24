import type { ReactNode } from "react";
import { cn } from "@jaldee/design-system";

export function DrivePill({
  tone,
  children,
}: {
  tone: "violet" | "sky" | "emerald" | "amber" | "slate";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "violet" && "bg-violet-100 text-violet-700",
        tone === "sky" && "bg-sky-100 text-sky-700",
        tone === "emerald" && "bg-emerald-100 text-emerald-700",
        tone === "amber" && "bg-amber-100 text-amber-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}
