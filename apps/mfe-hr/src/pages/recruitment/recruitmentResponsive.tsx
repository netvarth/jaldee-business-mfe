import { useEffect, useState, type ReactNode } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@jaldee/design-system";

export type RecruitmentViewMode = "table" | "cards";

export function getPreferredRecruitmentViewMode() {
  if (typeof window === "undefined") return "table" as RecruitmentViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

export function useRecruitmentResponsiveViewMode() {
  const [viewMode, setViewMode] = useState<RecruitmentViewMode>(() => getPreferredRecruitmentViewMode());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => setViewMode(media.matches ? "cards" : "table");
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  return [viewMode, setViewMode] as const;
}

export function RecruitmentViewToggle({
  value,
  onChange,
  tableTestId,
  cardsTestId,
}: {
  value: RecruitmentViewMode;
  onChange: (value: RecruitmentViewMode) => void;
  tableTestId: string;
  cardsTestId: string;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-[3px] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-[3px]">
      <button
        type="button"
        data-testid={tableTestId}
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-[7px] border-0",
          value === "table"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-transparent text-[var(--color-text-secondary)]"
        )}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={14} />
      </button>
      <button
        type="button"
        data-testid={cardsTestId}
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-[7px] border-0",
          value === "cards"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-transparent text-[var(--color-text-secondary)]"
        )}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );
}

export function RecruitmentMobileCard({
  title,
  rows,
  footer,
}: {
  title: ReactNode;
  rows: Array<{ label: string; value: ReactNode }>;
  footer?: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
      <div className="grid gap-2.5">
        {rows.map((row) => (
          <div key={String(row.label)} className="flex items-start justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              {row.label}
            </span>
            <div className="text-right text-sm font-medium text-[var(--color-text-primary)]">
              {row.value}
            </div>
          </div>
        ))}
      </div>
      {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
    </div>
  );
}
