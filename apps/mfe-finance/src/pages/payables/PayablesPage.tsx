import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import { Button, Icon, Popover } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import type { FinancePayable } from "../../lib/financeData";
import { formatCurrency } from "../../lib/financeData";
import { financeApi } from "../../lib/financeApi";
import { normalizePayableRows } from "../../lib/payableMappers";
import { FinanceFeatureLayout, FinanceFilterButton, ServerDataTableCard } from "../../components/FinancePageLayout";

export default function PayablesPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [financePayables, setFinancePayables] = useState<FinancePayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadPayables() {
      setLoading(true);
      const filter = {
        page: page - 1,
        size: pageSize,
        ...(mfeProps.location?.id ? { locationUid: mfeProps.location.id } : {}),
      };

      try {
        const response = await financeApi.payables.list<any>(filter);
        if (active) {
          const payload = response.data;
          const normalizedRows = normalizePayableRows(payload);
          setFinancePayables(normalizedRows);
          setTotalRecords(Number((payload as any)?.totalElements ?? (payload as any)?.total ?? normalizedRows.length ?? 0) || 0);
        }
      } catch (error) {
        console.error("[mfe-finance] Failed to load payables", error);
        if (active) {
          setFinancePayables([]);
          setTotalRecords(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPayables();

    return () => {
      active = false;
    };
  }, [mfeProps.location?.id, page, pageSize]);

  const columns = useMemo<ColumnDef<(typeof financePayables)[number]>[]>(
    () => [
      { key: "date", header: "Date", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "amountDue", header: "Amount", align: "right", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4", render: (row) => formatCurrency(row.amountDue) },
      { key: "payoutCategory", header: "Payout Category", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "expenseCategory", header: "Expense Category", headerClassName: "whitespace-nowrap text-sm font-semibold text-slate-900", className: "py-4" },
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
              data-testid={`finance-payout-edit-${row.id}`}
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
                  aria-label={`More actions for payout ${row.reference || row.id}`}
                  className="h-8 w-8 px-0"
                  data-testid={`finance-payout-more-${row.id}`}
                  icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                />
              }
            >
              <div className="flex min-w-[160px] flex-col gap-1">
                <Button variant="ghost" className="w-full justify-start" data-testid={`finance-payout-more-edit-${row.id}`} onClick={() => navigate(`edit/${row.id}`)}>
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
      title={`Payouts (${totalRecords})`}
      subtitle="Payouts and outgoing vendor commitments."
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("create")}>Create Payout</Button>
        </div>
      }
      main={
        <ServerDataTableCard
            actions={
              <FinanceFilterButton testId="finance-payouts-filter" />
            }
            data={financePayables}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={totalRecords}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            testId="finance-payout-table"
            emptyTitle="No Payout"
            emptyDescription={loading ? "Loading payouts..." : "Payout entries will appear here."}
          />
      }
    />
  );
}
