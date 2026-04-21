import { Badge, Button, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ReactNode } from "react";
import { mapLeadStatusLabel } from "../utils";

export function StatusBadge({ status }: { status: unknown }) {
  const normalized = String(status ?? "").toUpperCase();
  const variant =
    normalized === "ACTIVE" || normalized === "ENABLED"
      ? "success"
      : normalized === "COMPLETED"
        ? "info"
        : normalized === "REJECTED" || normalized === "DISABLED" || normalized === "INACTIVE"
          ? "danger"
          : "neutral";

  return <Badge variant={variant}>{mapLeadStatusLabel(status)}</Badge>;
}

export function ModulePlaceholder({
  title,
  description,
  backHref,
}: {
  title: string;
  description: string;
  backHref: string;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <EmptyState title={title} description={description} />
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" onClick={() => window.location.assign(backHref)}>
          Back
        </Button>
      </div>
    </SectionCard>
  );
}

export function MetricCard({
  label,
  value,
  accent,
  action,
}: {
  label: string;
  value: string | number;
  accent: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      style={{ borderTopWidth: 4, borderTopColor: accent }}
    >
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
