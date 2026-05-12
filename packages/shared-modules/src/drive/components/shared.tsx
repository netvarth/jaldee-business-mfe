import type { ReactNode } from "react";
import { PageHeader, cn } from "@jaldee/design-system";

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

export function openDriveFile(filePath?: string) {
  if (!filePath || typeof window === "undefined") return;
  window.open(filePath, "_blank", "noopener,noreferrer");
}

export function DrivePageShell({
  title,
  subtitle,
  onBack,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <PageHeader
        actions={actions}
        back={onBack ? { label: "Back", href: "#back" } : undefined}
        onNavigate={() => onBack?.()}
        subtitle={subtitle}
        title={title}
      />
      {children}
    </div>
  );
}

export function FolderGlyph({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block h-16 w-24 shrink-0 rounded-md bg-[#ffd45a] shadow-sm ring-1 ring-amber-200",
        className
      )}
    >
      <span className="absolute -top-[18%] left-0 h-[34%] w-[38%] rounded-t-[inherit] bg-[#ffd45a] ring-1 ring-amber-200" />
      <span className="absolute left-0 top-[8%] h-[20%] w-full rounded-t-[inherit] bg-[#ffe38f]/80" />
    </span>
  );
}

export function FileGlyph({ fileType }: { fileType?: string }) {
  const label = (fileType || "file").toLowerCase().includes("pdf") ? "PDF" : "FILE";
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border px-1 text-[9px] font-bold",
        label === "PDF" ? "border-red-500 text-red-600" : "border-slate-400 text-slate-500"
      )}
    >
      {label}
    </span>
  );
}
