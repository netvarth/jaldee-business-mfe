import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
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
import { formatCurrency, formatDate } from "@/lib/gold-erp-utils";
import type { SalesOrder } from "@/lib/gold-erp-types";

type OnlineOrderRow = {
  id: string;
  orderUid: string;
  orderNumber: string;
  customerName: string;
  advancePaid: number;
  status: string;
  orderDate: string;
  source: SalesOrder;
};

function normalizeSalesOrder(order: SalesOrder): OnlineOrderRow {
  return {
    id: String(order.orderUid ?? order.orderNumber),
    orderUid: String(order.orderUid ?? ""),
    orderNumber: String(order.orderNumber ?? "-"),
    customerName: String(order.customerName ?? "-"),
    advancePaid: Number(order.advancePaid ?? 0),
    status: String(order.status ?? "DRAFT"),
    orderDate: String(order.orderDate ?? ""),
    source: order,
  };
}

function getBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "INVOICED") return "success";
  if (status === "CONFIRMED") return "info";
  if (status === "DRAFT") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

export default function OnlineOrdersPage() {
  const navigate = useNavigate();
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void salesService
      .getSalesOrderHeaders()
      .then((orders) => {
        if (cancelled) return;
        const rows = Array.isArray(orders)
          ? orders
              .filter((order) => order.orderType === "ONLINE")
              .map(normalizeSalesOrder)
          : [];
        setOnlineOrders(rows);
        setError("");
      })
      .catch((loadError: unknown) => {
        console.error("[OnlineOrdersPage] failed to load online orders", loadError);
        if (cancelled) return;
        setOnlineOrders([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load online orders.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pending = useMemo(
    () => onlineOrders.filter((order) => order.status === "DRAFT").length,
    [onlineOrders],
  );

  const advanceCollected = useMemo(
    () => onlineOrders.reduce((sum, order) => sum + order.advancePaid, 0),
    [onlineOrders],
  );

  const columns = useMemo<ColumnDef<OnlineOrderRow>[]>(
    () => [
      {
        key: "orderNumber",
        header: "Order #",
        render: (row) => <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{row.orderNumber}</span>,
      },
      { key: "customerName", header: "Customer" },
      {
        key: "advancePaid",
        header: "Advance",
        align: "right",
        render: (row) => <span className="font-medium tabular-nums">{formatCurrency(row.advancePaid)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={getBadgeVariant(row.status)}>{row.status}</Badge>,
      },
      { key: "orderDate", header: "Date", render: (row) => <span className="text-[var(--color-text-secondary)]">{formatDate(row.orderDate)}</span> },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Online Orders"
          subtitle="Sales orders created with ONLINE order type"
          actions={
            <Button size="sm" onClick={() => navigate("/sales")}>
              Open Sales Orders
            </Button>
          }
        />

        {error ? (
          <Alert variant="danger" title="Could not load online orders">
            {error}
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard layout="compact" accent="indigo" icon={<Icon name="globe" />} label="Total Online Orders" value={onlineOrders.length} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="tag" />} label="Pending Processing" value={pending} />
          <StatCard layout="compact" accent="emerald" icon={<Icon name="globe" />} label="Advance Collected" value={formatCurrency(advanceCollected)} />
        </div>

        <SectionCard title="Online Order Queue" noPadding>
          <DataTable
            data={onlineOrders}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            onRowClick={() => navigate("/sales")}
            emptyState={<EmptyState title="No online orders found" description="Online sales orders will appear here once they are created." />}
            className="border-0 shadow-none"
          />
        </SectionCard>
      </div>
    </div>
  );
}
