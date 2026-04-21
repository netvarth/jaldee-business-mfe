import { Button, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useLeadCustomers, useLeadCustomersCount } from "../queries/leads";
import { fullName, unwrapCount, unwrapList } from "../utils";

type CustomerRow = {
  uid: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
};

function toRows(data: unknown): CustomerRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    name: fullName(item),
    phone: item.phone ? `${item.countryCode ?? ""} ${item.phone}`.trim() : "-",
    email: String(item.email ?? "-"),
    city: String(item.city ?? "-"),
    state: String(item.state ?? "-"),
  }));
}

export function LeadCustomersList() {
  const { basePath } = useSharedModulesContext();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [appliedQuery, pageSize]);

  const filters = useMemo(
    () => ({
      ...(appliedQuery ? { "firstName-like": appliedQuery } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, page, pageSize]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedQuery ? { "firstName-like": appliedQuery } : {}),
    }),
    [appliedQuery]
  );

  const itemsQuery = useLeadCustomers(filters);
  const countQuery = useLeadCustomersCount(countFilters);
  const rows = useMemo(() => toRows(itemsQuery.data), [itemsQuery.data]);
  const total = unwrapCount(countQuery.data) || rows.length;

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      { key: "name", header: "Prospect", render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
      { key: "phone", header: "Mobile" },
      { key: "email", header: "Email" },
      { key: "city", header: "City" },
      { key: "state", header: "State" },
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
              window.location.assign(`${basePath}/customers/update/${row.uid}`);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [basePath]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospects"
        subtitle="Manage CRM lead-manager prospects."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={<Button onClick={() => window.location.assign(`${basePath}/customers/create`)}>Create</Button>}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <DataTableToolbar query={query} onQueryChange={setQuery} searchPlaceholder="Search prospects..." recordCount={total} />
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={itemsQuery.isLoading || countQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/customers/update/${row.uid}`)}
            pagination={{ page, pageSize, total, onChange: setPage, onPageSizeChange: setPageSize, mode: "server" }}
            emptyState={<EmptyState title="No prospects found" description="Create a prospect or adjust the current search." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

