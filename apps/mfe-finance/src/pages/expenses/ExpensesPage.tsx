import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import { Button, Drawer, Icon, Popover, Select, Switch } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import type { FinanceExpense } from "../../lib/financeData";
import { formatCurrency } from "../../lib/financeData";
import { financeApi } from "../../lib/financeApi";
import { buildFinanceSearchBody, buildLocationCondition, useExpensesSearchSchema } from "../../lib/financeSearch";
import { normalizeReceivableSearchSchema } from "../../lib/receivableSearchFields";
import { FinanceFilterButton, PageShell, ServerDataTableCard } from "../../components/FinancePageLayout";

function normalizeExpenseRows(payload: any): FinanceExpense[] {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.results)
            ? payload.results
            : [];

  return records.map((item: any, index: number) => {
    const providerConsumer = item?.providerConsumerDto;
    const ownerName = providerConsumer?.firstName
      ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
      : String(item?.createdByName || item?.userName || item?.owner || "Finance");
    const bookedDate = item?.paidDate || item?.receivedDate || item?.bookedOn || item?.expenseDate || item?.createdDate;
    const title = String(item?.expenseFor || item?.title || item?.categoryName || item?.name || item?.description || item?.notes || "-");
    const category = String(item?.categoryName || item?.expenseCategoryName || item?.category || "General");
    const amount = Number(item?.amount || item?.totalAmount || item?.expenseAmount || 0) || 0;
    const amountPaid = Number(item?.amountPaid || item?.paidAmount || item?.amountPaidTotal || 0) || 0;
    const amountDue = Number(item?.amountDue || item?.dueAmount || item?.balanceAmount || amount) || 0;
    const locationName = String(item?.locationName || item?.location?.name || item?.location?.place || "-");
    const status = item?.payoutCreated ? "Converted" : String(item?.expenseStatusName || item?.statusName || item?.status || "New");

    return {
      id: String(item?.paymentsOutUid || item?.payInOutUid || item?.uid || item?.id || item?.expenseUid || `expense-${index}`),
      expenseNum: String(item?.expenseNum || item?.expenseNumber || item?.encId || item?.expenseUid || item?.uid || item?.id || `expense-${index}`),
      title,
      category,
      owner: ownerName,
      amount,
      amountPaid,
      amountDue,
      bookedOn: bookedDate ? new Date(bookedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-",
      expenseUid: item?.expenseUid ? String(item.expenseUid) : item?.uid ? String(item.uid) : undefined,
      locationName,
      status,
      payoutCreated: Boolean(item?.payoutCreated),
      isEdit: Boolean(item?.isEdit),
    };
  });
}

export default function ExpensesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeExpenses, setFinanceExpenses] = useState<FinanceExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(false);
  const [settingsUpdating, setSettingsUpdating] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { schema: expenseSchema } = useExpensesSearchSchema();
  const filterSchema = useMemo(() => normalizeReceivableSearchSchema(expenseSchema), [expenseSchema]);
  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, filterSchema).length,
    [advancedFilters, filterSchema]
  );

  const openFilters = () => {
    setDraftFilters(advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(filterSchema));
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

    async function loadSettings() {
      try {
        const response = await financeApi.settings.provider();
        if (!active || !response.data) return;
        const data: any = response.data;
        const isAutoPayoutEnabled =
          data.autoPayoutOnExpenseStatus === "Enabled" ||
          data.autoPayoutOnExpense === "Enabled" ||
          data.expenseAutoPayoutStatus === "Enabled" ||
          data.enableAutoPayoutOnExpense === true ||
          data.autoPayoutOnExpenseEnabled === true ||
          data.expenseAutoPayoutEnabled === true;
        setAutoPayoutEnabled(Boolean(isAutoPayoutEnabled));
      } catch (error) {
        console.error("[mfe-finance] Failed to load expense settings", error);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadExpenses() {
      setLoading(true);
      try {
        const fixedConditions = buildLocationCondition(filterSchema, mfeProps.location?.id);
        const response = await financeApi.expenses.list<any>({
          ...buildFinanceSearchBody(advancedFilters, filterSchema, page - 1, pageSize, fixedConditions),
        });
        if (active) {
          const payload = response.data;
          const normalizedRows = normalizeExpenseRows(payload);
          setFinanceExpenses(normalizedRows);
          setTotalRecords(Number((payload as any)?.totalElements ?? (payload as any)?.total ?? normalizedRows.length ?? 0) || 0);
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load expenses", error);
        if (active) {
          setFinanceExpenses([]);
          setTotalRecords(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadExpenses();

    return () => {
      active = false;
    };
  }, [advancedFilters, filterSchema, mfeProps.location?.id, page, pageSize]);

  async function handleToggleAutoPayout(checked: boolean) {
    setSettingsUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.expenseAutoPayout(nextStatus);
      setAutoPayoutEnabled(checked);
    } catch (error) {
      console.error("[mfe-finance] Failed to update auto payout on expense", error);
    } finally {
      setSettingsUpdating(false);
    }
  }

  const columns = useMemo<ColumnDef<(typeof financeExpenses)[number]>[]>(
    () => [
      { key: "bookedOn", header: "Date", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "amount",
        header: "Amount (₹)",
        align: "right",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatCurrency(row.amount).replace("₹", "").trim(),
      },
      {
        key: "amountPaid",
        header: "Amount Paid(₹)",
        align: "right",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatCurrency(row.amountPaid).replace("₹", "").trim(),
      },
      {
        key: "amountDue",
        header: "Amount Due(₹)",
        align: "right",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => formatCurrency(row.amountDue).replace("₹", "").trim(),
      },
      { key: "category", header: "Category", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "expenseNum",
        header: "Expense ID",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.expenseNum || row.id,
      },
      {
        key: "locationName",
        header: "Location",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.locationName || "-",
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) =>
          row.payoutCreated || row.status === "Converted" ? (
            <span className="text-sm text-slate-700">Converted</span>
          ) : (
            <span className="inline-flex rounded-lg bg-violet-100 px-2.5 py-1 text-sm font-semibold text-violet-700">
              {row.status || "New"}
            </span>
          ),
      },
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
              data-testid={`finance-expense-view-${row.id}`}
              onClick={() => navigate(`edit/${row.id}`)}
            >
              View
            </Button>
            {!row.payoutCreated ? (
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
                    aria-label={`More actions for expense ${row.id}`}
                    className="h-8 w-8 px-0"
                    data-testid={`finance-expense-more-${row.id}`}
                    icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                  />
                }
              >
                <div className="flex min-w-[160px] flex-col gap-1">
                  <Button variant="ghost" size="sm" className="justify-start w-full" data-testid={`finance-expense-more-edit-${row.id}`} onClick={() => navigate(`edit/${row.id}`)}>
                    Edit Expense
                  </Button>
                </div>
              </Popover>
            ) : null}
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <>
      <PageShell
        title="Expense"
        subtitle="Operational and compliance expense tracking."
        actions={
          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">Enable Auto Payout</span>
              <Switch checked={autoPayoutEnabled} disabled={settingsUpdating} onChange={handleToggleAutoPayout} />
            </div>
          </div>
        }
      >
        <ServerDataTableCard
          title={`Expense (${totalRecords})`}
          actions={
            <div className="flex items-center gap-2">
              <Select
                value="All"
                onChange={() => {}}
                options={[{ value: "All", label: "All" }]}
                containerClassName="w-[132px]"
                fullWidth={false}
                aria-label="Expense filter"
              />
              <Button onClick={() => navigate("new")}>Create Expense</Button>
              <FinanceFilterButton
                testId="finance-expenses-filter"
                label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
                active={appliedFilterCount > 0}
                onClick={openFilters}
              />
            </div>
          }
          data={financeExpenses}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          testId="finance-expense-table"
          emptyTitle="No Expense"
          emptyDescription={loading ? "Loading expenses..." : "No expenses found."}
        />
      </PageShell>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-expenses-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={filterSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No expense filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button type="button" variant="outline" className="flex-1" data-testid="finance-expenses-filter-reset" onClick={resetFilters}>
              Reset All
            </Button>
            <Button type="button" variant="primary" className="flex-1" data-testid="finance-expenses-filter-apply" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
