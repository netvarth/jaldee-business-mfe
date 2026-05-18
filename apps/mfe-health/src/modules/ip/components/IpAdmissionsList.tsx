import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Input, SectionCard, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";
import { useIpAdmissions } from "../queries/ip";
import type { IpAdmissionRow } from "../types";

export function IpAdmissionsList() {
  const admissionsQuery = useIpAdmissions();
  const admissions = admissionsQuery.data ?? [];
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return admissions.filter((row) => {
      if (!normalizedSearch) return true;
      return (
        row.patient.toLowerCase().includes(normalizedSearch) ||
        row.id.toLowerCase().includes(normalizedSearch) ||
        row.reason.toLowerCase().includes(normalizedSearch) ||
        row.room.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [admissions, search]);

  const columns = useMemo<ColumnDef<IpAdmissionRow>[]>(
    () => [
      { key: "id", header: "Admission ID" },
      { key: "patient", header: "Patient" },
      { key: "reason", header: "Reason" },
      { key: "room", header: "Room" },
      { key: "admittedOn", header: "Admitted Date" },
      { key: "expectedDischarge", header: "Expected Discharge" },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate(`${basePath}/details/${row.id}`)}
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    [basePath]
  );

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-900">Admissions</div>
            <div className="text-sm text-slate-500">Admission queue and discharge expectations.</div>
          </div>
          <Button type="button" variant="primary" onClick={() => navigate(`${basePath}/admissions/new`)}>
            New Admission
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-lg font-semibold text-slate-900">
              Admission List {filteredRows.length ? <span className="text-slate-500">({filteredRows.length})</span> : null}
            </div>
            <div className="w-full lg:max-w-[320px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient, admission ID, room"
              />
            </div>
          </div>

          <DataTable
            data={filteredRows}
            columns={columns}
            loading={admissionsQuery.isLoading}
            className="rounded-xl border-slate-200 shadow-none"
            tableClassName="[&_table]:table-fixed [&_thead_th]:bg-slate-50 [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:whitespace-normal [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:text-sm [&_tbody_td]:align-top [&_tbody_td]:whitespace-normal [&_tbody_td]:break-words"
            emptyState={
              <EmptyState
                title="No admissions found"
                description="Live admission entries will appear here once IP cases are created."
              />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}

