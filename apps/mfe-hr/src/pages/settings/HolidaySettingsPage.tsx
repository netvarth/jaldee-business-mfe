import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useHolidays } from "../../services/useSettingsData";
import { useHolidaySearchSchema } from "../../services/useHrSearchSchema";
import { CrudPanel } from "./SettingsComponents";

export function HolidaySettingsPage() {
  const [filters, setFilters] = useState<SearchFilterClause[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { schema, loading } = useHolidaySearchSchema();
  const holidays = useHolidays(filters, schema, { enabled: !loading, page: page - 1, pageSize });
  return <CrudPanel title="Holiday Calendar" subtitle="Company holidays & observances" icon={<CalendarDays size={20} />} addLabel="Add Holiday" hook={holidays} automationScope="hr-settings-holidays" searchSchema={schema} filterClauses={filters} onFilterClausesChange={setFilters} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} statusToggle={{ isEnabled: (row) => String(row.status || "Enabled").toLowerCase() !== "disabled", onChange: holidays.setStatus }} fields={[
    { key: "name", label: "Holiday Name" }, { key: "date", label: "Date", type: "date" },
    { key: "type", label: "Type", type: "select", options: ["Public", "Optional", "Restricted"] },
  ]} columns={[
    { label: "Holiday", render: (row) => <b>{row.name as string}</b> },
    { label: "Date", render: (row) => (row.date as string) || "—" },
    { label: "Type", render: (row) => (row.type as string) || "—" },
  ]} />;
}
