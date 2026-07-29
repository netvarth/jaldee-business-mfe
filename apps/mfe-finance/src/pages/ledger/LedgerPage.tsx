import { useMemo } from "react";
import { Button } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { formatCurrency } from "../../lib/financeData";
import { useFinanceLiveData } from "../../lib/financeLive";
import {
  DataTableCard,
  FeedCard,
  FinanceFeatureLayout,
  SummaryList,
} from "../../components/FinancePageLayout";

export default function LedgerPage() {
  const { financeLedgerEntries } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeLedgerEntries)[number]>[]>(
    () => [
      { key: "account", header: "Account" },
      { key: "type", header: "Type" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "balance", header: "Balance", align: "right", render: (row) => formatCurrency(row.balance) },
      { key: "updatedOn", header: "Updated On" },
    ],
    [],
  );

  return (
    <FinanceFeatureLayout
      title="Ledger"
      subtitle="Ledger movements, credits, debits, and running balances."
      actions={<Button>Add Credit</Button>}
      stats={[
        { label: "Entries", value: String(financeLedgerEntries.length), accent: "indigo" },
        { label: "Credits", value: formatCurrency(financeLedgerEntries.filter((item) => item.type === "Credit").reduce((sum, item) => sum + item.amount, 0)), accent: "emerald" },
        { label: "Debits", value: formatCurrency(financeLedgerEntries.filter((item) => item.type === "Debit").reduce((sum, item) => sum + item.amount, 0)), accent: "amber" },
        { label: "Closing Balance", value: formatCurrency(financeLedgerEntries[0]?.balance ?? 0), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Ledger Register"
          subtitle="Latest account-level finance movements."
          data={financeLedgerEntries}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No ledger entries"
          emptyDescription="Ledger entries will appear here."
        />
      }
      aside={
        <FeedCard title="Top Accounts">
          <SummaryList
            rows={financeLedgerEntries.map((entry) => ({
              label: entry.account,
              value: formatCurrency(entry.balance),
              note: `${entry.type} posted on ${entry.updatedOn}`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}
