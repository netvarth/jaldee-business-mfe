import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Search, ShieldCheck } from "lucide-react";
import { Button, DataTable, Dialog, DialogFooter, Drawer, EmptyState, Input, SectionCard, type ColumnDef } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { SchemaFilterBuilder, buildDefaultSearchClauses, compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useHrApi } from "../../services/useHrApi";
import { useHrSearchSchema } from "../../services/useHrSearchSchema";
import { formatDateTime } from "../../lib/utils";

type AuditRecord = Record<string, unknown> & { id?: string; uid?: string };

const CONTEXT_OPTIONS = [
  { label: "All HR Operations", value: "ALL" },
  { label: "Employees", value: "EMPLOYEE" },
  { label: "Attendance", value: "ATTENDANCE" },
  { label: "Leave", value: "LEAVE" },
  { label: "Payroll", value: "PAYROLL" },
  { label: "Recruitment", value: "RECRUITMENT" },
];

function value(record: AuditRecord, keys: string[], fallback = "-") {
  for (const key of keys) {
    const candidate = record[key];
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) return String(candidate);
  }
  return fallback;
}

function dateLabel(record: AuditRecord) {
  const raw = value(record, ["updatedAt", "createdAt", "timestamp", "eventTime"], "");
  return formatDateTime(raw) || "-";
}

function humanize(raw: string) {
  return raw
    .replace(/Auditlog$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionStyle(action: string) {
  const normalized = action.toUpperCase();
  if (normalized === "DELETE") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "CREATE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function unwrapPage(response: unknown) {
  const envelope = (response as { data?: unknown })?.data ?? response;
  const body = (envelope as { data?: unknown })?.data ?? envelope;
  const candidate = body as { content?: unknown[]; items?: unknown[]; results?: unknown[]; totalElements?: number; total?: number; page?: { totalElements?: number } };
  const rows = Array.isArray(body) ? body : candidate.content ?? candidate.items ?? candidate.results ?? [];
  const total = candidate.page?.totalElements ?? candidate.totalElements ?? candidate.total ?? rows.length;
  return { rows: rows as AuditRecord[], total: Number(total) || 0 };
}

export default function AuditLogs() {
  const api = useHrApi();
  const [rows, setRows] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [context, setContext] = useState("ALL");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [selected, setSelected] = useState<AuditRecord | null>(null);
  const { schema, loading: schemaLoading, error: schemaError } = useHrSearchSchema("/audit-logs");
  const appliedCount = useMemo(() => compactSearchClauses(filters, schema).length, [filters, schema]);

  useEffect(() => {
    if (schemaLoading) return;
    let active = true;
    setLoading(true);
    setError("");
    const conditions = [
      ...(context !== "ALL" ? [{ field: "auditLogContext", operator: "EQ", values: [context] }] : []),
      ...compactSearchClauses(filters, schema).map((filter) => ({
        field: filter.field,
        operator: filter.operator,
        values: filter.values,
      })),
    ];
    const payload = { page: page - 1, pageSize, conditions };
    api.post("/audit-logs/search", payload)
      .then((res) => {
        if (!active) return;
        const pageData = unwrapPage(res);
        setRows(pageData.rows);
        setTotal(pageData.total);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [api, context, filters, page, pageSize, schema, schemaLoading]);

  const visibleRows = useMemo(() => {
    if (!search.trim()) return rows;
    const query = search.trim().toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(query));
  }, [rows, search]);

  const columns = useMemo<ColumnDef<AuditRecord>[]>(() => [
    { key: "timestamp", header: "Date & Time", width: "17%", render: (record) => <span className="text-xs text-slate-500">{dateLabel(record)}</span> },
    {
      key: "activity",
      header: "Activity",
      width: "31%",
      render: (record) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-900">{value(record, ["message"], humanize(value(record, ["entityName", "event", "type"], "Activity")))}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{value(record, ["subject"], humanize(value(record, ["entityName"], "HR record")))}</div>
        </div>
      ),
    },
    { key: "area", header: "Area", width: "14%", render: (record) => <span className="text-xs font-semibold text-slate-600">{humanize(value(record, ["auditLogContext", "featureModule", "feature"], "HR"))}</span> },
    { key: "actor", header: "Performed By", width: "18%", render: (record) => <div><div className="font-semibold text-slate-700">{value(record, ["actorUserName", "actorName", "actorEmail", "createdBy"], "System")}</div><div className="mt-1 text-xs text-slate-400">{humanize(value(record, ["actorUserType"], "System"))}</div></div> },
    { key: "action", header: "Change", width: "10%", render: (record) => { const action = value(record, ["action"], "UNKNOWN"); return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${actionStyle(action)}`}>{humanize(action)}</span>; } },
    {
      key: "inspect",
      header: "",
      align: "right",
      render: (record) => (
        <Button
          variant="outline"
          size="sm"
          data-testid={`hr-audit-log-inspect-${value(record, ["id", "uid", "eventUuid"], "record")}`}
          onClick={() => setSelected(record)}
        >
          Inspect
        </Button>
      ),
    },
  ], []);

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(visibleRows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hr-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section data-testid="hr-audit-logs-page" data-state={loading ? "loading" : error ? "error" : visibleRows.length ? "ready" : "empty"} className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="HR Audit Log"
        subtitle="Review administrative changes and employee lifecycle activity."
        actions={<Button data-testid="hr-audit-logs-export" variant="primary" icon={<Download size={16} />} onClick={exportLogs}>Export JSON</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard><div className="text-xs font-bold uppercase text-slate-500">Records on page</div><div className="mt-2 text-2xl font-black">{visibleRows.length}</div></SectionCard>
        <SectionCard><div className="text-xs font-bold uppercase text-slate-500">Total records</div><div className="mt-2 text-2xl font-black">{total}</div></SectionCard>
        <SectionCard><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-600" /><div><div className="text-xs font-bold uppercase text-slate-500">Audit status</div><div className="mt-1 font-black text-emerald-700">Protected</div></div></div></SectionCard>
      </div>

      <SectionCard className="p-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center">
          <div className="flex flex-1 flex-wrap gap-2">
            {CONTEXT_OPTIONS.map((option) => <Button key={option.value} data-testid={`hr-audit-logs-context-${option.value.toLowerCase()}`} size="sm" variant={context === option.value ? "primary" : "outline"} onClick={() => { setContext(option.value); setPage(1); }}>{option.label}</Button>)}
          </div>
          <Input data-testid="hr-audit-logs-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current page..." icon={<Search size={16} />} containerClassName="w-full md:max-w-xs" />
          <Button data-testid="hr-audit-logs-filter" variant={appliedCount ? "primary" : "outline"} icon={<Filter size={16} />} onClick={() => { setDraftFilters(filters.length ? filters : buildDefaultSearchClauses(schema)); setFiltersOpen(true); }}>Filter{appliedCount ? ` (${appliedCount})` : ""}</Button>
        </div>
        {error || schemaError ? <div data-testid="hr-audit-logs-error" className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || schemaError}</div> : null}
        <div data-testid="hr-audit-logs-table" className="p-4">
          <DataTable data={visibleRows} columns={columns} loading={loading} getRowId={(record, index) => value(record, ["id", "uid", "eventUuid"], String(index))} pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }} emptyState={<EmptyState title="No audit records" description="No HR audit activity matches the selected filters." />} />
        </div>
      </SectionCard>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Audit Log Filters" size="sm" contentClassName="flex flex-col p-0">
        <div data-testid="hr-audit-logs-filter-drawer" className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedCount}
              onClearAll={() => setDraftFilters(buildDefaultSearchClauses(schema))}
              emptyStateMessage="No audit-log filters are available from the schema."
            />
          </div>
          <div className="flex gap-3 border-t border-slate-200 p-5">
            <Button data-testid="hr-audit-logs-filter-reset" variant="outline" className="flex-1" onClick={() => { const reset = buildDefaultSearchClauses(schema); setDraftFilters(reset); setFilters(reset); setPage(1); setFiltersOpen(false); }}>Reset</Button>
            <Button data-testid="hr-audit-logs-filter-apply" className="flex-1" onClick={() => { setFilters(draftFilters); setPage(1); setFiltersOpen(false); }}>Apply</Button>
          </div>
        </div>
      </Drawer>

      <Dialog open={!!selected} onClose={() => setSelected(null)} testId="hr-audit-log-inspector" title="Audit Activity Details" size="lg">
        {selected ? <div className="space-y-5" data-testid="hr-audit-log-inspector-details">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-lg font-bold text-slate-900">{value(selected, ["message"], humanize(value(selected, ["entityName"], "HR activity")))}</div>
            <div className="mt-1 text-sm text-slate-600">{value(selected, ["subject"], "No subject provided")}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Date & Time</div><div className="mt-1 font-semibold text-slate-800">{dateLabel(selected)}</div></div>
            <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Performed By</div><div className="mt-1 font-semibold text-slate-800">{value(selected, ["actorUserName", "actorName", "createdBy"], "System")}</div></div>
            <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Area</div><div className="mt-1 font-semibold text-slate-800">{humanize(value(selected, ["auditLogContext", "featureModule"], "HR"))}</div></div>
            <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Operation</div><div className="mt-1 font-semibold text-slate-800">{humanize(value(selected, ["entityName", "action"], "Activity"))}</div></div>
          </div>
          <details className="rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Technical details</summary>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div><dt className="text-slate-400">Event ID</dt><dd className="mt-1 break-all font-mono text-slate-700">{value(selected, ["eventUuid", "id"])}</dd></div>
              <div><dt className="text-slate-400">Entity ID</dt><dd className="mt-1 break-all font-mono text-slate-700">{value(selected, ["entityUid", "entityId"])}</dd></div>
              <div><dt className="text-slate-400">Actor ID</dt><dd className="mt-1 break-all font-mono text-slate-700">{value(selected, ["actorUserId"])}</dd></div>
              <div><dt className="text-slate-400">Source</dt><dd className="mt-1 text-slate-700">{humanize(value(selected, ["sourceService"], "HR service"))}</dd></div>
            </dl>
          </details>
        </div> : null}
        <DialogFooter><Button data-testid="hr-audit-log-inspector-close" variant="outline" onClick={() => setSelected(null)}>Close</Button></DialogFooter>
      </Dialog>
    </section>
  );
}
