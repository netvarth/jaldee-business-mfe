import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Select } from "@jaldee/design-system";
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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[],
    [employees]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesQ = !q ||
        e.name?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || e.department === deptFilter;
      return matchesQ && matchesDept;
    });
  }, [employees, searchTerm, deptFilter]);

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
      />
      <div className="customers-header">
        <div className="customers-tabs">
          <div className="customer-tab active" id="hr-employees-tab" data-testid="hr-employees-tab" data-active="true">Employees ({employees.length})</div>
          <div className="customer-tab" id="hr-contractors-tab" data-testid="hr-contractors-tab" data-active="false">Contractors</div>
        </div>
      </div>

      <div className="customers-toolbar" data-testid="hr-employees-toolbar">
        <div style={{ display: "flex", gap: 12, flex: 1, alignItems: "center" }}>
          <Select
            id="hr-employees-department-filter"
            testId="hr-employees-department-filter"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            containerClassName="w-[160px]"
            fullWidth={false}
            options={[
              { value: "all", label: "All Depts" },
              ...departments.map((d) => ({ value: d, label: d }))
            ]}
          />
          <div className="c-search-bar" style={{ flex: 1, maxWidth: 320 }}>
            <input
              id="hr-employees-search"
              data-testid="hr-employees-search"
              type="text"
              placeholder="Enter name, email or ID"
              className="c-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="c-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /></svg>
          </div>
          <div className="c-filter-btn" id="hr-employees-filter-indicator" data-testid="hr-employees-filter-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--primary-color)" stroke="none"><path d="M3 4c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v2.5c0 .6-.2 1.1-.6 1.5L14 14.2V21c0 .8-.5 1.4-1.2 1.8l-2 1c-1 .5-2.2-.2-2.2-1.3v-8.3L3.6 8A2.2 2.2 0 0 1 3 6.5V4z" /></svg>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            id="hr-employees-import-button"
            data-testid="hr-employees-import-button"
            className="btn-grid-action"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "8px", fontWeight: 600 }}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? "Importing..." : "Import CSV"}
          </button>
          <button
            id="hr-employees-export-button"
            data-testid="hr-employees-export-button"
            className="btn-grid-action"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "8px", fontWeight: 600 }}
            onClick={handleExport}
          >
            Export CSV
          </button>
          <button
            id="hr-employees-create-button"
            data-testid="hr-employees-create-button"
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "8px", border: "none", backgroundColor: "var(--primary-color)", color: "white", cursor: "pointer", fontWeight: 600 }}
            onClick={() => navigate("/employees/new")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
            New Employee
          </button>
        </div>
      </div>

      <div className="customers-table-container" data-testid="hr-employees-table-container">
        {error ? (
          <div style={{ textAlign: "center", padding: "32px", color: "var(--danger-color)" }}>Could not load employees.</div>
        ) : (
          <table className="data-grid" data-testid="hr-employees-table">
            <thead>
              <tr>
                <th style={{ width: 48, textAlign: "center" }}><input id="hr-employees-select-all" data-testid="hr-employees-select-all" type="checkbox" /></th>
                <th>Employee &amp; ID</th>
                <th>Department / Designation</th>
                <th>Status</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="employees-table-body">
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--light-text)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--light-text)" }}>No matching employees.</td></tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} data-testid={`hr-employee-row-${e.id}`} onClick={() => navigate(`/employees/${e.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ textAlign: "center" }} onClick={(ev) => ev.stopPropagation()}><input id={`hr-employee-select-${e.id}`} data-testid={`hr-employee-select-${e.id}`} type="checkbox" /></td>
                    <td>
                      <div className="customer-name-cell">
                        {e.photoUrl ? (
                          <img src={e.photoUrl} alt={e.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div className="customer-avatar" style={{ backgroundColor: "var(--primary-color)", color: "white" }}>
                            {initials(e.name)}
                          </div>
                        )}
                        <div>
                          <span className="c-name">{e.name || "Unknown"}</span>
                          <span className="c-id">{e.employeeId || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{e.department || "-"}</div>
                      <div style={{ fontSize: 12, color: "var(--light-text)" }}>{e.designation || "-"}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: e.status === "Active" ? "var(--success-bg)" : "var(--warning-bg)", color: e.status === "Active" ? "var(--success-color)" : "var(--warning-color)", padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{e.status || "-"}</span>
                    </td>
                    <td>{e.employmentType || "-"}</td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <div className="c-actions">
                        <button className="btn-grid-action" id={`hr-employee-view-${e.id}`} data-testid={`hr-employee-view-${e.id}`} onClick={() => navigate(`/employees/${e.id}`)}>View</button>
                        <button className="btn-grid-action" id={`hr-employee-edit-${e.id}`} data-testid={`hr-employee-edit-${e.id}`} onClick={() => navigate(`/employees/${e.id}?edit=true`)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Edit
                        </button>
                        <button className="btn-grid-action" id={`hr-employee-delete-${e.id}`} data-testid={`hr-employee-delete-${e.id}`} onClick={() => handleDelete(e)} style={{ color: "var(--danger-color)" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
