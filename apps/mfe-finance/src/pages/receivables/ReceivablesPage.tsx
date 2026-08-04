import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import {
  Button,
  Drawer,
  Icon,
  Popover,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import type { FinanceReceivable } from "../../lib/financeData";
import { formatCurrency } from "../../lib/financeData";
import { financeApi } from "../../lib/financeApi";
import { buildFinanceSearchBody, buildLocationCondition, useFinanceSearchSchema } from "../../lib/financeSearch";
import { normalizeReceivableRows } from "../../lib/receivableMappers";
import { normalizeReceivableSearchSchema } from "../../lib/receivableSearchFields";
import { FinanceFeatureLayout, FinanceFilterButton, ServerDataTableCard } from "../../components/FinancePageLayout";

export default function ReceivablesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeReceivables, setFinanceReceivables] = useState<FinanceReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { schema: receivableSchema } = useFinanceSearchSchema();
  const filterSchema = useMemo(
    () => normalizeReceivableSearchSchema(receivableSchema),
    [receivableSchema]
  );
  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, filterSchema).length,
    [advancedFilters, filterSchema]
  );

  const openFilters = () => {
    setDraftFilters(
      advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(filterSchema)
    );
    setFiltersOpen(true);
  };

  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(filterSchema);
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

    async function loadReceivables() {
      setLoading(true);
      try {
        const fixedConditions = buildLocationCondition(filterSchema, mfeProps.location?.id);
        const response = await financeApi.revenue.list<any>({
          ...buildFinanceSearchBody(advancedFilters, filterSchema, page - 1, pageSize, fixedConditions),
        });
        if (!active) {
          return;
        }

        const payload = response.data;
        const normalizedRows = normalizeReceivableRows(payload);
        setFinanceReceivables(normalizedRows);
        setTotalRecords(Number((payload as any)?.totalElements ?? (payload as any)?.total ?? normalizedRows.length ?? 0) || 0);
      } catch (error) {
        console.error("[mfe-finance] Failed to load receivables", error);
        if (active) {
          setFinanceReceivables([]);
          setTotalRecords(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReceivables();

    return () => {
      active = false;
    };
  }, [advancedFilters, filterSchema, mfeProps.location?.id, page, pageSize]);

  const columns = useMemo<ColumnDef<(typeof financeReceivables)[number]>[]>(
    () => [
      { key: "date", header: "Date", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "amountDue", header: "Amount", align: "right", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4", render: (row) => formatCurrency(row.amountDue) },
      { key: "revenueCategory", header: "Revenue Category", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "invoiceCategory", header: "Invoice Category", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "invoiceNo", header: "Invoice No.", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "reference", header: "Reference", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "patientName", header: "Patient Name", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "vendor", header: "Vendor", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "location", header: "Location", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "status", header: "Status", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4 text-right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-[52px] px-3 text-[length:var(--text-xs)]"
              data-testid={`finance-revenue-edit-${row.id}`}
              onClick={() => navigate(`edit/${row.id}`)}
            >
              Edit
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
                  aria-label={`More actions for revenue ${row.invoiceNo || row.id}`}
                  className="h-8 w-8 px-0"
                  data-testid={`finance-revenue-more-${row.id}`}
                  icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                />
              }
            >
              <div className="flex min-w-[160px] flex-col gap-1">
                <Button variant="ghost" className="w-full justify-start" data-testid={`finance-revenue-more-edit-${row.id}`} onClick={() => navigate(`edit/${row.id}`)}>
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
        title={`Revenue (${totalRecords})`}
        subtitle="Outstanding incoming balances and collections ownership."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("create")}>Add Revenue</Button>
          </div>
        }
        main={
          <ServerDataTableCard
              actions={
                <FinanceFilterButton
                  testId="finance-revenue-filter"
                  label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
                  active={appliedFilterCount > 0}
                  onClick={openFilters}
                />
              }
              data={financeReceivables}
              columns={columns}
              getRowId={(row) => row.id}
              loading={loading}
              page={page}
              pageSize={pageSize}
              total={totalRecords}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              testId="finance-revenue-table"
              emptyTitle="No Revenue"
              emptyDescription={loading ? "Loading revenue..." : "Revenue will appear here."}
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
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-revenue-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={filterSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No receivable filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="finance-revenue-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="finance-revenue-filter-apply"
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
