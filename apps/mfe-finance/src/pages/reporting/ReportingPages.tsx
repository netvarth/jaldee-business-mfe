import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Drawer, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi } from "../../lib/financeApi";
import { DataTableCard, FeedCard, FinanceFeatureLayout, FinanceFilterButton, PageShell, SummaryList } from "../../components/FinancePageLayout";
import { formatCurrency } from "../../lib/financeData";
import { useFinanceLiveData } from "../../lib/financeLive";
import { SchemaFilterBuilder, buildDefaultSearchClauses, compactSearchClauses } from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { buildFinanceSearchBody, useAuditLogsSearchSchema } from "../../lib/financeSearch";

function formatActivityTimestamp(value: unknown) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return "-";
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return rawValue;
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function ActivityLogPage() {
  const mfeProps = useMFEProps();
  const [activityLogs, setActivityLogs] = useState<Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
  }>>([]);
  const [activityCount, setActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { schema } = useAuditLogsSearchSchema();

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

  const loadActivityLogs = useCallback(async () => {
    setLoading(true);
    try {
      const searchBody = buildFinanceSearchBody(advancedFilters, schema, 0, 100);
      const listResponse = await financeApi.activity.list<any>(searchBody);

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
          timestamp: formatActivityTimestamp(
            item?.createdAt || item?.timestamp || item?.createdDate || item?.updatedDate || "-"
          ),
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
      setActivityLogs([]);
      setActivityCount(0);
    } finally {
      setLoading(false);
    }
  }, [advancedFilters, schema]);

  useEffect(() => {
    void loadActivityLogs();
  }, [loadActivityLogs]);

  const columns = useMemo<ColumnDef<(typeof activityLogs)[number]>[]>(
    () => [
      { key: "action", header: "Action" },
      { key: "actor", header: "Actor" },
      { key: "timestamp", header: "Timestamp" },
    ],
    []
  );

  return (
    <FinanceFeatureLayout
      title="Activity Log"
      subtitle="Audit visibility for the finance workspace."
      main={
        <>
          <DataTableCard
            title="Audit Trail"
            subtitle="Recent finance activity across invoices, vendors, and ledger."
            actions={
              <div className="flex items-center gap-2">
                <FinanceFilterButton
                  testId="finance-activity-log-filter"
                  label={appliedFilterCount > 0 ? `Filter (${appliedFilterCount})` : "Filter"}
                  active={appliedFilterCount > 0}
                  onClick={openFilters}
                />
              </div>
            }
            data={activityLogs}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            emptyTitle="No finance activity"
            emptyDescription="Activity entries will appear here."
          />
          <Drawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            title="Filters"
            size="sm"
            contentClassName="flex flex-col p-0 overflow-hidden"
          >
            <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="finance-activity-log-filter-drawer">
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <SchemaFilterBuilder
                  schema={schema}
                  value={draftFilters}
                  onChange={setDraftFilters}
                  appliedCount={appliedFilterCount}
                  onClearAll={clearFilters}
                  emptyStateMessage="No activity log filters are available from the schema."
                />
              </div>
              <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  data-testid="finance-activity-log-filter-reset"
                  onClick={resetFilters}
                >
                  Reset All
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  data-testid="finance-activity-log-filter-apply"
                  onClick={applyFilters}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </Drawer>
        </>
      }
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
