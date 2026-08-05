import { useMemo, useState } from "react";
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
  const filterSchema = useMemo(() => schema ? {
    ...schema,
    fields: schema.fields.filter((field) => {
      const key = `${field.key} ${field.label}`.toLowerCase();
      return key.includes("role") || key.includes("designation") || key.includes("department") || key.includes("level");
    }),
  } : null, [schema]);
  const designations = useDesignations(filters, filterSchema, { enabled: !loading, page: page - 1, pageSize });
  const departments = useDepartments();
  const levels = useHierarchyLevels();

  const wrappedDesignations = useMemo(() => {
    return {
      ...designations,
      create: async (payload: Record<string, unknown>) => {
        const levelUid = payload.orgLevelUid as string;
        const matchingLevel = levels.data.find(l => l.id === levelUid);
        const finalPayload = {
          ...payload,
          level: matchingLevel ? Number(matchingLevel.levelNo) : null,
          orgLevelUid: levelUid || null
        };
        return designations.create(finalPayload);
      },
      update: async (uid: string, payload: Record<string, unknown>) => {
        const levelUid = payload.orgLevelUid as string;
        const matchingLevel = levels.data.find(l => l.id === levelUid);
        const finalPayload = {
          ...payload,
          level: matchingLevel ? Number(matchingLevel.levelNo) : null,
          orgLevelUid: levelUid || null
        };
        return designations.update(uid, finalPayload);
      }
    };
  }, [designations, levels.data]);

  return <CrudPanel title="Roles & Designations" subtitle="Job roles / titles, bands & owning department" icon={<BadgeCheck size={20} />} addLabel="Add Role / Designation" hook={wrappedDesignations} automationScope="hr-settings-designations" searchSchema={filterSchema} filterClauses={filters} onFilterClausesChange={setFilters} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} statusToggle={{ isEnabled: (row) => String(row.status || "Enabled").toLowerCase() !== "disabled", onChange: designations.setStatus }} fields={[
    { key: "name", label: "Role / Designation" }, { key: "code", label: "Code" },
    { key: "hrDepartmentUid", label: "Department", type: "select", options: departments.data.map((department) => ({ value: department.id, label: department.name as string })), optional: true },
    { key: "orgLevelUid", label: "Level / Band", type: "select", options: levels.data.map((l) => ({ value: l.id, label: l.label ? `L${l.levelNo} - ${l.label}` : `L${l.levelNo}` })), optional: true },
    { key: "description", label: "Description", type: "textarea", full: true },
  ]} columns={[
    { label: "Role / Designation", render: (row) => <b>{row.name as string}</b> },
    { label: "Code", render: (row) => (row.code as string) || "—" },
    { label: "Department", render: (row) => departments.data.find((department) => department.id === row.hrDepartmentUid)?.name || (row.department as string) || "—" },
    { label: "Level", render: (row) => {
      const byUid = levels.data.find((l) => l.id === row.orgLevelUid);
      const byNo = !byUid && row.level != null ? levels.data.find((l) => l.levelNo === row.level) : null;
      const found = byUid || byNo;
      return found ? (found.label ? `L${found.levelNo} - ${found.label}` : `L${found.levelNo}`) : (row.level != null ? `L${row.level}` : "—");
    } },
  ]} />;
}
