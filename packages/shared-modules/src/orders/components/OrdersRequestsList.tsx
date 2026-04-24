import { useMemo, useState } from "react";
import { Badge, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useOrdersRequests } from "../queries/orders";
import { getOrdersStatusVariant } from "../services/orders";
import type { OrdersRequestRow } from "../types";

export function OrdersRequestsList() {
  const { data } = useOrdersRequests();
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;

    return data.filter((row) =>
      [row.id, row.patient, row.prescriptionId, row.source, row.doctor, row.status].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [data, query]);

  const columns = useMemo(
    () => [
      { key: "id", header: "Request ID", sortable: true },
      { key: "patient", header: "Patient", sortable: true },
      { key: "prescriptionId", header: "Prescription" },
      { key: "source", header: "Source" },
      { key: "doctor", header: "Doctor" },
      { key: "itemsRequested", header: "Items", align: "right" as const },
      {
        key: "status",
        header: "Status",
        render: (row: OrdersRequestRow) => <Badge variant={getOrdersStatusVariant(row.status)}>{row.status}</Badge>,
      },
      { key: "requestedOn", header: "Requested On" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Requests" subtitle="Prescription and service requests that can be converted into orders." />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-4">
          <DataTableToolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search requests, patients, or prescriptions"
            recordCount={filteredRows.length}
          />
        </div>
        <DataTable
          data={filteredRows}
          columns={columns}
          emptyState={<EmptyState title="No requests found" description="Incoming prescription requests will appear here." />}
        />
      </SectionCard>
    </div>
  );
}
