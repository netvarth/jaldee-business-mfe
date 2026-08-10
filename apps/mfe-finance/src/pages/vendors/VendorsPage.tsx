import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Drawer,
  Icon,
  Popover,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { FinanceFeatureLayout, FinanceFilterButton, ServerDataTableCard } from "../../components/FinancePageLayout";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { buildFinanceSearchBody, useVendorsSearchSchema } from "../../lib/financeSearch";

export default function VendorsPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Array<{
    id: string;
    date: string;
    name: string;
    category: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { schema } = useVendorsSearchSchema();

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, schema).length,
    [advancedFilters, schema]
  );

  const openFilters = () => {
    setDraftFilters(
      advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(schema)
    );
    setFiltersOpen(true);
  };

  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(schema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
    setPage(1);
  };

  const resetFilters = () => {
    clearFilters();
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setAdvancedFilters(draftFilters);
    setPage(1);
    setFiltersOpen(false);
  };

  useEffect(() => {
    let active = true;

    async function loadVendors() {
      setLoading(true);
      try {
        const response = await financeApi.vendors.search<any>({
          ...buildFinanceSearchBody(advancedFilters, schema, page - 1, pageSize),
          view: "SUMMARY",
        });

        if (!active) {
          return;
        }

        const records = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.content)
            ? (response.data as any).content
            : Array.isArray((response.data as any)?.data)
              ? (response.data as any).data
              : Array.isArray((response.data as any)?.data?.content)
                ? (response.data as any).data.content
                : [];

        setTotalRecords(Number((response.data as any)?.totalElements ?? (response.data as any)?.total ?? records.length ?? 0) || 0);
        setVendors(
          records.map((item: any, index: number) => {
            const rawDate = item.createdDate ?? item.createdOn ?? item.createdAt ?? item.updatedDate ?? item.date;
            return {
              id: String(item.uid ?? item.id ?? item.vendorId ?? `vendor-${index}`),
              date: rawDate
                ? new Date(rawDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "-",
              name: String(item.name ?? item.vendorName ?? "-"),
              category: String(item.vendorCategoryName ?? item.categoryName ?? item.vendorCategory ?? item.category ?? "-"),
              status: String(item.vendorStatusName ?? item.statusName ?? item.vendorStatus ?? item.status ?? "-"),
            };
          }),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load vendors", error);
        if (active) {
          setVendors([]);
          setTotalRecords(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadVendors();
    return () => {
      active = false;
    };
  }, [page, pageSize, advancedFilters, schema]);

  const columns = useMemo<ColumnDef<(typeof vendors)[number]>[]>(
    () => [
      { key: "date", header: "Date" },
      { key: "name", header: "Name" },
      { key: "category", header: "Category" },
      { key: "status", header: "Status" },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-[52px] px-3 text-[length:var(--text-xs)]"
              onClick={() => navigate(row.id)}
            >
              View
            </Button>
            <Popover
              placement="bottom"
              align="end"
              portal
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={`More actions for vendor ${row.name}`}
                  className="h-8 w-8 px-0"
                  icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                />
              }
            >
              <div className="flex min-w-[120px] flex-col gap-0.5 p-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-8 px-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate(`edit/${row.id}`)}
                  icon={<Icon name="pencil" className="h-3.5 w-3.5 text-slate-500" />}
                >
                  Edit
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <>
      <FinanceFeatureLayout
        title={`Vendors (${totalRecords})`}
      subtitle="Vendor directory for finance operations."
      main={
        <ServerDataTableCard
            actions={
              <div className="flex items-center gap-2">
                <Button onClick={() => navigate("create")}>Create Vendor</Button>
                <FinanceFilterButton
                  testId="finance-vendors-filter"
                  label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
                  active={appliedFilterCount > 0}
                  onClick={openFilters}
                />
              </div>
            }
            data={vendors}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={totalRecords}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            testId="finance-vendors-table"
            emptyTitle="No vendors"
            emptyDescription={loading ? "Loading vendors..." : "Vendor records will appear here."}
          />
      }
    />
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-vendors-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No vendor filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="finance-vendors-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="finance-vendors-filter-apply"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
