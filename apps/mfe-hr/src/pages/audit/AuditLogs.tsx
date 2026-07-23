import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Search, ShieldCheck } from "lucide-react";
import { Button, DataTable, Dialog, DialogFooter, Drawer, EmptyState, Input, PageHeader, SectionCard, type ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";

type AuditRecord = Record<string, unknown> & { id?: string; uid?: string };

const CONTEXT_OPTIONS = [
  { label: "All HR Operations", value: "ALL" },
  { label: "Employees", value: "HR_EMPLOYEE" },
  { label: "Attendance", value: "HR_ATTENDANCE" },
  { label: "Leave", value: "HR_LEAVE" },
  { label: "Payroll", value: "HR_PAYROLL" },
  { label: "Recruitment", value: "HR_CAREERS" },
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
  if (!raw) return "-";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("en-IN");
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
  const { api } = useMFEProps();
  const [rows, setRows] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [context, setContext] = useState("ALL");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [action, setAction] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [draft, setDraft] = useState({ action: "", actorUserId: "", fromDate: "", toDate: "" });
  const [selected, setSelected] = useState<AuditRecord | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.get("/base-service/v1/api/tenant/audit-logs", {
      params: {
        page: page - 1,
        size: pageSize,
        feature: "HR",
        ...(context !== "ALL" ? { featureModule: context } : {}),
        ...(action ? { action } : {}),
        ...(actorUserId ? { actorUserId: Number(actorUserId) } : {}),
        ...(fromDate ? { from: new Date(`${fromDate}T00:00:00.000`).toISOString() } : {}),
        ...(toDate ? { to: new Date(`${toDate}T23:59:59.999`).toISOString() } : {}),
      },
    }).then((response) => {
      if (!active) return;
      const result = unwrapPage(response);
      setRows(result.rows);
      setTotal(result.total);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to load audit logs.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [api, page, pageSize, context, action, actorUserId, fromDate, toDate]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((record) => JSON.stringify(record).toLowerCase().includes(query));
  }, [rows, search]);

  const columns = useMemo<ColumnDef<AuditRecord>[]>(() => [
    {
      key: "action",
      header: "Action",
      render: (record) => (
        <div>
          <div className="font-semibold text-slate-900">{value(record, ["action", "event", "actionName"])}</div>
          <div className="mt-1 text-xs text-slate-500">{value(record, ["featureModule", "auditlogContext", "auditLogContext", "context"], "HR")}</div>
        </div>
      ),
    },
    {
      key: "message",
      header: "Message",
      render: (record) => <div className="max-w-xl text-sm text-slate-600">{value(record, ["message", "details", "description"], "No details provided")}</div>,
    },
    {
      key: "actor",
      header: "Updated By",
      render: (record) => (
        <div>
          <div className="font-medium text-slate-800">{value(record, ["actorUserName", "actor", "userName", "actorUserId"], "System")}</div>
          <div className="mt-1 text-xs text-slate-500">{dateLabel(record)}</div>
        </div>
      ),
    },
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

  const appliedCount = [action, actorUserId, fromDate, toDate].filter(Boolean).length;
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
          <Button data-testid="hr-audit-logs-filter" variant={appliedCount ? "primary" : "outline"} icon={<Filter size={16} />} onClick={() => { setDraft({ action, actorUserId, fromDate, toDate }); setFiltersOpen(true); }}>Filter{appliedCount ? ` (${appliedCount})` : ""}</Button>
        </div>
        {error ? <div data-testid="hr-audit-logs-error" className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
        <div data-testid="hr-audit-logs-table" className="p-4">
          <DataTable data={visibleRows} columns={columns} loading={loading} getRowId={(record, index) => value(record, ["id", "uid", "eventUuid"], String(index))} pagination={{ page, pageSize, total, mode: "server", onChange: setPage, onPageSizeChange: setPageSize }} emptyState={<EmptyState title="No audit records" description="No HR audit activity matches the selected filters." />} />
        </div>
      </SectionCard>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Audit Log Filters" size="sm" contentClassName="flex flex-col p-0">
        <div data-testid="hr-audit-logs-filter-drawer" className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <Input data-testid="hr-audit-logs-action-filter" label="Action" value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} />
            <Input data-testid="hr-audit-logs-actor-user-id-filter" label="Actor User ID" type="number" value={draft.actorUserId} onChange={(event) => setDraft({ ...draft, actorUserId: event.target.value })} />
            <Input data-testid="hr-audit-logs-from-filter" label="From Date" type="date" value={draft.fromDate} onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })} />
            <Input data-testid="hr-audit-logs-to-filter" label="To Date" type="date" value={draft.toDate} onChange={(event) => setDraft({ ...draft, toDate: event.target.value })} />
          </div>
          <div className="flex gap-3 border-t border-slate-200 p-5">
            <Button data-testid="hr-audit-logs-filter-reset" variant="outline" className="flex-1" onClick={() => { setDraft({ action: "", actorUserId: "", fromDate: "", toDate: "" }); setAction(""); setActorUserId(""); setFromDate(""); setToDate(""); setPage(1); setFiltersOpen(false); }}>Reset</Button>
            <Button data-testid="hr-audit-logs-filter-apply" className="flex-1" onClick={() => { setAction(draft.action.trim()); setActorUserId(draft.actorUserId.trim()); setFromDate(draft.fromDate); setToDate(draft.toDate); setPage(1); setFiltersOpen(false); }}>Apply</Button>
          </div>
        </div>
      </Drawer>

      <Dialog open={!!selected} onClose={() => setSelected(null)} testId="hr-audit-log-inspector" title="Audit Record Inspector" size="lg">
        {selected ? <pre data-testid="hr-audit-log-inspector-json" className="max-h-[60vh] overflow-auto rounded-xl bg-slate-950 p-5 text-xs text-emerald-300">{JSON.stringify(selected, null, 2)}</pre> : null}
        <DialogFooter><Button data-testid="hr-audit-log-inspector-close" variant="outline" onClick={() => setSelected(null)}>Close</Button></DialogFooter>
      </Dialog>
    </section>
  );
}
