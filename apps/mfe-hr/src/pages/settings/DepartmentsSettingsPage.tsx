import { useState } from "react";
import { Users2 } from "lucide-react";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useDepartments } from "../../services/useSettingsData";
import { useDepartmentSearchSchema } from "../../services/useHrSearchSchema";
import { CrudPanel } from "./SettingsComponents";

export function DepartmentsSettingsPage() {
  const [filters, setFilters] = useState<SearchFilterClause[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { schema, loading } = useDepartmentSearchSchema();
  const departments = useDepartments(filters, schema, { enabled: !loading, page: page - 1, pageSize });
  return <CrudPanel title="Departments" subtitle="Organizational units" icon={<Users2 size={20} />} addLabel="Add Department" hook={departments} automationScope="hr-settings-departments" searchSchema={schema} filterClauses={filters} onFilterClausesChange={setFilters} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} statusToggle={{ isEnabled: (row) => String(row.status || "Enabled").toLowerCase() !== "disabled", onChange: departments.setStatus }} fields={[{ key: "name", label: "Department Name" }, { key: "code", label: "Code" }]} columns={[{ label: "Name", render: (row) => <b>{row.name as string}</b> }, { label: "Code", render: (row) => (row.code as string) || "—" }]} />;
}
