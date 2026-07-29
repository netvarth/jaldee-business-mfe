import { useMemo } from "react";
import { Button, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import {
  DataTableCard,
  FeedCard,
  FinanceFeatureLayout,
  PageShell,
  SummaryList,
} from "../../components/FinancePageLayout";
import { formatCurrency } from "../../lib/financeData";
import { useFinanceLiveData } from "../../lib/financeLive";

function EstimatesPage() {
  const { financeEstimates } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeEstimates)[number]>[]>(
    () => [
      { key: "id", header: "Estimate" },
      { key: "account", header: "Account" },
      { key: "title", header: "Title" },
      { key: "validUntil", header: "Valid Until" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
      { key: "stage", header: "Stage" },
    ],
    []
  );

  const approvedValue = financeEstimates.filter((item) => item.stage === "Approved").reduce((sum, item) => sum + item.amount, 0);

  return (
    <PageShell
      title="Estimates"
      subtitle="Proposal and estimate tracking aligned with the finance module."
    >
      <SectionCard>
        <EmptyState
          title={financeEstimates.length ? "Estimate workflow coming soon" : "No estimates"}
          description={`${financeEstimates.length} estimates with ${formatCurrency(approvedValue)} approved value.`}
        />
      </SectionCard>
    </PageShell>
  );

  // Future estimate register:
  //   <FinanceFeatureLayout
  //     title="Estimates"
  //     subtitle="Proposal and estimate tracking aligned with the finance module route structure."
  //     actions={<Button>Create Estimate</Button>}
  //     stats={[
  //       { label: "Total Estimates", value: String(financeEstimates.length), accent: "indigo" },
  //       { label: "Approved Value", value: formatCurrency(approvedValue), accent: "emerald" },
  //       { label: "Pending Review", value: String(financeEstimates.filter((item) => item.stage !== "Approved").length), accent: "amber" },
  //       { label: "Expiring Soon", value: String(financeEstimates.filter((item) => item.stage === "Sent").length), accent: "rose" },
  //     ]}
  //     main={
  //       <DataTableCard
  //         title="Estimate Register"
  //         subtitle="Track proposals before they become invoices or formal billing."
  //         data={financeEstimates}
  //         columns={columns}
  //         getRowId={(row) => row.id}
  //         emptyTitle="No estimates"
  //         emptyDescription="Estimates will appear here."
  //       />
  //     }
  //     aside={
  //       <FeedCard title="Pipeline Summary">
  //         <SummaryList
  //           rows={financeEstimates.map((estimate) => ({
  //             label: estimate.account,
  //             value: formatCurrency(estimate.amount),
  //             note: `${estimate.title} | ${estimate.stage}`,
  //           }))}
  //         />
  //       </FeedCard>
  //     }
  //   />
  // );
}

function PaymentsPage() {
  const { financePayments } = useFinanceLiveData();
  const mfeProps = useMFEProps();
  const columns = useMemo<ColumnDef<(typeof financePayments)[number]>[]>(
    () => [
      { key: "id", header: "Payment" },
      { key: "payer", header: "Payer" },
      { key: "method", header: "Method" },
      { key: "receivedOn", header: "Received On" },
      { key: "amount", header: "Amount", align: "right", render: (row) => formatCurrency(row.amount) },
    ],
    []
  );

  const totalCollections = financePayments.reduce((sum, row) => sum + row.amount, 0);
  const upiCollections = financePayments.filter((row) => row.method === "UPI").reduce((sum, row) => sum + row.amount, 0);

  return (
    <FinanceFeatureLayout
      title="Payments"
      subtitle="Collections, settlements, and incoming finance entries."
      actions={<Button onClick={() => mfeProps.navigate("/finance/receivables/create")}>Record Payment</Button>}
      stats={[
        { label: "Collections", value: formatCurrency(totalCollections), accent: "emerald" },
        { label: "UPI", value: formatCurrency(upiCollections), accent: "indigo" },
        { label: "Cash", value: formatCurrency(financePayments.filter((row) => row.method === "Cash").reduce((sum, row) => sum + row.amount, 0)), accent: "amber" },
        { label: "Transactions", value: String(financePayments.length), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Payment Register"
          subtitle="Incoming revenue captured against invoices and accounts."
          data={financePayments}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No payments"
          emptyDescription="Payment activity will appear here."
        />
      }
      aside={
        <FeedCard title="Collection Channels">
          <SummaryList
            rows={["Bank Transfer", "UPI", "Card", "Cash", "Net Banking"].map((method) => ({
              label: method,
              value: formatCurrency(financePayments.filter((row) => row.method === method).reduce((sum, row) => sum + row.amount, 0)),
              note: `${financePayments.filter((row) => row.method === method).length} entries`,
            }))}
          />
        </FeedCard>
      }
    />
  );
}

export { EstimatesPage, PaymentsPage };
