import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";

type Accent = "indigo" | "emerald" | "amber" | "rose";

interface QuickAction {
  label: string;
  path: string;
  icon: "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";
  tone: string;
  note: string;
}

function toFinanceRoute(routePath: string) {
  const normalized = String(routePath || "").trim();
  if (!normalized) return "/";
  const stripped = normalized.replace(/^\/finance(?=\/|$)/, "");
  return stripped || "/";
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
        {children}
      </div>
    </div>
  );
}

export function FinanceFeatureLayout({
  title,
  subtitle,
  actions,
  stats,
  main,
  aside,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: string; accent: Accent }>;
  main: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <PageShell title={title} subtitle={subtitle} actions={actions}>
      {stats && stats.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
          ))}
        </div>
      ) : null}

      <div className={`grid gap-6 ${aside ? "xl:grid-cols-[1.45fr_0.85fr]" : ""}`}>
        <div className="space-y-6">{main}</div>
        {aside ? <div className="space-y-6">{aside}</div> : null}
      </div>
    </PageShell>
  );
}

export function QuickActions({
  actions,
}: {
  actions: QuickAction[];
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => navigate(toFinanceRoute(action.path))}
          className="min-h-[92px] w-[110px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.tone}`}>
            <Icon name={action.icon} className="h-4 w-4" />
          </div>
          <div className="mt-3 text-xs font-semibold leading-4 text-slate-900">{action.label}</div>
        </button>
      ))}
    </div>
  );
}

export function DataTableCard<T extends object>({
  title,
  subtitle,
  actions,
  data,
  columns,
  emptyTitle,
  emptyDescription,
  getRowId,
  loading = false,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  data: T[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
  emptyDescription: string;
  getRowId: (row: T) => string;
  loading?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[22px] font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>
        {actions}
      </div>
      <DataTable
        data={data}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        pagination={{
          page,
          pageSize,
          total,
          onChange: setPage,
          onPageSizeChange: setPageSize,
          mode: "client",
        }}
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
    </SectionCard>
  );
}

export function FeedCard({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[22px] font-semibold text-slate-900">{title}</div>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="text-base font-semibold text-indigo-700">
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </SectionCard>
  );
}

export function SummaryList({
  rows,
}: {
  rows: Array<{ label: string; value: string; note?: string }>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{row.label}</div>
              {row.note ? <div className="mt-1 text-sm text-slate-500">{row.note}</div> : null}
            </div>
            <div className="text-base font-semibold text-slate-900">{row.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
