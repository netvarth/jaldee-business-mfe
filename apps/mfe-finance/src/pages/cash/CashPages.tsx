import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { Button, DataTable, Drawer, EmptyState, Icon, Input, SectionCard, Select, StatCard, Textarea } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { formatCurrency } from "../../lib/financeData";
import { DataTableCard, FeedCard, FinanceFeatureLayout, FinanceFilterButton, PageShell, SummaryList } from "../../components/FinancePageLayout";
import { useFinanceLiveData } from "../../lib/financeLive";
import { SchemaFilterBuilder, buildDefaultSearchClauses, compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { buildFinanceSearchBody, buildLocationCondition, usePaymentsInSearchSchema, usePaymentsOutSearchSchema } from "../../lib/financeSearch";

export function TotalListPage() {
  const {
    financeExpenses,
    financeInvoices,
    financeLedgerEntries,
    financePayments,
    financePayables,
    financeReceivables,
    financeSummaryCards,
    financeVendors,
  } = useFinanceLiveData();
  return (
    <FinanceFeatureLayout
      title="Total List"
      subtitle="Combined finance totals similar to the old total-list route."
      stats={[
        { label: "Revenue", value: formatCurrency(financePayments.reduce((sum, row) => sum + row.amount, 0)), accent: "emerald" },
        { label: "Expenses", value: formatCurrency(financeExpenses.reduce((sum, row) => sum + row.amount, 0)), accent: "rose" },
        { label: "Receivables", value: formatCurrency(financeReceivables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
        { label: "Payables", value: formatCurrency(financePayables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "indigo" },
      ]}
      main={
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-[22px] font-semibold text-slate-900">Finance Totals</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {financeSummaryCards.map((card) => (
              <StatCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
            ))}
          </div>
        </SectionCard>
      }
      aside={
        <FeedCard title="Breakdown">
          <SummaryList
            rows={[
              { label: "Invoices", value: String(financeInvoices.length), note: "Total invoice records" },
              { label: "Payments", value: String(financePayments.length), note: "Recorded collections" },
              { label: "Vendors", value: String(financeVendors.length), note: "Active vendor directory" },
              { label: "Ledger Entries", value: String(financeLedgerEntries.length), note: "Journal records" },
            ]}
          />
        </FeedCard>
      }
    />
  );
}

export function CashInHandPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeCashInHand, setFinanceCashInHand] = useState<Array<{
    id: string;
    date: string;
    amount: number;
    type: string;
    referenceNo: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { schema } = usePaymentsInSearchSchema();

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
  };

  const resetFilters = () => {
    clearFilters();
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setAdvancedFilters(draftFilters);
    setFiltersOpen(false);
  };

  const loadCashInHand = useCallback(async () => {
    setLoading(true);
    try {
      const fixedConditions = buildLocationCondition(schema, mfeProps.location?.id);
      const searchBody = buildFinanceSearchBody(advancedFilters, schema, 0, 200, fixedConditions);
      const response = await financeApi.cash.list<any>(searchBody);
      const payload = Array.isArray(response.data?.content)
        ? response.data.content
        : Array.isArray(response.data?.data?.content)
          ? response.data.data.content
          : Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data)
              ? response.data
              : [];

      setFinanceCashInHand(
        payload.map((item: any, index: number) => {
          const paymentDate = item?.paymentOn || item?.createdDate || item?.updatedDate || item?.updatedAt;
          return {
            id: String(item?.paymentsInUid || item?.payInOutUid || item?.uid || item?.id || `cash-in-${index}`),
            date: paymentDate ? new Date(paymentDate).toLocaleDateString("en-GB") : "-",
            amount: Number(item?.amount || item?.paymentAmount || item?.netTotal || 0) || 0,
            type: item?.isPaymentsIn === false ? "Cash OUT" : "Cash IN",
            referenceNo: String(item?.referenceNo || "-"),
          };
        })
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load cash in hand list", error);
      setFinanceCashInHand([]);
    } finally {
      setLoading(false);
    }
  }, [advancedFilters, schema, mfeProps.location?.id]);

  useEffect(() => {
    void loadCashInHand();
  }, [loadCashInHand]);

  const handleRefreshCash = async () => {
    setRefreshing(true);
    try {
      if (mfeProps.location?.id) {
        await financeApi.cash.recalculateBalance(mfeProps.location.id);
      }
      await loadCashInHand();
    } catch (err) {
      console.error("Failed to refresh cash balance", err);
    } finally {
      setRefreshing(false);
    }
  };
  const columns = useMemo<ColumnDef<(typeof financeCashInHand)[number]>[]>(
    () => [
      { key: "date", header: "Date" },
      { key: "amount", header: "Amount (₹)", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "type", header: "Cash IN/OUT" },
      { key: "referenceNo", header: "Reference No." },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button variant="outline" onClick={() => navigate(`view/${row.id}`, { relative: "path" })}>
            View
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <PageShell
      title="Cash Reserve"
      subtitle="Cash reserve entries for the selected location."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefreshCash} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <FinanceFilterButton
            testId="finance-cash-reserve-filter"
            label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
            active={appliedFilterCount > 0}
            onClick={openFilters}
          />
          <Button onClick={() => navigate("reserve/new", { relative: "path" })}>+ Cash Reserve</Button>
        </div>
      }
    >
      <DataTableCard
        title={`Cash Reserve(${financeCashInHand.length})`}
        subtitle="Cash reserve list with quick access to reserve details."
        data={financeCashInHand}
        columns={columns}
        getRowId={(row) => row.id}
        loading={loading}
        emptyTitle="No cash reserve records"
        emptyDescription="Cash reserve entries will appear here."
      />
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-cash-reserve-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No cash reserve filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="finance-cash-reserve-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="finance-cash-reserve-filter-apply"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </PageShell>
  );
}

export function CashReserveViewPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id } = useParams<{ id: string }>();
  const [reserve, setReserve] = useState<{
    reserveType: "Cash IN" | "Cash OUT";
    locationName: string;
    referenceNo: string;
    amount: number;
    notes: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadReserve() {
      if (!id) {
        setReserve(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [cashInResponse, cashOutResponse] = await Promise.allSettled([
          financeApi.cash.detailIn<any>(id),
          financeApi.cash.detailOut<any>(id),
        ]);

        const payload =
          cashInResponse.status === "fulfilled"
            ? cashInResponse.value.data
            : cashOutResponse.status === "fulfilled"
              ? cashOutResponse.value.data
              : null;

        if (!active) {
          return;
        }

        if (!payload) {
          setReserve(null);
          return;
        }

        setReserve({
          reserveType: payload?.isPaymentsIn === false ? "Cash OUT" : "Cash IN",
          locationName: String(payload?.locationName || "-"),
          referenceNo: String(payload?.referenceNo || "-"),
          amount: Number(payload?.amount || payload?.paymentAmount || 0) || 0,
          notes: String(payload?.description || payload?.notes || "-"),
        });
      } catch (error) {
        console.error("[mfe-finance] Failed to load cash reserve detail", error);
        if (active) {
          setReserve(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReserve();

    return () => {
      active = false;
    };
  }, [id]);

  const backHref = pathname.includes("cashRegister") ? "/cashRegister" : "/cashInhand";

  return (
    <PageShell
      title="Cash Reserve"
      subtitle="View cash reserve details."
      back={{ label: "Back to Cash Reserve", href: backHref }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading cash reserve details...</div>
        ) : !reserve ? (
          <EmptyState title="Cash reserve not found" description="The selected cash reserve record could not be loaded." />
        ) : (
          <div className="grid gap-5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Reserve Type *</label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={reserve.reserveType === "Cash IN"} readOnly />
                  Cash IN
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={reserve.reserveType === "Cash OUT"} readOnly />
                  Cash OUT
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Location *" value={reserve.locationName} readOnly />
              <Input label="Reference No." value={reserve.referenceNo} readOnly />
              <Input label="Amount(₹) *" value={String(reserve.amount)} readOnly />
            </div>

            <Textarea label="Notes" value={reserve.notes} readOnly rows={4} />
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

export function CashRegisterPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [cashRegisters, setCashRegisters] = useState<Array<{
    id: string;
    source: string;
    owner: string;
    updatedOn: string;
    amount: number;
    type: string;
    category: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cashInHandAmount, setCashInHandAmount] = useState(0);
  const [cashUpdatedOn, setCashUpdatedOn] = useState("-");
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { schema } = usePaymentsOutSearchSchema();

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
  };

  const resetFilters = () => {
    clearFilters();
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setAdvancedFilters(draftFilters);
    setFiltersOpen(false);
  };

  const loadCashRegisters = useCallback(async () => {
    setLoading(true);
    try {
      const fixedConditions = buildLocationCondition(schema, mfeProps.location?.id);
      const searchBody = buildFinanceSearchBody(advancedFilters, schema, 0, 200, fixedConditions);
      const [cashInResponse, cashOutResponse] = await Promise.allSettled([
        financeApi.cash.list<any>(searchBody),
        financeApi.cash.listOut<any>(searchBody),
      ]);

      const readList = (payload: any) =>
        Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data?.content)
            ? payload.data.content
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : [];

      const cashInPayload = cashInResponse.status === "fulfilled" ? readList(cashInResponse.value.data) : [];
      const cashOutPayload = cashOutResponse.status === "fulfilled" ? readList(cashOutResponse.value.data) : [];

      setCashRegisters(
        [
          ...cashInPayload.map((item: any, index: number) => ({ item, type: "Cash IN", index, direction: "in" })),
          ...cashOutPayload.map((item: any, index: number) => ({ item, type: "Cash OUT", index, direction: "out" })),
        ].map(({ item, type, index, direction }) => {
          const paymentDate = item?.paymentOn || item?.paymentDate || item?.receivedDate || item?.createdDate || item?.updatedAt;
          return {
            id: String(item?.paymentsInUid || item?.paymentsOutUid || item?.payInOutUid || item?.uid || item?.id || `cash-register-${direction}-${index}`),
            source: String(item?.paymentLabel || item?.paymentsInLabel || item?.paymentsOutLabel || item?.categoryName || item?.purpose || type),
            owner: String(item?.createdByName || item?.userName || item?.owner || "Finance"),
            updatedOn: paymentDate
              ? new Date(paymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            amount: Number(item?.amount || item?.paymentAmount || item?.receivedAmount || item?.netTotal || 0) || 0,
            type,
            category: String(item?.categoryName || item?.paymentCategory || item?.purpose || "-"),
          };
        })
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load cash register list", error);
      setCashRegisters([]);
    } finally {
      setLoading(false);
    }
  }, [advancedFilters, schema, mfeProps.location?.id]);

  const loadCashBalance = useCallback(async () => {
    if (!mfeProps.location?.id) {
      setCashInHandAmount(0);
      setCashUpdatedOn("-");
      return;
    }

    try {
      const response = await financeApi.cash.balance<any>(String(mfeProps.location.id));
      const payload = response.data ?? {};
      const rawUpdatedAt = payload.updatedAt ?? payload.updatedDate ?? payload.lastUpdatedAt;
      const rawUpdatedOn = payload.updatedOn ?? payload.lastUpdated;
      setCashInHandAmount(Number(payload.cashInHand ?? payload.balance ?? payload.amount ?? 0) || 0);
      setCashUpdatedOn(
        rawUpdatedAt
          ? new Date(rawUpdatedAt).toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          : rawUpdatedOn
            ? String(rawUpdatedOn)
          : "-"
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load cash balance", error);
      setCashInHandAmount(0);
      setCashUpdatedOn("-");
    }
  }, [mfeProps.location?.id]);

  const loadCashRegisterData = useCallback(async () => {
    await Promise.allSettled([loadCashRegisters(), loadCashBalance()]);
  }, [loadCashRegisters, loadCashBalance]);

  useEffect(() => {
    void loadCashRegisterData();
  }, [loadCashRegisterData]);

  const handleRefreshCash = async () => {
    if (!mfeProps.location?.id) {
      return;
    }

    setRefreshing(true);
    try {
      await financeApi.cash.recalculateBalance(String(mfeProps.location.id));
      await loadCashRegisterData();
    } catch (error) {
      console.error("[mfe-finance] Failed to refresh cash balance", error);
    } finally {
      setRefreshing(false);
    }
  };

  const columns = useMemo<ColumnDef<(typeof cashRegisters)[number]>[]>(
    () => [
      { key: "updatedOn", header: "Date" },
      { key: "type", header: "Type" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "category", header: "Category" },
    ],
    []
  );

  return (
    <>
      <FinanceFeatureLayout
        title="Cash Register"
        subtitle="Register balances and last update snapshots."
        actions={
          <div className="flex items-center gap-2">
            <FinanceFilterButton
              testId="finance-cash-register-filter"
              label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
              active={appliedFilterCount > 0}
              onClick={openFilters}
            />
            <Button onClick={() => navigate("reserve/new", { relative: "path" })}>+ Cash Reserve</Button>
          </div>
        }
        main={
          <>
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm max-w-sm">
                  <div className="text-sm font-medium text-slate-600">Cash Inhand</div>
                  <div className="mt-3 text-3xl font-semibold text-emerald-600">{formatCurrency(cashInHandAmount)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>Last Updated On {cashUpdatedOn}</span>
                  <button
                    type="button"
                    onClick={handleRefreshCash}
                    disabled={refreshing}
                    className="font-semibold text-indigo-700"
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
            </SectionCard>

            <DataTableCard
              title={`Cash Register(${cashRegisters.length})`}
              subtitle="Cash reserve entries showing both cash in and cash out."
              data={cashRegisters}
              columns={columns}
              getRowId={(row) => row.id}
              loading={loading}
              emptyTitle="No cash register data"
              emptyDescription="Cash register entries will appear here."
            />
          </>
        }
      />
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-cash-register-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={schema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No cash register filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="finance-cash-register-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="finance-cash-register-filter-apply"
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

export function CashReserveCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [reserveType, setReserveType] = useState<"paymentsIn" | "paymentsOut">("paymentsIn");
  const [locationUid, setLocationUid] = useState(String(mfeProps.location?.id ?? ""));
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadLocations() {
      try {
        const response = await financeApi.locations.tenant<any>({
          page: 0,
          size: 100,
        });
        if (!active) {
          return;
        }
        const locations = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.content)
            ? (response.data as any).content
            : Array.isArray((response.data as any)?.data)
              ? (response.data as any).data
              : Array.isArray((response.data as any)?.data?.content)
                ? (response.data as any).data.content
                : [];
        const nextOptions = locations.map((item: any) => ({
          value: String(item.locationUid ?? item.uid ?? item.id ?? item.locationId ?? ""),
          label: String(item.place ?? item.name ?? item.locationName ?? "Location"),
        })).filter((item) => item.value);
        setLocationOptions(nextOptions);
        if (!locationUid) {
          setLocationUid(nextOptions[0]?.value || "");
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load locations for cash reserve", error);
      }
    }
    void loadLocations();
    return () => {
      active = false;
    };
  }, [locationUid]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!locationUid) {
      setFormError("Location is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const selectedLocation = locationOptions.find((item) => item.value === locationUid);
      const payload = {
        locationUid,
        locationId: locationUid,
        locationName: selectedLocation?.label || mfeProps.location?.name || undefined,
        amount: parsedAmount,
        currency: "INR",
        mode: "Cash",
        paymentMode: "Cash",
        acceptedBy: "CASH",
        referenceNo: referenceNo.trim() || undefined,
        description: notes.trim() || undefined,
        paymentLabel: reserveType === "paymentsIn" ? "Cash IN" : "Cash OUT",
        isPaymentsIn: reserveType === "paymentsIn",
        financeDirect: true,
        paymentInfo: [{ paymentMode: "Cash" }],
      };
      await financeApi.cash.createReserve(reserveType, payload);
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Create Cash Reserve",
        message: "Cash reserve entry created successfully.",
      });
      const backPath = pathname.includes("cashRegister") ? "/cashRegister" : "/cashInhand";
      navigate(backPath);
    } catch (error) {
      console.error("[mfe-finance] Failed to create cash reserve", error);
      const msg = error instanceof Error ? error.message : "Could not create cash reserve.";
      setFormError(msg);
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Create Cash Reserve",
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  }

  const backHref = pathname.includes("cashRegister") ? "/cashRegister" : "/cashInhand";

  return (
    <PageShell
      title="Create Cash Reserve"
      subtitle="Create a cash in or cash out reserve entry."
      back={{ label: "Back to Cash Reserve", href: backHref }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Reserve Type *</label>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="reserveType"
                  checked={reserveType === "paymentsIn"}
                  onChange={() => setReserveType("paymentsIn")}
                />
                Cash IN
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="reserveType"
                  checked={reserveType === "paymentsOut"}
                  onChange={() => setReserveType("paymentsOut")}
                />
                Cash OUT
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Location *"
              value={locationUid}
              onChange={(event) => setLocationUid(event.target.value)}
              options={[{ value: "", label: "Select Location" }, ...locationOptions]}
            />
            <Input
              label="Reference No."
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
              placeholder="Reference No"
            />
            <Input
              label="Amount(₹) *"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter Amount"
            />
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
          />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(backHref)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}
