import { Button, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard, Switch } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import { useChangeProductTypeStatus, useProductTypeCount, useProductTypes } from "../queries/leads";
import { PRODUCT_TYPE_OPTIONS, unwrapCount, unwrapList } from "../utils";

type ProductTypeRow = {
  uid: string;
  name: string;
  productEnum: string;
  status: string;
};

function toRows(data: unknown): ProductTypeRow[] {
  return unwrapList(data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.id ?? index),
    name: String(item.typeName ?? item.name ?? `Product ${index + 1}`),
    productEnum: String(item.productEnum ?? "UNKNOWN"),
    status: String(item.crmStatus ?? item.status ?? "INACTIVE"),
  }));
}

function getProductTypeLabel(value: string) {
  return PRODUCT_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function ProductTypeList() {
  const { basePath } = useSharedModulesContext();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "leadsProductTypes",
    resetDeps: [appliedQuery],
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filters = useMemo(
    () => ({
      ...(appliedQuery ? { "typeName-like": appliedQuery } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedQuery, page, pageSize]
  );

  const countFilters = useMemo(
    () => ({
      ...(appliedQuery ? { "typeName-like": appliedQuery } : {}),
    }),
    [appliedQuery]
  );

  const itemsQuery = useProductTypes(filters);
  const countQuery = useProductTypeCount(countFilters);
  const changeStatusMutation = useChangeProductTypeStatus();
  const rows = useMemo(() => toRows(itemsQuery.data), [itemsQuery.data]);
  const total = unwrapCount(countQuery.data) || rows.length;

  async function handleStatusChange(uid: string, nextStatus: string) {
    try {
      await changeStatusMutation.mutateAsync({ uid, status: nextStatus });
      await Promise.all([itemsQuery.refetch(), countQuery.refetch()]);
    } catch {
      // no-op
    }
  }

  const columns = useMemo<ColumnDef<ProductTypeRow>[]>(
    () => [
      { key: "name", header: "Product/Service", render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
      { key: "productEnum", header: "Product Type", render: (row) => getProductTypeLabel(row.productEnum) },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={String(row.status).toUpperCase() === "ACTIVE"}
              onChange={(checked) => void handleStatusChange(row.uid, checked ? "ACTIVE" : "INACTIVE")}
            disabled={changeStatusMutation.isPending}
            />
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                window.location.assign(`${basePath}/product-type/details/${row.uid}`);
              }}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                window.location.assign(`${basePath}/product-type/update/${row.uid}`);
              }}
            >
              Update
            </Button>
          </div>
        ),
      },
    ],
    [basePath, changeStatusMutation.isPending]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product / Service"
        subtitle="Manage lead products and service types from the old lead manager."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={<Button onClick={() => window.location.assign(`${basePath}/product-type/create`)}>Create</Button>}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={query}
                onQueryChange={setQuery}
                searchPlaceholder="Search with Product/Service"
                recordCount={total}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-[38px] w-[44px] items-center justify-center rounded-md border border-slate-200 bg-white text-[#4C1D95] shadow-sm"
                aria-label="Filters"
                title="Filters"
              >
                <FilterIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.uid}
            loading={itemsQuery.isLoading || countQuery.isLoading}
            onRowClick={(row) => window.location.assign(`${basePath}/product-type/details/${row.uid}`)}
            pagination={{ page, pageSize, total, onChange: setPage, onPageSizeChange: setPageSize, mode: "server" }}
            emptyState={<EmptyState title="No product / service records found" description="Create a product / service to configure lead capture." />}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5h18l-7 8v5.5a1 1 0 0 1-1.5.86l-2-1.15a1 1 0 0 1-.5-.86V13L3 5z" />
    </svg>
  );
}
