import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Input, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";
import { useIpBilling } from "../queries/ip";
import type { IpBillingRow } from "../types";
import { StatusPill } from "./shared";

type BillingFilter = "ALL" | IpBillingRow["status"];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getTone(status: IpBillingRow["status"]) {
  if (status === "Paid") return "teal" as const;
  if (status === "Partial") return "amber" as const;
  return "rose" as const;
}

export function IpBillingList() {
  const billingQuery = useIpBilling();
  const billing = billingQuery.data ?? [];
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BillingFilter>("ALL");

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return billing.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.id.toLowerCase().includes(normalizedSearch) ||
        row.patient.toLowerCase().includes(normalizedSearch) ||
        row.invoice.toLowerCase().includes(normalizedSearch);

      const matchesFilter = filter === "ALL" ? true : row.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [billing, filter, search]);

  const columns = useMemo<ColumnDef<IpBillingRow>[]>(
    () => [
      { key: "invoice", header: "Invoice" },
      { key: "patient", header: "Patient" },
      {
        key: "amount",
        header: "Outstanding",
        render: (row) => formatCurrency(row.amount),
      },
      { key: "dueOn", header: "Due On" },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusPill tone={getTone(row.status)}>{row.status}</StatusPill>,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`${basePath}/invoice/${row.id}`)}>
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
            <div className="text-xl font-semibold text-slate-900">IP Billing</div>
            <div className="text-sm text-slate-500">Outstanding inpatient invoices and collection status.</div>
          </div>
          <Button type="button" variant="primary" onClick={() => navigate(`${basePath}/master-invoice/all`)}>
            Open Master Invoice
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-lg font-semibold text-slate-900">
              Billing Queue {filteredRows.length ? <span className="text-slate-500">({filteredRows.length})</span> : null}
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr),200px] lg:max-w-[460px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, patient"
              />
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value as BillingFilter)}
                options={[
                  { value: "ALL", label: "All Billing" },
                  { value: "Pending", label: "Pending" },
                  { value: "Partial", label: "Partial" },
                  { value: "Paid", label: "Paid" },
                ]}
              />
            </div>
          </div>

          <DataTable
            data={filteredRows}
            columns={columns}
            loading={billingQuery.isLoading}
            className="rounded-xl border-slate-200 shadow-none"
            tableClassName="[&_table]:table-fixed [&_thead_th]:bg-slate-50 [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:whitespace-normal [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:text-sm [&_tbody_td]:align-top [&_tbody_td]:whitespace-normal [&_tbody_td]:break-words"
            emptyState={
              <EmptyState title="No IP billing found" description="Live inpatient invoices will appear here once billing records exist." />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}

