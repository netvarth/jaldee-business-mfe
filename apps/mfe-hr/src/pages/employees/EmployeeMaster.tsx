import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, DataTable, Dialog, Drawer, EmptyState, SectionCard, cn } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import type { ColumnDef } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { Download, LayoutGrid, Plus, Rows3, ToggleLeft, ToggleRight, Upload, UploadCloud } from "lucide-react";
import { useEmployees } from "../../services/useEmployees";
import { useEmployeeSearchSchema } from "../../services/useEmployeeSearchSchema";
import { useHrApi } from "../../services/useHrApi";
import { exportToCSV } from "../../lib/utils";
import type { Employee } from "../../types";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../../lib/hrNavigation";

type ViewMode = "table" | "cards";

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

export default function EmployeeMaster() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromAnalytics = isAnalyticsNavigation(location.state);
  const { eventBus } = useMFEProps();
  const api = useHrApi();
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const employeeSort = useMemo(
    () => sortKey ? [{ field: sortKey === "department" ? "hrDepartment" : sortKey, direction: sortDir.toUpperCase() }] : undefined,
    [sortDir, sortKey],
  );
  const { schema: employeeSearchSchema, loading: schemaLoading } = useEmployeeSearchSchema();
  const { data: employees, loading, error, reload, setStatus, totalElements, totalPages: serverTotalPages } = useEmployees(
    advancedFilters,
    employeeSearchSchema,
    {
      enabled: !schemaLoading,
      page: page - 1,
      pageSize,
      sort: employeeSort,
    }
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importDragging, setImportDragging] = useState(false);
  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInFlightRef = useRef(false);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, employeeSearchSchema).length,
    [advancedFilters, employeeSearchSchema]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesQ = !q ||
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q);
      return matchesQ;
    });
  }, [employees, searchTerm]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => setViewMode(media.matches ? "cards" : "table");
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  useEffect(() => {
    const nextTotalPages = Math.max(1, serverTotalPages);
    if (page > nextTotalPages) {
      setPage(nextTotalPages);
    }
  }, [page, serverTotalPages]);

  const totalPages = Math.max(1, serverTotalPages);
  const pagedEmployees = filtered;

  const openFilters = () => {
    setDraftFilters(
      advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(employeeSearchSchema)
    );
    setFiltersOpen(true);
  };

  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(employeeSearchSchema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
    setPage(1);
  };

  const resetFilters = () => {
    clearFilters();
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setAdvancedFilters(draftFilters);
    setPage(1);
    setFiltersOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      ["Employee ID", "Name", "Email", "Contact", "Department", "Designation", "Type", "Status"],
      filtered.map((e) => [
        e.employeeId ?? "", e.name ?? "", e.email ?? "", e.contactNumber ?? "",
        e.department ?? "", e.designation ?? "", e.employmentType ?? "", e.status ?? "",
      ]),
      "employees.csv"
    );
  };

  const emitToast = (intent: "success" | "error" | "warning", message: string) => {
    eventBus?.emit(SHELL_TOAST_EVENT, {
      intent,
      title: "Employee Master",
      message,
    });
  };

  const importFile = (file?: File) => {
    if (!file || importInFlightRef.current) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      emitToast("error", "Please select a CSV file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      emitToast("error", "The CSV file must be 10MB or smaller.");
      return;
    }
    importInFlightRef.current = true;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    void api.post<unknown>("/employees/import", formData)
      .then(async () => {
        await reload();
        emitToast("success", "Employee CSV imported successfully.");
        setImportOpen(false);
      })
      .catch((error) => {
        emitToast("error", error instanceof Error ? error.message : "Employee import failed.");
      })
      .finally(() => {
        importInFlightRef.current = false;
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    importFile(file);
  };

  const downloadImportTemplate = () => {
    const headers = [
      "Employee ID",
      "Name",
      "Email",
      "Contact Number",
      "Department",
      "Designation",
      "Employment Type",
      "Status",
      "Gender",
      "Date of Birth",
      "Date of Joining",
    ];
    const sample = [
      "EMP1001",
      "Sample Employee",
      "employee@company.com",
      "9876543210",
      "General",
      "Associate",
      "Full-time",
      "Active",
      "Female",
      "1995-01-01",
      new Date().toISOString().slice(0, 10),
    ];
    const blob = new Blob([[headers.join(","), sample.join(",")].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "employee-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const confirmStatusChange = async () => {
    if (!statusEmployee) return;
    const enabled = (statusEmployee.status || "Active").toLowerCase() === "active";
    const nextStatus = enabled ? "Inactive" : "Active";
    setStatusSaving(true);
    try {
      await setStatus(statusEmployee, nextStatus);
      emitToast("success", `${statusEmployee.name || "Employee"} ${nextStatus === "Active" ? "enabled" : "disabled"} successfully.`);
      setStatusEmployee(null);
    } catch (error) {
      emitToast("error", error instanceof Error ? error.message : "Could not update employee status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const columns: ColumnDef<Employee>[] = [
    {
      key: "name",
      header: "Employee & ID",
      width: "28%",
      sortable: true,
      render: (employee) => (
        <div className="flex min-w-0 items-center gap-3">
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt={employee.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
              {initials(employee.name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate font-semibold">{employee.name || "Unknown"}</div>
              <EmployeeStatusIndicator employee={employee} />
            </div>
            <div className="truncate text-xs text-[var(--color-text-secondary)]">{employee.employeeId || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department / Designation",
      width: "25%",
      render: (employee) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{employee.department || "—"}</div>
          <div className="truncate text-xs text-[var(--color-text-secondary)]">{employee.designation || "—"}</div>
        </div>
      ),
    },
    {
      key: "employmentType",
      header: "Type",
      width: "14%",
      render: (employee) => employee.employmentType || "—",
    },
    {
      key: "actions",
      header: "Actions",
      width: "20%",
      align: "right",
      render: (employee) => (
        <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="outline" className="!h-8 !px-3 text-xs" data-testid={`hr-employee-view-${employee.id}`} onClick={() => navigate(`/employees/${employee.id}`)}>
            View
          </Button>
          <Button size="sm" variant="outline" className="!h-8 !px-3 text-xs" data-testid={`hr-employee-edit-${employee.id}`} onClick={() => navigate(`/employees/${employee.id}?edit=true`)}>
            Edit
          </Button>
          <EmployeeStatusButton employee={employee} scope="hr-employee" onClick={() => setStatusEmployee(employee)} />
        </div>
      ),
    },
  ];

  return (
    <section
      id="page-employees"
      className="page-section active"
      style={{ backgroundColor: "var(--app-bg)", padding: 0, flexDirection: "column", display: "flex", minWidth: 0 }}
    >
      <input id="hr-employees-import-file" data-testid="hr-employees-import-file" type="file" accept=".csv" ref={fileInputRef} style={{ display: "none" }} onChange={handleImport} />
      <PageHeader
        variant={fromAnalytics ? "navigation" : "default"}
        back={fromAnalytics ? HR_ANALYTICS_BACK : undefined}
        onNavigate={(href) => navigate(href)}
        title="Employee Master"
        subtitle="Manage employee profiles, departments, roles, and workforce status."
        actions={
          <div className="employee-master-header-actions">
            <Button
              id="hr-employees-import-button"
              data-testid="hr-employees-import-button"
              variant="outline"
              icon={<Upload size={16} />}
              onClick={() => setImportOpen(true)}
            >
              {importing ? "Importing..." : "Import CSV"}
            </Button>
            <Button
              id="hr-employees-export-button"
              data-testid="hr-employees-export-button"
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              id="hr-employees-create-button"
              data-testid="hr-employees-create-button"
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => navigate("/employees/new")}
            >
              New Employee
            </Button>
          </div>
        }
      />
      <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>
      <div className="border-b border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] px-4 py-4" data-testid="hr-employees-toolbar">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="c-search-bar employee-master-search">
            <input
              id="hr-employees-search"
              data-testid="hr-employees-search"
              type="text"
              placeholder="Enter name, email or ID"
              className="c-search-input"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            <svg className="c-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
          </div>
          <div className="flex w-full items-center justify-end gap-3 lg:w-auto">
            <Button
              type="button"
              id="hr-employees-filter-indicator"
              data-testid="hr-employees-filter-indicator"
              variant={appliedFilterCount > 0 ? "primary" : "outline"}
              className={cn(
                appliedFilterCount === 0 &&
                  "!border-[var(--color-primary)] !text-[var(--color-primary)] hover:!bg-[var(--color-primary-subtle)]"
              )}
              icon={<FilterIcon />}
              aria-label="Open employee filters"
              onClick={openFilters}
            >
              Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
            </Button>
            <EmployeeViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      <div data-testid="hr-employees-table-container">
        {viewMode === "table" ? (
          <DataTable
            data-testid="hr-employees-table"
            data={error ? [] : filtered}
            columns={columns}
            getRowId={(employee) => employee.id}
            loading={loading}
            onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
            sorting={{
              sortKey,
              sortDir,
              onChange: (key, direction) => {
                setSortKey(key);
                setSortDir(direction);
                setPage(1);
              },
            }}
            pagination={{
              page,
              pageSize,
              total: totalElements,
              mode: "server",
              onChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
            }}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="min-w-[760px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
            emptyState={
              <EmptyState
                title={error ? "Could not load employees" : "No matching employees"}
                description={error ? "Please retry after checking the HR service connection." : "Adjust the search or filters to find an employee."}
              />
            }
          />
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                <div className="animate-pulse space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--color-surface-secondary)]" />
                  <div className="h-4 w-1/2 rounded bg-[var(--color-surface-secondary)]" />
                  <div className="h-3 w-2/3 rounded bg-[var(--color-surface-secondary)]" />
                  <div className="h-3 w-full rounded bg-[var(--color-surface-secondary)]" />
                </div>
              </div>
            ))}
          </div>
        ) : error || filtered.length === 0 ? (
          <EmptyState
            title={error ? "Could not load employees" : "No matching employees"}
            description={error ? "Please retry after checking the HR service connection." : "Adjust the search or filters to find an employee."}
          />
        ) : (
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedEmployees.map((employee) => (
                <article
                  key={employee.id}
                  data-testid={`hr-employees-card-${employee.id}`}
                  className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_70%,white)] bg-[var(--color-surface)] p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {employee.photoUrl ? (
                        <img src={employee.photoUrl} alt={employee.name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
                          {initials(employee.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{employee.name || "Unknown"}</div>
                          <EmployeeStatusIndicator employee={employee} />
                        </div>
                        <div className="truncate text-xs text-[var(--color-text-secondary)]">{employee.employeeId || "—"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">Department</span>
                      <span className="text-right text-sm font-medium text-[var(--color-text-primary)]">{employee.department || "—"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">Designation</span>
                      <span className="text-right text-sm text-[var(--color-text-primary)]">{employee.designation || "—"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.02em] text-[var(--color-text-secondary)]">Type</span>
                      <span className="text-right text-sm text-[var(--color-text-primary)]">{employee.employmentType || "—"}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="!h-9 !px-3 text-xs" data-testid={`hr-employee-card-view-${employee.id}`} onClick={() => navigate(`/employees/${employee.id}`)}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="!h-9 !px-3 text-xs" data-testid={`hr-employee-card-edit-${employee.id}`} onClick={() => navigate(`/employees/${employee.id}?edit=true`)}>
                      Edit
                    </Button>
                    <EmployeeStatusButton employee={employee} scope="hr-employee-card" onClick={() => setStatusEmployee(employee)} />
                  </div>
                </article>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_70%,white)] bg-[var(--color-surface)] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Showing {totalElements === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalElements)} of {totalElements} employees
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  data-testid="hr-employees-cards-page-size"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                  aria-label="Employees per page"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(1)}>
                  First
                </Button>
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Prev
                </Button>
                <span className="min-w-[88px] text-center text-sm font-medium text-[var(--color-text-primary)]">
                  Page {page} / {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  Next
                </Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </SectionCard>
      <Dialog
        open={importOpen}
        onClose={() => !importing && setImportOpen(false)}
        testId="hr-employees-import-modal"
        title="Import Employees"
        description="Upload a CSV template to create employee records in bulk."
        size="md"
        contentClassName="max-sm:!h-[100dvh]"
        closeButtonClassName="h-9 w-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
      >
        <div className="space-y-4">
          <button
            type="button"
            data-testid="hr-employees-import-dropzone"
            className={cn(
              "flex min-h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-6 py-8 text-center transition-colors",
              importDragging
                ? "border-[var(--primary-color)] bg-[var(--color-primary-subtle)]"
                : "border-slate-200 hover:border-[var(--primary-color)]",
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setImportDragging(true);
            }}
            onDragLeave={() => setImportDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setImportDragging(false);
              importFile(event.dataTransfer.files?.[0]);
            }}
            disabled={importing}
          >
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <UploadCloud size={24} />
            </span>
            <span className="text-sm font-bold text-violet-700">
              {importing ? "Importing employees..." : "Click to upload"}
            </span>
            <span className="mt-1 text-xs font-semibold uppercase text-slate-400">
              or drag and drop here
            </span>
            <span className="mt-4 text-xs text-slate-400">Supports CSV up to 10MB</span>
          </button>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-slate-700">Need the CSV template?</p>
              <p className="m-0 mt-1 text-xs text-slate-400">
                Includes the supported employee headers and a sample row.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              data-testid="hr-employees-import-template-download"
              onClick={downloadImportTemplate}
              className="shrink-0"
            >
              Download CSV
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!statusEmployee}
        onClose={() => !statusSaving && setStatusEmployee(null)}
        testId="hr-employee-status-modal"
        title={`${(statusEmployee?.status || "Active").toLowerCase() === "active" ? "Disable" : "Enable"} Employee`}
        description={`Are you sure you want to ${(statusEmployee?.status || "Active").toLowerCase() === "active" ? "disable" : "enable"} ${statusEmployee?.name || "this employee"}?`}
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button data-testid="hr-employee-status-cancel" variant="outline" onClick={() => setStatusEmployee(null)} disabled={statusSaving}>Cancel</Button>
          <Button data-testid="hr-employee-status-confirm" variant="primary" onClick={() => void confirmStatusChange()} loading={statusSaving}>Confirm</Button>
        </div>
      </Dialog>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Advanced Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-employees-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={employeeSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No employee filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="hr-employees-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="hr-employees-filter-apply"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

function EmployeeStatusIndicator({ employee }: { employee: Employee }) {
  const status = employee.status || "Unknown";
  const normalized = status.toLowerCase();
  const color =
    normalized === "active"
      ? "bg-[#10b981] ring-[#10b981]/20"
      : normalized === "inactive" || normalized === "left"
        ? "bg-[#94a3b8] ring-[#94a3b8]/20"
        : "bg-[#f59e0b] ring-[#f59e0b]/20";

  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full ring-4", color)}
      title={status}
      aria-label={`Status: ${status}`}
      role="img"
    />
  );
}

function EmployeeStatusButton({ employee, scope, onClick }: { employee: Employee; scope: string; onClick: () => void }) {
  const enabled = (employee.status || "Active").toLowerCase() === "active";
  const action = enabled ? "disable" : "enable";
  return (
    <button
      type="button"
      data-testid={`${scope}-${action}-${employee.id}`}
      onClick={onClick}
      title={`${enabled ? "Disable" : "Enable"} employee`}
      aria-label={`${enabled ? "Disable" : "Enable"} ${employee.name || "employee"}`}
      className={cn(
        "inline-flex h-9 w-[38px] items-center justify-center rounded-lg border-0 transition-colors",
        enabled
          ? "bg-[rgba(5,150,105,0.07)] text-[#059669]"
          : "bg-[rgba(100,116,139,0.07)] text-[#64748b]"
      )}
    >
      {enabled ? <ToggleRight size={22} strokeWidth={2.2} /> : <ToggleLeft size={22} strokeWidth={2.2} />}
    </button>
  );
}

function EmployeeViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
      <button
        type="button"
        data-testid="hr-employees-view-table"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border-0",
          value === "table"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-transparent text-[var(--color-text-secondary)]"
        )}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        data-testid="hr-employees-view-cards"
        onClick={() => onChange("cards")}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border-0",
          value === "cards"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-transparent text-[var(--color-text-secondary)]"
        )}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
