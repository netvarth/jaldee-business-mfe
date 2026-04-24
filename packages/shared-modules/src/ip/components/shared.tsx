import type { ReactNode } from "react";
import { cn } from "@jaldee/design-system";

export function StatusPill({
  tone,
  children,
}: {
  tone: "teal" | "sky" | "amber" | "rose" | "slate";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "teal" && "bg-teal-100 text-teal-700",
        tone === "sky" && "bg-sky-100 text-sky-700",
        tone === "amber" && "bg-amber-100 text-amber-700",
        tone === "rose" && "bg-rose-100 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}
