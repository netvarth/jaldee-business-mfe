import { Button, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useLeads, useLeadsCount } from "../queries/leads";
import { formatDate, fullName, mapLeadStatusLabel, unwrapCount, unwrapList } from "../utils";
import { StatusBadge } from "./shared";

type LeadRow = {
  uid: string;
  referenceNo: string;
  prospect: string;
  phone: string;
  email: string;
  channel: string;
  location: string;
  status: string;
  leadDate: string;
};

function toRows(data: unknown): LeadRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    referenceNo: String(item.referenceNo ?? `LEAD-${index + 1}`),
    prospect: fullName(item),
    phone: item.consumerPhone ? `${item.consumerCountryCode ?? ""} ${item.consumerPhone}`.trim() : "-",
    email: String(item.consumerEmail ?? "-"),
    channel: String(item.channelName ?? item.channel?.name ?? "-"),
    location: String(item.locationName ?? item.location?.place ?? "-"),
    status: String(item.internalStatus ?? item.status ?? ""),
    leadDate: formatDate(item.leadDate ?? item.createdDate),
  }));
}

export function LeadsList() {
  const { basePath } = useSharedModulesContext();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [appliedQuery, pageSize, status]);

  const filters = useMemo(
    () => ({
      ...(appliedQuery ? { "referenceNo-like": appliedQuery } : {}),
      ...(status !== "all" ? { "internalStatus-eq": status } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, page, pageSize, status]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedQuery ? { "referenceNo-like": appliedQuery } : {}),
      ...(status !== "all" ? { "internalStatus-eq": status } : {}),
    }),
    [appliedQuery, status]
  );

  const leadsQuery = useLeads(filters);
  const leadsCountQuery = useLeadsCount(countFilters);
  const rows = useMemo(() => toRows(leadsQuery.data), [leadsQuery.data]);
  const total = unwrapCount(leadsCountQuery.data) || rows.length;

  const columns = useMemo<ColumnDef<LeadRow>[]>(
    () => [
      { key: "referenceNo", header: "Lead ID", render: (row) => <span className="font-semibold text-slate-900">{row.referenceNo}</span> },
      { key: "prospect", header: "Prospect" },
      { key: "channel", header: "Channel" },
      { key: "location", header: "Location" },
      { key: "leadDate", header: "Lead Date" },
      { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/leads/details/${row.uid}`);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Track inbound leads, their channels, locations, and lifecycle status."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={<Button onClick={() => window.location.assign(`${basePath}/leads/create`)}>Create</Button>}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={query}
                onQueryChange={setQuery}
                searchPlaceholder="Search by lead ID..."
                recordCount={total}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="lead-status-filter" className="text-sm text-slate-500">
                Status
              </label>
              <select
                id="lead-status-filter"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="all">All</option>
                <option value="ACTIVE">{mapLeadStatusLabel("ACTIVE")}</option>
                <option value="COMPLETED">{mapLeadStatusLabel("COMPLETED")}</option>
                <option value="REJECTED">{mapLeadStatusLabel("REJECTED")}</option>
                <option value="NO_RESPONSE">{mapLeadStatusLabel("NO_RESPONSE")}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={leadsQuery.isLoading || leadsCountQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/leads/details/${row.uid}`)}
            pagination={{
              page,
              pageSize,
              total,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<EmptyState title="No leads found" description="Adjust the current filters or create a new lead." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}
