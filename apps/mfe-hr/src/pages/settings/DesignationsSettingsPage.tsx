import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useDepartments, useDesignations } from "../../services/useSettingsData";
import { useDesignationSearchSchema } from "../../services/useHrSearchSchema";
import { useHierarchyLevels } from "../../services/useOrg";
import { CrudPanel } from "./SettingsComponents";

export function DesignationsSettingsPage() {
  const [filters, setFilters] = useState<SearchFilterClause[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { schema, loading } = useDesignationSearchSchema();
  const designations = useDesignations(filters, schema, { enabled: !loading, page: page - 1, pageSize });
  const departments = useDepartments();
  const levels = useHierarchyLevels();
  return <CrudPanel title="Roles & Designations" subtitle="Job roles / titles, bands & owning department" icon={<BadgeCheck size={20} />} addLabel="Add Role / Designation" hook={designations} automationScope="hr-settings-designations" searchSchema={schema} filterClauses={filters} onFilterClausesChange={setFilters} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} statusToggle={{ isEnabled: (row) => String(row.status || "Enabled").toLowerCase() !== "disabled", onChange: designations.setStatus }} fields={[
    { key: "name", label: "Role / Designation" }, { key: "code", label: "Code" },
    { key: "hrDepartmentUid", label: "Department", type: "select", options: departments.data.map((department) => ({ value: department.id, label: department.name as string })), optional: true },
    { key: "level", label: "Level / Band", type: "select", options: levels.data.map((l) => ({ value: String(l.levelNo), label: l.label ? `L${l.levelNo} - ${l.label}` : `L${l.levelNo}` })), optional: true },
    { key: "description", label: "Description", type: "textarea", full: true },
  ]} columns={[
    { label: "Role / Designation", render: (row) => <b>{row.name as string}</b> },
    { label: "Code", render: (row) => (row.code as string) || "—" },
    { label: "Department", render: (row) => departments.data.find((department) => department.id === row.hrDepartmentUid)?.name || (row.department as string) || "—" },
    { label: "Level", render: (row) => row.level != null ? `L${row.level}` : "—" },
  ]} />;
}
