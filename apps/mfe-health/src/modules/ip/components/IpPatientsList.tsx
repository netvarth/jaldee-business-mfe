import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Input, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";
import { useIpPatients } from "../queries/ip";
import type { IpPatientRow } from "../types";
import { StatusPill } from "./shared";

type PatientStatusFilter = "ALL" | "Admitted" | "Under Observation" | "Ready for Discharge";

function getStatusTone(status: IpPatientRow["status"]) {
  if (status === "Ready for Discharge") return "amber" as const;
  if (status === "Under Observation") return "sky" as const;
  return "teal" as const;
}

export function IpPatientsList() {
  const patientsQuery = useIpPatients();
  const patients = patientsQuery.data ?? [];
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatusFilter>("Admitted");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return patients.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.patient.toLowerCase().includes(normalizedSearch) ||
        row.id.toLowerCase().includes(normalizedSearch) ||
        row.attendingDoctor.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "ALL" ? true : row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  const columns = useMemo<ColumnDef<IpPatientRow>[]>(
    () => [
      {
        key: "id",
        header: "IP ID",
        render: (row) => (
          <button
            type="button"
            onClick={() => navigate(`${basePath}/details/${row.id}`)}
            className="font-semibold text-indigo-700 hover:text-indigo-800"
          >
            {row.id}
          </button>
        ),
      },
      {
        key: "patient",
        header: "Patient Info",
        render: (row) => (
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">{row.patient}</div>
            <div className="text-xs text-slate-500">{row.ward}</div>
          </div>
        ),
      },
      {
        key: "attendingDoctor",
        header: "Doctor",
      },
      {
        key: "admittedOn",
        header: "Admitted Date",
      },
      {
        key: "stayDays",
        header: "Stay",
        render: (row) => `${row.stayDays} day${row.stayDays === 1 ? "" : "s"}`,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusPill tone={getStatusTone(row.status)}>{row.status}</StatusPill>,
      },
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
          <button
            type="button"
            onClick={() => navigate(`${basePath}/dashboard`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
          <Button type="button" variant="primary" onClick={() => navigate(`${basePath}/admissions/new`)}>
            New Admission
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xl font-semibold text-slate-900">
                IP Patients {filteredRows.length ? <span className="text-slate-500">({filteredRows.length})</span> : null}
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr),200px] lg:max-w-[460px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient with name, IP ID"
              />
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PatientStatusFilter)}
                options={[
                  { value: "ALL", label: "All Patients" },
                  { value: "Admitted", label: "Admitted" },
                  { value: "Under Observation", label: "Under Observation" },
                  { value: "Ready for Discharge", label: "Ready for Discharge" },
                ]}
              />
            </div>
          </div>

          <DataTable
            data={filteredRows}
            columns={columns}
            loading={patientsQuery.isLoading}
            className="rounded-xl border-slate-200 shadow-none"
            tableClassName="[&_table]:table-fixed [&_thead_th]:bg-slate-50 [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:whitespace-normal [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:text-sm [&_tbody_td]:align-top [&_tbody_td]:whitespace-normal [&_tbody_td]:break-words"
            emptyState={
              <EmptyState
                title="No inpatients found"
                description="Live inpatient records will appear here once admissions exist."
              />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}

