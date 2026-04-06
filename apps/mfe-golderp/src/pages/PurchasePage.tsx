import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  Select,
  type ColumnDef,
} from "@jaldee/design-system";
import { purchaseService } from "@/services";
import type { PurchaseOrder } from "@/lib/gold-erp-types";
import { formatCurrency, formatDate } from "@/lib/gold-erp-utils";

type PurchaseRow = PurchaseOrder & {
  id: string;
};

function normalizePurchaseOrder(order: PurchaseOrder): PurchaseRow {
  return {
    ...order,
    id: String(order.poUid ?? order.poNumber),
  };
}

function getStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "CLOSED") return "success";
  if (status === "CONFIRMED") return "info";
  if (status === "DRAFT") return "warning";
  return "neutral";
}

export default function PurchasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    console.log("[PurchasePage] mounted, loading purchase orders");

    void purchaseService.getPurchaseOrders()
      .then((orders) => {
        console.log("[PurchasePage] purchase orders loaded", orders);
        if (cancelled) return;
        setError("");
        setPurchaseOrders(Array.isArray(orders) ? orders.map(normalizePurchaseOrder) : []);
      })
      .catch((loadError: unknown) => {
        console.error("[PurchasePage] failed to load purchase orders", loadError);
        if (cancelled) return;
        setPurchaseOrders([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load purchase orders.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      purchaseOrders.filter((order) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          String(order.poNumber ?? "").toLowerCase().includes(query) ||
          String(order.supplierName ?? "").toLowerCase().includes(query);
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [purchaseOrders, search, statusFilter],
  );

  const columns = useMemo<ColumnDef<PurchaseRow>[]>(
    () => [
      {
        key: "poNumber",
        header: "PO Number",
        render: (row) => <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{row.poNumber}</span>,
      },
      { key: "supplierName", header: "Supplier" },
      {
        key: "orderDate",
        header: "Order / Delivery",
        render: (row) => (
          <div className="text-sm">
            <div>{formatDate(row.orderDate)}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">ETA {formatDate(row.expectedDeliveryDate)}</div>
          </div>
        ),
      },
      {
        key: "totalAmount",
        header: "Total Amount",
        align: "right",
        render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.totalAmount || 0)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`${row.poUid}`, {
                relative: "path",
                state: { returnTo: location.pathname },
              })
            }
          >
            <span className="mr-1 inline-flex items-center justify-center text-[11px]">⤢</span>
            View / Process
          </Button>
        ),
      },
    ],
    [location.pathname, navigate],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Purchase Ordering & GRN"
          subtitle="Manage POs, receipts, and tag generation for inventory"
          back={{ label: "Back to Dashboard", href: ".." }}
          onNavigate={(href) => navigate(href, { relative: "path" })}
          actions={
            <Button
              size="sm"
              onClick={() =>
                navigate("new", {
                  relative: "path",
                  state: { returnTo: location.pathname },
                })
              }
            >
              <Icon name="packagePlus" className="mr-1" />
              New Purchase Order
            </Button>
          }
        />

        <SectionCard>
          <div className="flex flex-col gap-3">
            {error ? (
              <Alert variant="danger" title="Could not load purchase orders">
                {error}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <DataTableToolbar
                query={search}
                onQueryChange={setSearch}
                searchPlaceholder="Search by PO number or supplier..."
              />
              <div className="w-full md:max-w-[220px]">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={[
                    { label: "All Status", value: "all" },
                    { label: "Draft", value: "DRAFT" },
                    { label: "Confirmed", value: "CONFIRMED" },
                    { label: "Closed", value: "CLOSED" },
                  ]}
                />
              </div>
            </div>

            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(row) => row.id}
              loading={isLoading}
              emptyState={
                <EmptyState
                  title="No purchase orders found"
                  description="Create a purchase order to start the inward and GRN workflow."
                />
              }
              className="border-0 shadow-none"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
