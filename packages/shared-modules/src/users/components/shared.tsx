import type { ReactNode } from "react";
import { Avatar, Badge, PageHeader, cn } from "@jaldee/design-system";

export function UsersPageShell({
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
    <div className="w-full space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
        back={onBack ? { label: "Back", href: "#back" } : undefined}
        onNavigate={() => onBack?.()}
      />
      {children}
    </div>
  );
}

export function UserAvatar({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} size="md" />
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-900">{name}</div>
        {subtitle ? <div className="truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function UserStatusBadge({ status }: { status?: string }) {
  const normalized = (status || "UNKNOWN").toUpperCase();
  const variant =
    normalized === "ACTIVE" ? "success" : normalized === "INACTIVE" ? "danger" : "neutral";

  return <Badge variant={variant}>{normalized}</Badge>;
}

export function AvailabilityPill({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
      )}
    >
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

export function UsersStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "violet" | "amber" | "orange";
}) {
  return (
    <div className="flex min-w-[180px] items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg",
          tone === "violet" && "bg-violet-500 text-white",
          tone === "amber" && "bg-amber-400 text-white",
          tone === "orange" && "bg-orange-500 text-white"
        )}
      >
        <UsersNodesGlyph />
      </div>
      <div>
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-3xl font-semibold leading-none text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export function UsersNodesGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.3 10.8 15.7 7.2" />
      <path d="M8.3 13.2 15.7 16.8" />
    </svg>
  );
}

export function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function FunnelGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M3 5h18l-7 8v5.5a1 1 0 0 1-.4.8l-2.8 2.1a.75.75 0 0 1-1.2-.6V13L3 5Z" />
    </svg>
  );
}
