import { useEffect, useMemo, useState } from "react";
import { Button, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi } from "../../lib/financeApi";
import { DataTableCard, FeedCard, FinanceFeatureLayout, PageShell, SummaryList } from "../../components/FinancePageLayout";
import { formatCurrency } from "../../lib/financeData";
import { useFinanceLiveData } from "../../lib/financeLive";

export function ActivityLogPage() {
  const mfeProps = useMFEProps();
  const [activityLogs, setActivityLogs] = useState<Array<{
    id: string;
    action: string;
    actor: string;
    target: string;
    timestamp: string;
  }>>([]);
  const [activityCount, setActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadActivityLogs() {
      setLoading(true);
      try {
        const filter = { page: 0, size: 100 };

        const listResponse = await financeApi.activity.list<any>(filter);

        if (!active) {
          return;
        }

        const payload =
          Array.isArray(listResponse.data)
            ? listResponse.data
            : Array.isArray(listResponse.data?.content)
              ? listResponse.data.content
              : Array.isArray(listResponse.data?.data)
                ? listResponse.data.data
                : Array.isArray(listResponse.data?.logs)
                  ? listResponse.data.logs
                  : [];

        setActivityLogs(
          payload.map((item: any, index: number) => ({
            id: String(item?.uid || item?.id || item?.logId || `activity-${index}`),
            action: String(item?.message || item?.action || item?.event || item?.activity || item?.description || "-"),
            actor: String(item?.actorUserName || item?.actor || item?.userName || item?.createdByName || "System"),
            target: String(item?.target || item?.referenceId || item?.entityName || item?.module || "-"),
            timestamp: String(item?.createdAt || item?.timestamp || item?.createdDate || item?.updatedDate || "-"),
          }))
        );

        setActivityCount(
          Number(
            listResponse.data?.totalElements ??
            listResponse.data?.total ??
            payload.length
          ) || payload.length
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load activity logs", error);
        if (active) {
          setActivityLogs([]);
          setActivityCount(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadActivityLogs();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id]);

  const columns = useMemo<ColumnDef<(typeof activityLogs)[number]>[]>(
    () => [
      { key: "action", header: "Action" },
      { key: "actor", header: "Actor" },
      { key: "target", header: "Target" },
      { key: "timestamp", header: "Timestamp" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Activity Log"
      subtitle="Audit visibility for the finance workspace."
      // stats={[
      //   { label: "Events", value: String(activityCount || activityLogs.length), accent: "indigo" },
      //   { label: "Human Actions", value: String(activityLogs.filter((item) => item.actor !== "Finance Bot" && item.actor !== "System").length), accent: "emerald" },
      //   { label: "Automation", value: String(activityLogs.filter((item) => item.actor === "Finance Bot" || item.actor === "System").length), accent: "amber" },
      //   { label: "Tracked Targets", value: String(new Set(activityLogs.map((item) => item.target)).size), accent: "rose" },
      // ]}
      main={
        <DataTableCard
          title="Audit Trail"
          subtitle="Recent finance activity across invoices, vendors, and ledger."
          data={activityLogs}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No finance activity"
          emptyDescription={loading ? "Loading activity entries..." : "Activity entries will appear here."}
        />
      }
      // aside={
      //   <FeedCard title="Recent Events">
      //     <SummaryList
      //       rows={financeActivityLogs.map((item) => ({
      //         label: item.action,
      //         value: item.timestamp,
      //         note: `${item.actor} -> ${item.target}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

export function ReportsPage() {
  const {
    financePayments,
    financePayables,
    financeReceivables,
    financeReportMetrics,
  } = useFinanceLiveData();
  const columns = useMemo<ColumnDef<(typeof financeReportMetrics)[number]>[]>(
    () => [
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
      { key: "note", header: "Notes" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Reports"
      subtitle="Core finance indicators rebuilt from the broader legacy finance feature set."
      actions={<Button onClick={() => window.print()}>Export Report</Button>}
      stats={[
        { label: "Metrics", value: String(financeReportMetrics.length), accent: "indigo" },
        { label: "Revenue", value: formatCurrency(financePayments.reduce((sum, row) => sum + row.amount, 0)), accent: "emerald" },
        { label: "Receivables", value: formatCurrency(financeReceivables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "amber" },
        { label: "Payables", value: formatCurrency(financePayables.reduce((sum, row) => sum + row.amountDue, 0)), accent: "rose" },
      ]}
      main={
        <DataTableCard
          title="Report Metrics"
          subtitle="Finance KPIs and descriptive notes."
          data={financeReportMetrics}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No report metrics"
          emptyDescription="Report metrics will appear here."
        />
      }
      aside={
        <FeedCard title="Operational Highlights">
          <SummaryList
            rows={financeReportMetrics.map((metric) => ({
              label: metric.metric,
              value: metric.value,
              note: metric.note,
            }))}
          />
        </FeedCard>
      }
    />
  );
}
