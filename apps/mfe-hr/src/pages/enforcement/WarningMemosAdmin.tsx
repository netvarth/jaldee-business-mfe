import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ShieldAlert,
  Trash2,
  Eye,
  Search,
  User,
} from "lucide-react";
import {
  Button,
  DataTable,
  Dialog,
  DialogFooter,
  Input,
  Select,
  Textarea,
  ColumnDef,
  SectionCard,
  EmptyState,
  Popover,
  Drawer,
} from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useMemos, MemoSeverity, WarningMemo } from "../../services/useLifecycle";
import { formatDate } from "../../lib/utils";
import { HrPageHeader } from "../../components/HrPageHeader";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "../recruitment/recruitmentResponsive";

const CATEGORIES = [
  "Attendance",
  "Policy Violation",
  "Performance",
  "Behavior",
  "Conduct",
  "Safety",
];

export function severityBadge(severity = "") {
  switch (severity) {
    case "Low":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Critical":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export default function WarningMemosAdmin() {
  const { eventBus } = useMFEProps();
  const memos = useMemos({ isEss: false });
  const employees = useEmployees();
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [viewMemo, setViewMemo] = useState<WarningMemo | null>(null);
  const [deleteMemo, setDeleteMemo] = useState<WarningMemo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<{
    employeeUid: string;
    category: string;
    severity: MemoSeverity;
    description: string;
  }>({
    employeeUid: "",
    category: "Attendance",
    severity: "Medium",
    description: "",
  });

  const empMap = useMemo(() => new Map(employees.data.map((e) => [e.id, e])), [employees.data]);

  const filteredMemos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return memos.data.filter((memo) => {
      const empName = memo.employeeName || empMap.get(memo.employeeUid || "")?.name || "";
      const matchesSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        (memo.category || "").toLowerCase().includes(q) ||
        (memo.description || "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "ALL" || memo.category === categoryFilter;
      const matchesSeverity = severityFilter === "ALL" || memo.severity === severityFilter;
      const isAck = Boolean(memo.acknowledgedAt);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACKNOWLEDGED" && isAck) ||
        (statusFilter === "PENDING" && !isAck);

      return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
    });
  }, [memos.data, search, categoryFilter, severityFilter, statusFilter, empMap]);

  const kpis = useMemo(() => {
    const total = memos.data.length;
    const pending = memos.data.filter((m) => !m.acknowledgedAt).length;
    const criticalHigh = memos.data.filter(
      (m) => m.severity === "Critical" || m.severity === "High"
    ).length;
    return { total, pending, criticalHigh };
  }, [memos.data]);

  const handleIssue = async () => {
    if (!form.employeeUid) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Warning Memo", message: "Please select an addressee employee." });
      return;
    }
    if (!form.description || form.description.trim().length < 20) {
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Warning Memo", message: "Description must be at least 20 characters." });
      return;
    }

    setSaving(true);
    try {
      const selectedEmp = empMap.get(form.employeeUid);
      await memos.issue({
        employeeUid: form.employeeUid,
        employeeName: selectedEmp?.name,
        category: form.category,
        severity: form.severity,
        description: form.description,
        issuedOn: new Date().toISOString().slice(0, 10),
      });
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "success", title: "Warning Memo", message: "Warning memo issued successfully." });
      setIssueOpen(false);
      setForm({ employeeUid: "", category: "Attendance", severity: "Medium", description: "" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to issue warning memo.";
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Warning Memo", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteMemo) return;
    setDeleting(true);
    try {
      await memos.remove(deleteMemo.id || deleteMemo.uid || "");
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "success", title: "Warning Memo", message: "Warning memo deleted." });
      setDeleteMemo(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete memo.";
      eventBus?.emit(SHELL_TOAST_EVENT, { intent: "error", title: "Warning Memo", message: msg });
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<WarningMemo>[] = [
    {
      key: "issuedOn",
      header: "Issued On",
      width: "14%",
      render: (memo) => (
        <span className="font-semibold text-slate-800">
          {memo.issuedOn ? formatDate(memo.issuedOn) : "—"}
        </span>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      width: "24%",
      render: (memo) => {
        const emp = empMap.get(memo.employeeUid || "");
        const name = memo.employeeName || emp?.name || "Employee";
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 font-bold text-xs border border-teal-200">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm truncate">{name}</div>
              {emp?.employeeId && (
                <div className="text-[11px] text-slate-500 font-mono truncate">{emp.employeeId}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      width: "15%",
      render: (memo) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {memo.category || "General"}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      width: "14%",
      render: (memo) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${severityBadge(
            memo.severity
          )}`}
        >
          {memo.severity || "Medium"}
        </span>
      ),
    },
    {
      key: "issuedByName",
      header: "Issued By",
      width: "14%",
      render: (memo) => (
        <span className="text-slate-600 font-medium">{memo.issuedByName || "HR Admin"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "14%",
      render: (memo) =>
        memo.acknowledgedAt ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={13} /> Acknowledged
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            <Clock size={13} /> Pending Ack
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "12%",
      align: "right",
      render: (memo) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            id={`hr-memo-view-${memo.id}`}
            data-testid={`hr-memo-view-${memo.id}`}
            variant="outline"
            size="sm"
            icon={<Eye size={14} />}
            onClick={() => setViewMemo(memo)}
          >
            View
          </Button>
          <Button
            id={`hr-memo-delete-${memo.id}`}
            data-testid={`hr-memo-delete-${memo.id}`}
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            icon={<Trash2 size={14} />}
            onClick={() => setDeleteMemo(memo)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const activeFilterCount =
    (categoryFilter !== "ALL" ? 1 : 0) +
    (severityFilter !== "ALL" ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0);

  return (
    <section id="hr-enforcement-memos-page" data-testid="hr-enforcement-memos-page" className="page-section active hr-page-shell space-y-3.5">
      <HrPageHeader
        title="Warning Memos & Enforcement"
        subtitle="Issue warning notices and track compliance acknowledgements."
        className="!mb-1 sm:!mb-2"
        stackOnMobile={false}
        actions={
          <Button
            id="hr-enforcement-memo-issue-btn"
            data-testid="hr-enforcement-memo-issue-btn"
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setIssueOpen(true)}
            size="sm"
            className="whitespace-nowrap"
          >
            Issue Warning Memo
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Memos Issued</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{kpis.total}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <ShieldAlert size={22} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Acknowledgement</div>
            <div className="mt-1 text-2xl font-black text-amber-600">{kpis.pending}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Clock size={22} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Critical & High Severity</div>
            <div className="mt-1 text-2xl font-black text-red-600">{kpis.criticalHigh}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Integrated SectionCard toolbar & table */}
      <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-3 sm:p-4">
          <Input
            id="hr-memos-search"
            data-testid="hr-memos-search"
            placeholder="Search memos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
            className="!h-8.5 text-xs placeholder:text-xs"
            containerClassName="min-w-0 flex-1 sm:max-w-xs"
          />

          {/* 3 Dropdowns (Visible in 1 line on sm: screens and above) */}
          <div className="hidden sm:flex items-center gap-2">
            <Select
              id="hr-memos-category-filter"
              testId="hr-memos-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Categories" },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              containerClassName="w-36"
              className="!h-8.5 text-xs px-2 py-0"
            />
            <Select
              id="hr-memos-severity-filter"
              testId="hr-memos-severity-filter"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Severities" },
                { value: "Low", label: "Low" },
                { value: "Medium", label: "Medium" },
                { value: "High", label: "High" },
                { value: "Critical", label: "Critical" },
              ]}
              containerClassName="w-32"
              className="!h-8.5 text-xs px-2 py-0"
            />
            <Select
              id="hr-memos-status-filter"
              testId="hr-memos-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "PENDING", label: "Pending Ack" },
                { value: "ACKNOWLEDGED", label: "Acknowledged" },
              ]}
              containerClassName="w-36"
              className="!h-8.5 text-xs px-2 py-0"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {/* Filter Drawer Button (Visible on mobile / small devices) */}
            <Button
              type="button"
              id="hr-memos-mobile-filter-btn"
              data-testid="hr-memos-mobile-filter-btn"
              variant={activeFilterCount > 0 ? "primary" : "outline"}
              icon={<Filter size={15} />}
              size="sm"
              onClick={() => setFiltersOpen(true)}
              className="sm:hidden !h-8 px-2.5"
              title="Filter warning memos"
            >
              {activeFilterCount > 0 && <span className="ml-1 text-[10px]">({activeFilterCount})</span>}
            </Button>

            <RecruitmentViewToggle
              value={viewMode}
              onChange={setViewMode}
              tableTestId="hr-memos-view-table"
              cardsTestId="hr-memos-view-cards"
            />
          </div>
        </div>

        {/* Content View: Table vs Cards */}
        {viewMode === "cards" ? (
          filteredMemos.length === 0 ? (
            <div className="p-12">
              <EmptyState title="No Warning Memos" description="No warning memos match your search or filters." />
            </div>
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {filteredMemos.map((memo) => {
                const emp = empMap.get(memo.employeeUid);
                return (
                  <RecruitmentMobileCard
                    key={memo.id || memo.uid}
                    title={emp?.name || memo.employeeName || memo.employeeUid}
                    rows={[
                      { label: "Issued On", value: formatDate(memo.issuedOn) || "Recently" },
                      { label: "Category", value: memo.category || "General" },
                      {
                        label: "Severity",
                        value: (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${severityBadge(memo.severity)}`}>
                            {memo.severity || "Medium"}
                          </span>
                        ),
                      },
                      { label: "Issued By", value: memo.issuedByName || "HR Admin" },
                      {
                        label: "Status",
                        value: memo.acknowledgedAt ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Acknowledged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            <Clock size={13} /> Pending Ack
                          </span>
                        ),
                      },
                    ]}
                    footer={
                      <div className="flex items-center justify-end gap-2 w-full pt-1">
                        <Button
                          id={`hr-memo-card-view-${memo.id}`}
                          data-testid={`hr-memo-card-view-${memo.id}`}
                          variant="outline"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => setViewMemo(memo)}
                        >
                          View
                        </Button>
                        <Button
                          id={`hr-memo-card-delete-${memo.id}`}
                          data-testid={`hr-memo-card-delete-${memo.id}`}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          icon={<Trash2 size={14} />}
                          onClick={() => setDeleteMemo(memo)}
                        >
                          Delete
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )
        ) : (
          <DataTable
            data-testid="hr-memos-table"
            data={filteredMemos}
            columns={columns}
            getRowId={(row) => row.id || row.uid || ""}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="w-full min-w-[750px]"
            emptyState={
              <EmptyState title="No Warning Memos" description="No warning memos match your search or filters." />
            }
          />
        )}
      </SectionCard>

      {/* Modal: Issue Warning Memo */}
      <Dialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        testId="hr-issue-memo-modal"
        title="Issue Warning Memo"
        description="Send a formal warning notice to an employee."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Addressee Employee <span className="text-red-500">*</span>
            </label>
            <Select
              id="hr-memo-form-employee"
              testId="hr-memo-form-employee"
              value={form.employeeUid}
              onChange={(e) => setForm((f) => ({ ...f, employeeUid: e.target.value }))}
              options={[
                { value: "", label: "Select Employee..." },
                ...employees.data.map((emp) => ({
                  value: emp.id,
                  label: `${emp.name} (${emp.employeeId || "Emp"})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <Select
                id="hr-memo-form-category"
                testId="hr-memo-form-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Severity
              </label>
              <Select
                id="hr-memo-form-severity"
                testId="hr-memo-form-severity"
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as MemoSeverity }))}
                options={[
                  { value: "Low", label: "Low (Notice)" },
                  { value: "Medium", label: "Medium (Caution)" },
                  { value: "High", label: "High (Strict)" },
                  { value: "Critical", label: "Critical (Final Warning)" },
                ]}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Memo Content / Description <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {form.description.length} chars (Min 20)
              </span>
            </div>
            <Textarea
              id="hr-memo-form-description"
              data-testid="hr-memo-form-description"
              rows={4}
              placeholder="State the details of the policy violation, incident context, and expected corrective action..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIssueOpen(false)}>
            Cancel
          </Button>
          <Button
            id="hr-memo-submit-btn"
            data-testid="hr-memo-submit-btn"
            variant="primary"
            onClick={handleIssue}
            loading={saving}
          >
            Issue Memo
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: View Details */}
      <Dialog
        open={Boolean(viewMemo)}
        onClose={() => setViewMemo(null)}
        testId="hr-view-memo-modal"
        title="Warning Memo Notice"
      >
        {viewMemo && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Addressee</div>
                <div className="text-base font-black text-slate-900">
                  {viewMemo.employeeName || empMap.get(viewMemo.employeeUid || "")?.name || "Employee"}
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${severityBadge(
                  viewMemo.severity
                )}`}
              >
                {viewMemo.severity || "Medium"} Severity
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Category:</span>{" "}
                <span className="font-bold text-slate-800">{viewMemo.category || "General"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Issued On:</span>{" "}
                <span className="font-bold text-slate-800">{viewMemo.issuedOn ? formatDate(viewMemo.issuedOn) : "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Issued By:</span>{" "}
                <span className="font-bold text-slate-800">{viewMemo.issuedByName || "HR Admin"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Status:</span>{" "}
                {viewMemo.acknowledgedAt ? (
                  <span className="font-bold text-emerald-600">Acknowledged</span>
                ) : (
                  <span className="font-bold text-amber-600">Pending Receipt</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Memo Text</div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{viewMemo.description}</p>
            </div>

            {viewMemo.acknowledgedAt && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1 text-xs">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Digitally Acknowledged on {formatDate(viewMemo.acknowledgedAt)}
                </div>
                {viewMemo.ackComment && (
                  <div className="text-emerald-950 font-medium italic pt-1">
                    "{viewMemo.ackComment}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Modal: Delete Confirmation */}
      <Dialog
        open={Boolean(deleteMemo)}
        onClose={() => setDeleteMemo(null)}
        testId="hr-delete-memo-modal"
        title="Delete Warning Memo"
        description="Are you sure you want to delete this warning memo record?"
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeleteMemo(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            id="hr-memo-confirm-delete"
            data-testid="hr-memo-confirm-delete"
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleDelete}
            loading={deleting}
          >
            Confirm Delete
          </Button>
        </div>
      </Dialog>

      {/* FILTER DRAWER FOR SMALL DEVICES */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter Warning Memos"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col justify-between" data-testid="hr-memos-filter-drawer">
          <div className="space-y-4 p-5 overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <Select
                id="hr-memos-drawer-category"
                testId="hr-memos-drawer-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Categories" },
                  ...CATEGORIES.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Severity
              </label>
              <Select
                id="hr-memos-drawer-severity"
                testId="hr-memos-drawer-severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Severities" },
                  { value: "Low", label: "Low" },
                  { value: "Medium", label: "Medium" },
                  { value: "High", label: "High" },
                  { value: "Critical", label: "Critical" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Acknowledgement Status
              </label>
              <Select
                id="hr-memos-drawer-status"
                testId="hr-memos-drawer-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "PENDING", label: "Pending Ack" },
                  { value: "ACKNOWLEDGED", label: "Acknowledged" },
                ]}
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-200 p-4 bg-slate-50">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setCategoryFilter("ALL");
                setSeverityFilter("ALL");
                setStatusFilter("ALL");
              }}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              onClick={() => setFiltersOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}
