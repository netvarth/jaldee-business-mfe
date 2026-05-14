import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, Icon, SectionCard, StatCard, Select, BarChart } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useFinanceDataset } from "../queries/finance";
import { formatFinanceCurrency, getFinanceStatusVariant } from "../services/finance";
import type { FinanceQuickAction, FinanceTransactionRow } from "../types";
import { SharedFinanceLayout } from "./shared";

function QuickActions({ actions }: { actions: FinanceQuickAction[] }) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="flex flex-wrap gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => window.location.assign(action.route)}
            className="h-[102px] w-[144px] shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="text-[15px] font-semibold leading-5 text-slate-900">{action.label}</div>
            </div>
          </button>
        ))}
        <button
          id="finance-overview-edit-actions"
          data-testid="finance-overview-edit-actions"
          type="button"
          onClick={() => window.location.assign("/finance/settings")}
          className="h-[102px] w-[144px] shrink-0 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 shadow-sm">
              <Icon name="layers" className="h-5 w-5" />
            </div>
            <div className="text-[15px] font-semibold leading-5 text-slate-900">Edit Actions</div>
          </div>
        </button>
      </div>
    </SectionCard>
  );
}

function TransactionList({
  rows,
}: {
  rows: FinanceTransactionRow[];
}) {
  const [filter, setFilter] = useState<"All" | "Revenue" | "Payout">("All");

  const filteredRows = useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((row) => row.kind === filter);
  }, [filter, rows]);

  return (
    <div className="mt-6">
      <div className="text-[22px] font-semibold text-slate-900">Recent Transactions</div>
      <div className="mt-4 flex gap-3 text-sm font-semibold">
        {(["All", "Revenue", "Payout"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-4 py-2 transition ${
              filter === tab ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {filteredRows.length ? (
          <div className="divide-y divide-slate-100">
            {filteredRows.slice(0, 15).map((row) => (
              <div key={row.id} className="grid gap-4 py-5 md:grid-cols-[1.5fr_1fr_auto] md:items-start text-left">
                <div>
                  <div className="text-[16px] font-semibold text-slate-900">{row.title}</div>
                  <div className="text-[16px] font-semibold text-slate-900">{row.subtitle}</div>
                  <div className={`mt-1 text-[14px] font-medium ${row.kind === "Revenue" ? "text-[#42A89D]" : "text-rose-500"}`}>
                    {row.kind === "Revenue" ? "Revenue ↙" : "Payout ↗"}
                  </div>
                </div>
                <div className="text-[16px] text-slate-700 md:pt-1">{row.date}</div>
                <div className="text-right text-[16px] font-semibold text-slate-900 md:pt-1">{formatFinanceCurrency(row.amount)}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No recent transactions" description="Transactions will appear here once finance activity is available." />
        )}
        {filteredRows.length > 15 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => window.location.assign("/finance/transactions")}
              className="text-[16px] font-semibold text-indigo-700 hover:text-indigo-800"
            >
              See All({filteredRows.length})
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FinanceOverview() {
  const [statsRange, setStatsRange] = useState("today");
  const [expenseRange, setExpenseRange] = useState("today");
  const [chartRange, setChartRange] = useState("week");
  const datasetQuery = useFinanceDataset();
  const dataset = datasetQuery.data;
  const { basePath } = useSharedModulesContext();

  const filteredTransactions = useMemo(() => {
    if (!dataset) return [];
    if (statsRange === "all") return dataset.transactions;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return dataset.transactions.filter((t) => {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return true; // keep items with unparseable dates

      if (statsRange === "today") {
        return d.getTime() >= now.getTime();
      }
      if (statsRange === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d.getTime() >= weekAgo.getTime();
      }
      if (statsRange === "month") {
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return d.getTime() >= monthAgo.getTime();
      }
      return true;
    });
  }, [dataset, statsRange]);

  const filteredSummaries = useMemo(() => {
    const rev = filteredTransactions.filter((t) => t.kind === "Revenue").reduce((sum, t) => sum + t.amount, 0);
    const exp = filteredTransactions.filter((t) => t.kind === "Payout").reduce((sum, t) => sum + t.amount, 0);
    return [
      { label: "Revenue", value: formatFinanceCurrency(rev), accent: "emerald" },
      { label: "Expenses", value: formatFinanceCurrency(exp), accent: "rose" },
      { label: "Payout", value: formatFinanceCurrency(0), accent: "amber" },
    ] as const;
  }, [filteredTransactions]);

  if (datasetQuery.isLoading) {
    return (
      <SharedFinanceLayout
        title="Finance Dashboard"
        subtitle="Loading finance data..."
      >
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[102px] w-[144px] shrink-0 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        </SectionCard>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="space-y-4">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          </SectionCard>
          <div className="space-y-6">
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            </SectionCard>
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </SharedFinanceLayout>
    );
  }

  if (datasetQuery.isError) {
    return (
      <SharedFinanceLayout
        title="Finance Dashboard"
        subtitle="Finance overview for the active product."
      >
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="Finance data unavailable"
            description="The finance dashboard could not be loaded for the current location. Please try again."
          />
        </SectionCard>
      </SharedFinanceLayout>
    );
  }

  return (
    <SharedFinanceLayout
      title={`Welcome back, Finance User`}
      subtitle={dataset?.subtitle ?? "A lightweight finance view scoped to the active product."}
      actions={<Button onClick={() => window.location.assign("/finance")}>Open Full Finance</Button>}
    >
      <QuickActions actions={dataset?.actions ?? []} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[22px] font-semibold text-slate-900">Account Balance</div>
              <div className="w-40">
                <Select
                  options={[
                    { value: "today", label: "Today" },
                    { value: "week", label: "Previous Week" },
                    { value: "month", label: "Current Month" },
                    { value: "all", label: "All Time" },
                  ]}
                  value={statsRange}
                  onChange={(e) => setStatsRange(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#3B07B8] px-6 py-5 text-white shadow-sm">
              <div className="text-sm font-medium text-indigo-100">Your Account Balance</div>
              <div className="mt-1 text-xl font-semibold">{formatFinanceCurrency(dataset?.accountBalance ?? 0)}</div>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="text-[22px] font-semibold text-slate-900">Recent Transaction</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {filteredSummaries.map((summary) => (
                <StatCard key={summary.label} label={summary.label} value={summary.value} accent={summary.accent} />
              ))}
            </div>
            <div className="mt-6">
              <TransactionList rows={dataset?.transactions ?? []} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[22px] font-semibold text-slate-900">Cash Inhand</div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-slate-500 hover:text-slate-900 transition p-1"
                title="Refresh"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-600 px-6 py-5 text-white shadow-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-200">Amount</div>
                <div className="mt-1 text-xl font-semibold">{formatFinanceCurrency(dataset?.cashInHand ?? 0)}</div>
              </div>
              <button
                type="button"
                onClick={() => window.location.assign("/finance/cashRegister")}
                className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition shadow"
              >
                Cash Register ↗
              </button>
            </div>
            <div className="mt-3 text-xs font-medium text-slate-500">
              Last Updated On {dataset?.cashUpdatedOn ?? "-"}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[22px] font-semibold text-slate-900">Expenses Breakdown</div>
              <div className="w-40">
                <Select
                  options={[
                    { value: "today", label: "Today" },
                    { value: "week", label: "Last 7 Days" },
                    { value: "month", label: "Last 30 Days" },
                  ]}
                  value={expenseRange}
                  onChange={(e) => setExpenseRange(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {(dataset?.expenses ?? []).length ? (
                dataset?.expenses.slice(0, 4).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div>
                      <div className="font-semibold text-slate-900">{expense.category}</div>
                      <div className="text-sm text-slate-500">{expense.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-900">{formatFinanceCurrency(expense.amount)}</div>
                      <div className={`text-sm font-medium ${expense.increased ? "text-rose-500" : "text-emerald-600"}`}>
                        {expense.difference ?? 0}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 px-6 py-10 text-center">
                  <EmptyState 
                    icon={<img src="/assets/images/expense.svg" alt="no expense" className="h-24 w-24 object-contain mx-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    title="No Expenses Found for Today" 
                  />
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => window.location.assign(basePath + "/expense")}
                className="text-[16px] font-semibold text-indigo-700 hover:text-indigo-800"
              >
                See All Expenses({(dataset?.expenses ?? []).length || 71})
              </button>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Statistics</div>
              <div className="w-40">
                <Select
                  options={[
                    { value: "week", label: "Last 7 Days" },
                    { value: "month", label: "Past 12 Months" },
                  ]}
                  value={chartRange}
                  onChange={(e) => setChartRange(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-600">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" />Revenue</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" />Payout</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-500" />Expense</div>
            </div>
            <div className="mt-4">
              <BarChart data={chartRange === "month" ? dataset?.monthlyStatistics ?? [] : dataset?.statistics ?? []} className="mt-6 h-64" />
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[22px] font-semibold text-slate-900">Invoices</div>
                <button type="button" onClick={() => window.location.assign(`${basePath}/invoices`)} className="text-base font-semibold text-indigo-700">
                  + Add New
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {(dataset?.invoices ?? []).slice(0, 5).map((invoice, index) => (
                  <div key={invoice.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {index === 0 ? <div className="text-sm font-semibold text-indigo-700">Most Recent</div> : null}
                        <div className="font-semibold text-slate-900">Invoice : #{invoice.id}</div>
                        <div className="text-sm text-slate-600">{invoice.customer}</div>
                        <div className="mt-1"><Badge variant={getFinanceStatusVariant(invoice.status)}>{invoice.status}</Badge></div>
                      </div>
                      <div className="font-semibold text-slate-900">{formatFinanceCurrency(invoice.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => window.location.assign(`${basePath}/invoices`)} className="mt-4 text-lg font-semibold text-indigo-700">
                See All({dataset?.invoices.length ?? 0})
              </button>
            </SectionCard>

            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[22px] font-semibold text-slate-900">Vendors</div>
                <button type="button" onClick={() => window.location.assign(`${basePath}/settings`)} className="text-base font-semibold text-indigo-700">
                  + Add New
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {(dataset?.vendors ?? []).slice(0, 5).map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Icon name="globe" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{vendor.name}</div>
                        <div className="text-sm text-slate-500">{vendor.category}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-500">{vendor.status}</div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => window.location.assign(`${basePath}/settings`)} className="mt-4 text-lg font-semibold text-indigo-700">
                See All({dataset?.vendors.length ?? 0})
              </button>
            </SectionCard>
          </div>
        </div>
      </div>
    </SharedFinanceLayout>
  );
}
