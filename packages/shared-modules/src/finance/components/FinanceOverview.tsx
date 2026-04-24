import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, Icon, SectionCard, StatCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useFinanceDataset } from "../queries/finance";
import { formatFinanceCurrency, getFinanceStatusVariant } from "../services/finance";
import type { FinanceQuickAction, FinanceTransactionRow } from "../types";
import { SharedFinanceLayout } from "./shared";

function QuickActions({ actions }: { actions: FinanceQuickAction[] }) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="space-y-5">
        <div>
          <div className="text-[28px] font-semibold tracking-tight text-[#312E81]">Finance Manager Dashboard</div>
          <div className="mt-1 text-sm text-slate-500">Keep a tab on your finance and manage your finance operations smoothly.</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => window.location.assign(action.route)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.tone}`}>
                <Icon name={action.icon} className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-900">{action.label}</div>
              <div className="mt-1 text-xs text-slate-500">{action.note}</div>
            </button>
          ))}
        </div>
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
      <div className="text-[24px] font-semibold text-slate-900">Recent Transaction</div>
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

      <div className="mt-4 space-y-3">
        {filteredRows.length ? (
          filteredRows.slice(0, 8).map((row) => (
            <div key={row.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:grid-cols-[1.5fr_1fr_auto] md:items-center">
              <div>
                <div className="text-lg font-semibold text-slate-900">{row.title}</div>
                <div className="text-sm text-slate-600">{row.subtitle}</div>
                <div className={`mt-1 text-sm font-medium ${row.kind === "Revenue" ? "text-emerald-600" : "text-rose-500"}`}>
                  {row.kind === "Revenue" ? "Revenue ->" : "Payout ->"}
                </div>
              </div>
              <div className="text-base text-slate-600">{row.date}</div>
              <div className="text-right text-xl font-semibold text-slate-900">{formatFinanceCurrency(row.amount)}</div>
            </div>
          ))
        ) : (
          <EmptyState title="No recent transactions" description="Transactions will appear here once finance activity is available." />
        )}
      </div>
    </div>
  );
}

export function FinanceOverview() {
  const datasetQuery = useFinanceDataset();
  const dataset = datasetQuery.data;
  const { basePath } = useSharedModulesContext();

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
              <div className="text-[32px] font-semibold text-slate-900">Account Balance</div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">Today</div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#3B07B8] px-6 py-7 text-white shadow-lg">
              <div className="text-lg font-medium text-indigo-100">Your Account Balance</div>
              <div className="mt-3 text-3xl font-semibold">{formatFinanceCurrency(dataset?.accountBalance ?? 0)}</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(dataset?.summaries ?? []).slice(0, 3).map((summary) => (
                <StatCard key={summary.label} label={summary.label} value={summary.value} accent={summary.accent} />
              ))}
            </div>

            <TransactionList rows={dataset?.transactions ?? []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Cash Inhand</div>
              <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-500">
                <Icon name="refresh" />
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-500 px-5 py-5 text-white">
              <div className="text-base text-slate-100">Amount</div>
              <div className="mt-2 text-4xl font-semibold">{formatFinanceCurrency(dataset?.cashInHand ?? 0)}</div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/settings`)}>
                  Cash Register
                </Button>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-500">Last Updated On {dataset?.cashUpdatedOn ?? "-"}</div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Expenses Breakdown</div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">Today</div>
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
                <EmptyState title="No expenses found for today" description="Expense breakdown will appear here when data is available." />
              )}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[24px] font-semibold text-slate-900">Statistics</div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">Last 7 Days</div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(dataset?.reports ?? []).map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{report.metric}</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{report.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{report.note}</div>
                </div>
              ))}
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
