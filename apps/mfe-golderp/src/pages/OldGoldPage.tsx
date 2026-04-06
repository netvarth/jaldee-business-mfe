import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  DataTable,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
  type ColumnDef,
} from "@jaldee/design-system";
import { salesService } from "@/services";
import { formatCurrency, formatWeight } from "@/lib/gold-erp-utils";
import type { OldGoldExchange, SalesOrder } from "@/lib/gold-erp-types";

type ExchangeRow = {
  id: string;
  metalType: string;
  purityLabel: string;
  netWt: number;
  rateApplied: number;
  exchangeValue: number;
};

function normalizeSalesOrder(order: SalesOrder): SalesOrder {
  return {
    ...order,
    orderUid: String(order.orderUid ?? ""),
    orderNumber: String(order.orderNumber ?? "-"),
    customerName: String(order.customerName ?? "-"),
    oldGoldEntries: Array.isArray(order.oldGoldEntries) ? order.oldGoldEntries : [],
  };
}

function normalizeExchange(entry: OldGoldExchange, index: number): ExchangeRow {
  return {
    id: String(entry.exchangeUid ?? index),
    metalType: String(entry.metalType ?? "-"),
    purityLabel: String(entry.purityLabel ?? "-"),
    netWt: Number(entry.netWt ?? 0),
    rateApplied: Number(entry.rateApplied ?? 0),
    exchangeValue: Number(entry.exchangeValue ?? 0),
  };
}

export default function OldGoldPage() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void salesService
      .getSalesOrdersWithDetails()
      .then((orders) => {
        if (cancelled) return;
        setSalesOrders(Array.isArray(orders) ? orders.map(normalizeSalesOrder) : []);
        setError("");
      })
      .catch((loadError: unknown) => {
        console.error("[OldGoldPage] failed to load exchange entries", loadError);
        if (cancelled) return;
        setSalesOrders([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load metal exchange data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const exchangeEntries = useMemo<ExchangeRow[]>(
    () =>
      salesOrders
        .flatMap((order) => order.oldGoldEntries || [])
        .map((entry, index) => normalizeExchange(entry, index)),
    [salesOrders],
  );

  const totalCredit = useMemo(
    () => exchangeEntries.reduce((sum, entry) => sum + entry.exchangeValue, 0),
    [exchangeEntries],
  );

  const totalWeight = useMemo(
    () => exchangeEntries.reduce((sum, entry) => sum + entry.netWt, 0),
    [exchangeEntries],
  );

  const columns = useMemo<ColumnDef<ExchangeRow>[]>(
    () => [
      { key: "metalType", header: "Metal", render: (row) => row.metalType },
      { key: "purityLabel", header: "Purity", render: (row) => row.purityLabel },
      {
        key: "netWt",
        header: "Weight",
        align: "right",
        render: (row) => <span className="tabular-nums">{formatWeight(row.netWt)}</span>,
      },
      {
        key: "rateApplied",
        header: "Rate/g",
        align: "right",
        render: (row) => <span className="tabular-nums">{formatCurrency(row.rateApplied)}/g</span>,
      },
      {
        key: "exchangeValue",
        header: "Credit",
        align: "right",
        render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.exchangeValue)}</span>,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Metal Exchange"
          subtitle="Exchange entries recorded inside sales workflows, including gold and other metals."
          actions={
            <Button size="sm" onClick={() => navigate("/sales")}>
              <Icon name="refresh" className="h-4 w-4" />
              Open Sales Workflow
            </Button>
          }
        />

        {error ? (
          <Alert variant="danger" title="Could not load exchange entries">
            {error}
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard layout="compact" accent="indigo" icon={<Icon name="refresh" />} label="Total Exchanges" value={exchangeEntries.length} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="refresh" />} label="Total Net Weight" value={formatWeight(totalWeight)} />
          <StatCard layout="compact" accent="emerald" icon={<Icon name="refresh" />} label="Total Credit Given" value={formatCurrency(totalCredit)} />
        </div>

        <SectionCard title="Exchange History" noPadding>
          <DataTable
            data={exchangeEntries}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            emptyState={<EmptyState title="No exchange history found" description="Old-gold exchange entries will appear here once they are recorded in sales orders." />}
            className="border-0 shadow-none"
          />
        </SectionCard>
      </div>
    </div>
  );
}
