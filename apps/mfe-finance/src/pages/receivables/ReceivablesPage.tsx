import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  Popover,
  SectionCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import type { FinanceReceivable } from "../../lib/financeData";
import { formatCurrency } from "../../lib/financeData";
import { financeApi } from "../../lib/financeApi";
import { normalizeReceivableRows } from "../../lib/receivableMappers";
import { FinanceFeatureLayout } from "../../components/FinancePageLayout";

export default function ReceivablesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financeReceivables, setFinanceReceivables] = useState<FinanceReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadReceivables() {
      setLoading(true);
      try {
        const response = await financeApi.revenue.list<any>({
          page: page - 1,
          size: pageSize,
          ...(mfeProps.location?.id ? { locationUid: mfeProps.location.id } : {}),
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
  }, [mfeProps.location?.id, page, pageSize]);

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
    <FinanceFeatureLayout
      title="Revenue"
      subtitle="Outstanding incoming balances and collections ownership."
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("create")}>Add Revenue</Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Filter revenue"
            className="h-9 w-9 px-0 text-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
            icon={<Icon name="filter" className="h-6 w-6" aria-hidden="true" />}
          />
        </div>
      }
      main={
        <SectionCard className="border-slate-200 shadow-sm" padding={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">{`Revenue(${totalRecords})`}</h2>
          </div>
          <DataTable
            data={financeReceivables}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            className="rounded-none border-x-0 border-b-0 shadow-none"
            tableClassName="min-w-[1280px]"
            data-testid="finance-revenue-table"
            pagination={{
              page,
              pageSize,
              total: totalRecords,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<EmptyState title="No Revenue" description={loading ? "Loading revenue..." : "Revenue will appear here."} />}
          />
        </SectionCard>
      }
    />
  );
}

function toIsoDateTime(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
