import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Input, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";
import { useIpBeds } from "../queries/ip";
import type { IpBedRow } from "../types";
import { StatusPill } from "./shared";

type BedFilter = "ALL" | IpBedRow["occupancy"];

function getTone(occupancy: IpBedRow["occupancy"]) {
  if (occupancy === "Available") return "teal" as const;
  if (occupancy === "Cleaning") return "amber" as const;
  return "rose" as const;
}

export function IpBedsList() {
  const bedsQuery = useIpBeds();
  const beds = bedsQuery.data ?? [];
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BedFilter>("ALL");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return beds.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.id.toLowerCase().includes(normalizedSearch) ||
        row.ward.toLowerCase().includes(normalizedSearch) ||
        row.bed.toLowerCase().includes(normalizedSearch) ||
        (row.patient ?? "").toLowerCase().includes(normalizedSearch);

      const matchesFilter = filter === "ALL" ? true : row.occupancy === filter;
      return matchesSearch && matchesFilter;
    });
  }, [beds, filter, search]);

  const columns = useMemo<ColumnDef<IpBedRow>[]>(
    () => [
      { key: "id", header: "Bed ID" },
      { key: "ward", header: "Ward / Room" },
      { key: "bed", header: "Bed" },
      {
        key: "patient",
        header: "Assigned Patient",
        render: (row) => row.patient || <span className="text-slate-400">Unassigned</span>,
      },
      {
        key: "occupancy",
        header: "Occupancy",
        render: (row) => <StatusPill tone={getTone(row.occupancy)}>{row.occupancy}</StatusPill>,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-900">Bed Management</div>
            <div className="text-sm text-slate-500">Bed occupancy, availability, and housekeeping transitions.</div>
          </div>
          <Button type="button" variant="primary" onClick={() => navigate(`${basePath}/occupancy`)}>
            Open Occupancy
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-lg font-semibold text-slate-900">
              Bed List {filteredRows.length ? <span className="text-slate-500">({filteredRows.length})</span> : null}
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr),200px] lg:max-w-[460px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ward, room, bed, patient"
              />
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value as BedFilter)}
                options={[
                  { value: "ALL", label: "All Beds" },
                  { value: "Occupied", label: "Occupied" },
                  { value: "Available", label: "Available" },
                  { value: "Cleaning", label: "Cleaning" },
                ]}
              />
            </div>
          </div>

          <DataTable
            data={filteredRows}
            columns={columns}
            loading={bedsQuery.isLoading}
            className="rounded-xl border-slate-200 shadow-none"
            tableClassName="[&_table]:table-fixed [&_thead_th]:bg-slate-50 [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:whitespace-normal [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:text-sm [&_tbody_td]:align-top [&_tbody_td]:whitespace-normal [&_tbody_td]:break-words"
            emptyState={
              <EmptyState title="No beds found" description="Live bed occupancy records will appear here once beds are configured." />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}

