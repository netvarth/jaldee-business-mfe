import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DataTable,
  DataTablePagination,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
} from "@jaldee/design-system";
import type { PageHeaderProps } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { FinancePageHeader } from "./FinancePageHeader";

type Accent = "indigo" | "emerald" | "amber" | "rose";

interface QuickAction {
  label: string;
  path: string;
  icon: "packagePlus" | "alert" | "trend" | "history" | "globe" | "list" | "layers" | "chart" | "database" | "warehouse";
  tone: string;
  note: string;
}

type FinanceGridView = "table" | "cards";

export function FinanceFilterButton({
  testId,
  label = "Filter",
  onClick,
  active = false,
}: {
  testId: string;
  label?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "outline"}
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      className={
        active
          ? "h-10 px-4 text-sm font-semibold"
          : "h-10 border-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
      }
      icon={
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[2.2]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
      }
    >
      {label}
    </Button>
  );
}

function FinanceGridViewToggle({
  value,
  onChange,
  testId,
}: {
  value: FinanceGridView;
  onChange: (value: FinanceGridView) => void;
  testId: string;
}) {
  return (
    <div className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      {(["table", "cards"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          data-testid={`${testId}-view-${mode}`}
          onClick={() => onChange(mode)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border-0 ${
            value === mode ? "bg-[var(--color-primary)] text-white" : "bg-transparent text-[var(--color-text-secondary)]"
          }`}
          aria-label={`${mode === "table" ? "Table" : "Card"} view`}
          title={`${mode === "table" ? "Table" : "Card"} view`}
        >
          {mode === "table" ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
          )}
        </button>
      ))}
    </div>
  );
}

function FinanceListToolbar({
  leading,
  actions,
  viewMode,
  onViewModeChange,
  testId,
}: {
  leading?: ReactNode;
  actions?: ReactNode;
  viewMode: FinanceGridView;
  onViewModeChange: (value: FinanceGridView) => void;
  testId: string;
}) {
  return (
    <div className="border-b border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] px-4 py-4" data-testid={`${testId}-toolbar`}>
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${leading ? "sm:justify-between" : "sm:justify-end"}`}>
        {leading}
        <div className="flex items-center justify-end gap-3">
          {actions}
          <FinanceGridViewToggle value={viewMode} onChange={onViewModeChange} testId={testId} />
        </div>
      </div>
    </div>
  );
}

function FinanceCardGrid<T extends object>({
  data,
  columns,
  getRowId,
  emptyTitle,
  emptyDescription,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const visibleColumns = columns.filter((column) => !column.hidden && column.key !== "actions").slice(0, 6);
  if (!data.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((row) => (
        <div key={getRowId(row)} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="space-y-3">
            {visibleColumns.map((column, index) => (
              <div key={String(column.key)} className={index === 0 ? "" : "flex items-start justify-between gap-4"}>
                <div className={index === 0 ? "text-base font-semibold text-[var(--color-text)]" : "text-xs font-medium text-[var(--color-text-secondary)]"}>
                  {index === 0 ? null : column.header}
                </div>
                <div className={index === 0 ? "text-base font-semibold text-[var(--color-text)]" : "text-sm text-right text-[var(--color-text)]"}>
                  {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "-")}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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
  back,
  onNavigate,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  back?: PageHeaderProps["back"];
  onNavigate?: PageHeaderProps["onNavigate"];
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 bg-transparent px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-5">
        <FinancePageHeader title={title} subtitle={subtitle} actions={actions} back={back} onNavigate={onNavigate} />
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
  back,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: string; accent: Accent }>;
  main: ReactNode;
  aside?: ReactNode;
  back?: PageHeaderProps["back"];
}) {
  return (
    <PageShell title={title} subtitle={subtitle} actions={actions} back={back}>
      {stats && stats.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
          ))}
        </div>
      ) : null}

      <div className={`grid min-w-0 gap-6 ${aside ? "xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]" : ""}`}>
        <div className="min-w-0 space-y-6">{main}</div>
        {aside ? <div className="min-w-0 space-y-6">{aside}</div> : null}
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
          className="flex min-h-[92px] w-[110px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary-muted)] hover:shadow-md"
        >
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.tone}`}>
            <Icon name={action.icon} className="h-4 w-4" />
          </div>
          <div className="mt-3 w-full text-center text-xs font-semibold leading-4 text-slate-900">{action.label}</div>
        </button>
      ))}
    </div>
  );
}

export function DataTableCard<T extends object>({
  title,
  subtitle,
  actions,
  bare = false,
  data,
  columns,
  emptyTitle,
  emptyDescription,
  getRowId,
  loading = false,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  bare?: boolean;
  data: T[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
  emptyDescription: string;
  getRowId: (row: T) => string;
  loading?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<FinanceGridView>("table");
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleData = data.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const content = (
    <>
      <FinanceListToolbar
        leading={title || subtitle ? (
          <div>
          {title ? <div className="text-[22px] font-semibold text-slate-900">{title}</div> : null}
          {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>
        ) : undefined}
        actions={actions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        testId="finance-data"
      />
      {viewMode === "table" ? <DataTable
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
        className="rounded-none border-0 bg-transparent shadow-none"
        tableClassName="!w-max min-w-full !table-auto [&_thead_tr]:border-[var(--color-border)] [&_tbody_tr]:border-[var(--color-border)] [&_thead_th]:h-12 [&_thead_th]:whitespace-nowrap [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-3 [&_tbody_td]:whitespace-nowrap"
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      /> : (
        <>
          <FinanceCardGrid data={visibleData} columns={columns} getRowId={getRowId} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
          <DataTablePagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}
    </>
  );

  return bare ? content : <SectionCard className="w-full min-w-0 max-w-full overflow-hidden border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>{content}</SectionCard>;
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
        <div className="text-lg font-bold text-[var(--color-text-primary)]">{title}</div>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition">
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

export function ServerDataTableCard<T extends object>({
  title,
  actions,
  data,
  columns,
  emptyTitle,
  emptyDescription,
  getRowId,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  testId,
}: {
  title?: string;
  actions?: ReactNode;
  data: T[];
  columns: ColumnDef<T>[];
  emptyTitle: string;
  emptyDescription: string;
  getRowId: (row: T) => string;
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  testId: string;
}) {
  const [viewMode, setViewMode] = useState<FinanceGridView>("table");

  return (
    <SectionCard
      className="w-full min-w-0 max-w-full overflow-hidden border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm"
      padding={false}
    >
      <FinanceListToolbar
        leading={title ? <div className="text-[22px] font-semibold text-slate-900">{title}</div> : undefined}
        actions={actions}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        testId={testId}
      />
      {viewMode === "table" ? <DataTable
        data={data}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        data-testid={testId}
        pagination={{
          page,
          pageSize,
          total,
          onChange: onPageChange,
          onPageSizeChange,
          mode: "server",
        }}
        className="rounded-none border-0 bg-transparent shadow-none"
        tableClassName="!w-max min-w-full !table-auto [&_thead_tr]:border-[var(--color-border)] [&_tbody_tr]:border-[var(--color-border)] [&_thead_th]:h-12 [&_thead_th]:whitespace-nowrap [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
        emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
      /> : (
        <div className="p-4">
          <FinanceCardGrid data={data} columns={columns} getRowId={getRowId} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
          <DataTablePagination page={page} pageSize={pageSize} total={total} onChange={onPageChange} onPageSizeChange={onPageSizeChange} controlTestIdPrefix={`${testId}-cards`} />
        </div>
      )}
    </SectionCard>
  );
}
