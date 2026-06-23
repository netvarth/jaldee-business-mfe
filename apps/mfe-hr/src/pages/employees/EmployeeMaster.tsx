import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, DataTable, Drawer, EmptyState, PageHeader, Select, cn } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useEmployees } from "../../services/useEmployees";
import { useHrApi } from "../../services/useHrApi";
import { exportToCSV } from "../../lib/utils";
import type { Employee } from "../../types";

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function EmployeeMaster() {
  const navigate = useNavigate();
  const { eventBus } = useMFEProps();
  const api = useHrApi();
  const { data: employees, loading, error, remove } = useEmployees();
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [draftDeptFilter, setDraftDeptFilter] = useState("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");
  const [draftTypeFilter, setDraftTypeFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[],
    [employees]
  );
  const statuses = useMemo(
    () => Array.from(new Set(employees.map((e) => e.status).filter(Boolean))) as string[],
    [employees]
  );
  const employmentTypes = useMemo(
    () => Array.from(new Set(employees.map((e) => e.employmentType).filter(Boolean))) as string[],
    [employees]
  );
  const appliedFilterCount = [deptFilter, statusFilter, typeFilter].filter((value) => value !== "all").length;

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesQ = !q ||
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || e.department === deptFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesType = typeFilter === "all" || e.employmentType === typeFilter;
      return matchesQ && matchesDept && matchesStatus && matchesType;
    });
  }, [employees, searchTerm, deptFilter, statusFilter, typeFilter]);

  const openFilters = () => {
    setDraftDeptFilter(deptFilter);
    setDraftStatusFilter(statusFilter);
    setDraftTypeFilter(typeFilter);
    setFiltersOpen(true);
  };

  const resetFilters = () => {
    setDraftDeptFilter("all");
    setDraftStatusFilter("all");
    setDraftTypeFilter("all");
    setDeptFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setDeptFilter(draftDeptFilter);
    setStatusFilter(draftStatusFilter);
    setTypeFilter(draftTypeFilter);
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        // Aggressive split that handles \r, \n, \r\n, unicode separators, AND literal '\n' strings
        const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
        
        if (lines.length <= 1) {
          emitToast("error", "CSV import failed. The file must include a header row and at least one employee row.");
          setImporting(false);
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Find indices dynamically
        const idIdx = headers.findIndex(h => h.includes('id'));
        const nameIdx = headers.findIndex(h => h.includes('name'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const phoneIdx = headers.findIndex(h => h.includes('contact') || h.includes('phone'));
        const deptIdx = headers.findIndex(h => h.includes('department'));
        const desigIdx = headers.findIndex(h => h.includes('designation'));
        const typeIdx = headers.findIndex(h => h.includes('type'));
        const statusIdx = headers.findIndex(h => h.includes('status'));
        const genderIdx = headers.findIndex(h => h.includes('gender'));
        const dobIdx = headers.findIndex(h => h.includes('dob') || h.includes('birth'));
        const dojIdx = headers.findIndex(h => h.includes('joining') || h.includes('doj'));

        const rows = lines.slice(1);
        let successCount = 0;
        let failCount = 0;
        let firstError = "";

        for (const row of rows) {
          const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          
          const name = nameIdx >= 0 ? cols[nameIdx] : undefined;
          if (!name) continue; // Skip invalid rows without a name

          const payload: Record<string, unknown> = {
            employeeId: (idIdx >= 0 && cols[idIdx]) ? cols[idIdx] : `EMP${Math.floor(1000 + Math.random() * 9000)}`,
            name: name,
            email: (emailIdx >= 0 && cols[emailIdx]) ? cols[emailIdx] : `${name.replace(/\s+/g, '.').toLowerCase()}@company.com`,
            contactNumber: (phoneIdx >= 0 && cols[phoneIdx]) ? cols[phoneIdx] : null,
            department: (deptIdx >= 0 && cols[deptIdx]) ? cols[deptIdx] : null,
            designation: (desigIdx >= 0 && cols[desigIdx]) ? cols[desigIdx] : null,
            employmentType: (typeIdx >= 0 && cols[typeIdx]) ? cols[typeIdx] : "Full-time",
            status: (statusIdx >= 0 && cols[statusIdx]) ? cols[statusIdx] : "Active",
            gender: (genderIdx >= 0 && cols[genderIdx]) ? cols[genderIdx] : null,
            dob: (dobIdx >= 0 && cols[dobIdx]) ? cols[dobIdx] : null,
            doj: (dojIdx >= 0 && cols[dojIdx]) ? cols[dojIdx] : new Date().toISOString().slice(0, 10),
            role: "employee",
          };

          try {
            await api.post("/employees", payload);
            successCount++;
          } catch (e) {
            failCount++;
            if (!firstError) firstError = e instanceof Error ? e.message : String(e);
          }
        }

        if (successCount > 0 && failCount === 0) {
          emitToast("success", `Imported ${successCount} employee records.`);
        } else if (successCount > 0) {
          emitToast("warning", `Imported ${successCount} employees. ${failCount} rows failed.${firstError ? ` First error: ${firstError}` : ""}`);
        } else {
          emitToast("error", firstError || "Employee import failed.");
        }
        if (successCount > 0) window.location.reload();
      } catch (err) {
        emitToast("error", err instanceof Error ? err.message : "Error parsing CSV file.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (e: Employee) => {
    if (!window.confirm(`Delete ${e.name}? This cannot be undone.`)) return;
    try {
      await remove(e.id);
    } catch {
      emitToast("error", "Could not delete employee. Please try again.");
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
            <div className="truncate font-semibold">{employee.name || "Unknown"}</div>
            <div className="truncate text-xs text-[var(--color-text-secondary)]">{employee.employeeId || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department / Designation",
      width: "25%",
      sortable: true,
      render: (employee) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{employee.department || "—"}</div>
          <div className="truncate text-xs text-[var(--color-text-secondary)]">{employee.designation || "—"}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "13%",
      filter: {
        value: statusFilter,
        allValue: "all",
        searchable: true,
        searchPlaceholder: "Search status...",
        testId: "hr-employees-inline-status-filter",
        options: [
          { value: "all", label: "All Statuses" },
          ...statuses.map((status) => ({ value: status, label: status })),
        ],
        onChange: (value) => {
          setStatusFilter(value);
          setDraftStatusFilter(value);
          setPage(1);
        },
      },
      render: (employee) => (
        <Badge
          variant={
            employee.status === "Active"
              ? "success"
              : employee.status === "Inactive" || employee.status === "Left"
                ? "neutral"
                : "warning"
          }
          dot
        >
          {employee.status || "Unknown"}
        </Badge>
      ),
    },
    {
      key: "employmentType",
      header: "Type",
      width: "14%",
      sortable: true,
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
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            className="!h-8 !w-8 !px-0 text-[var(--color-danger)] hover:bg-[color:color-mix(in_srgb,var(--color-danger)_7%,white)]"
            aria-label={`Delete ${employee.name}`}
            data-testid={`hr-employee-delete-${employee.id}`}
            onClick={() => handleDelete(employee)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            }
          />
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
        title="Employee Master"
        subtitle="Manage employee profiles, departments, roles, and workforce status."
        actions={
          <div className="employee-master-header-actions">
            <button
              id="hr-employees-import-button"
              data-testid="hr-employees-import-button"
              className="btn-grid-action"
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? "Importing..." : "Import CSV"}
            </button>
            <button
              id="hr-employees-export-button"
              data-testid="hr-employees-export-button"
              className="btn-grid-action"
              onClick={handleExport}
            >
              Export CSV
            </button>
            <button
              id="hr-employees-create-button"
              data-testid="hr-employees-create-button"
              className="btn btn-primary"
              onClick={() => navigate("/employees/new")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
              New Employee
            </button>
          </div>
        }
      />
      <div className="customers-header employee-master-header">
        <div className="customers-tabs employee-master-tabs">
          <div className="customer-tab active" id="hr-employees-tab" data-testid="hr-employees-tab" data-active="true">Employees ({employees.length})</div>
          <div className="customer-tab" id="hr-contractors-tab" data-testid="hr-contractors-tab" data-active="false">Contractors</div>
        </div>
      </div>

      <div className="customers-toolbar employee-master-toolbar" data-testid="hr-employees-toolbar">
        <div className="employee-master-filters">
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
          <Button
            type="button"
            id="hr-employees-filter-indicator"
            data-testid="hr-employees-filter-indicator"
            variant={appliedFilterCount > 0 ? "primary" : "outline"}
            className={cn(
              "ml-auto flex shrink-0 items-center gap-2 rounded-md px-4 py-2 font-semibold",
              appliedFilterCount > 0
                ? ""
                : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
            )}
            aria-label="Open employee filters"
            onClick={openFilters}
          >
            <FilterIcon />
            <span>Filter</span>
            {appliedFilterCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--color-primary)]">
                {appliedFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="customers-table-container employee-master-table-container" data-testid="hr-employees-table-container">
        <DataTable
          data-testid="hr-employees-table"
          data={error ? [] : filtered}
          columns={columns}
          getRowId={(employee) => employee.id}
          loading={loading}
          onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
          selection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          pagination={{
            page,
            pageSize,
            total: filtered.length,
            mode: "client",
            onChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
          className="rounded-none border-0 shadow-none"
          tableClassName="min-w-[760px] [&_thead_tr]:border-[color:color-mix(in_srgb,var(--color-border)_42%,white)] [&_tbody_tr]:border-[color:color-mix(in_srgb,var(--color-border)_38%,white)] [&_thead_th]:h-12 [&_thead_th]:px-5 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:h-[72px] [&_tbody_td]:px-5 [&_tbody_td]:py-3"
          emptyState={
            <EmptyState
              title={error ? "Could not load employees" : "No matching employees"}
              description={error ? "Please retry after checking the HR service connection." : "Adjust the search or filters to find an employee."}
            />
          }
        />
      </div>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Advanced Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-employees-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Select
              id="hr-employees-department-filter"
              testId="hr-employees-department-filter"
              label="Department"
              value={draftDeptFilter}
              onChange={(e) => setDraftDeptFilter(e.target.value)}
              options={[
                { value: "all", label: "All Departments" },
                ...departments.map((d) => ({ value: d, label: d }))
              ]}
            />
            <Select
              id="hr-employees-status-filter"
              testId="hr-employees-status-filter"
              label="Status"
              value={draftStatusFilter}
              onChange={(e) => setDraftStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "All Statuses" },
                ...statuses.map((status) => ({ value: status, label: status }))
              ]}
            />
            <Select
              id="hr-employees-type-filter"
              testId="hr-employees-type-filter"
              label="Employment Type"
              value={draftTypeFilter}
              onChange={(e) => setDraftTypeFilter(e.target.value)}
              options={[
                { value: "all", label: "All Employment Types" },
                ...employmentTypes.map((type) => ({ value: type, label: type }))
              ]}
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
