import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  Drawer,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
  type ColumnDef,
} from "@jaldee/design-system";
import { salesService } from "@/services";
import type { SalesOrder } from "@/lib/gold-erp-types";
import {
  buildCsvFromRows,
  calculateOrderTotals,
  downloadExcelDocument,
  downloadPdfDocument,
  downloadWordDocument,
  formatCurrency,
  formatDate,
} from "@/lib/gold-erp-utils";

type SalesRow = {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  balanceDue: number;
  status: string;
  source: SalesOrder;
};

function normalizeSalesOrder(order: SalesOrder): SalesRow {
  const totals = calculateOrderTotals(order);
  return {
    id: String(order.orderUid ?? order.orderNumber),
    orderNumber: String(order.orderNumber ?? "-"),
    orderDate: String(order.orderDate ?? ""),
    customerName: String(order.customerName ?? "-"),
    customerPhone: String(order.customerPhone ?? ""),
    totalAmount: Number(order.totalAmount ?? totals.lineTotal ?? 0),
    balanceDue: Number(order.balanceDue ?? totals.payable ?? 0),
    status: String(order.status ?? "DRAFT"),
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

export default function SalesPage() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState<SalesRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<SalesRow | null>(null);
  const [printOrder, setPrintOrder] = useState<SalesRow | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void salesService
      .getSalesOrdersWithDetails()
      .then((orders) => {
        if (cancelled) return;
        setError("");
        setSalesOrders(Array.isArray(orders) ? orders.map(normalizeSalesOrder) : []);
      })
      .catch((loadError: unknown) => {
        console.error("[SalesPage] failed to load sales orders", loadError);
        if (cancelled) return;
        setSalesOrders([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load sales orders.");
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
      salesOrders.filter((order) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          order.orderNumber.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.customerPhone.includes(search.trim());
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [salesOrders, search, statusFilter],
  );

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todaysOrders = salesOrders.filter((order) => formatDate(order.orderDate) === today);
    const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const todaysOldGold = salesOrders.reduce((sum, order) => sum + calculateOrderTotals(order.source).oldGoldTotal, 0);
    const draftCount = salesOrders.filter((order) => order.status === "DRAFT").length;

    return { todayCount: todaysOrders.length, todaysRevenue, todaysOldGold, draftCount };
  }, [salesOrders]);

  const exportRows = useMemo(
    () =>
      filtered.map((order) => ({
        OrderNumber: order.orderNumber,
        Customer: order.customerName,
        Phone: order.customerPhone || "",
        OrderDate: formatDate(order.orderDate),
        Status: order.status,
        TotalAmount: order.totalAmount,
        BalanceDue: order.balanceDue,
      })),
    [filtered],
  );

  const columns = useMemo<ColumnDef<SalesRow>[]>(
    () => [
      {
        key: "orderNumber",
        header: "Order Number",
        render: (row) => <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{row.orderNumber}</span>,
      },
      { key: "orderDate", header: "Date", render: (row) => formatDate(row.orderDate) },
      { key: "customerName", header: "Customer" },
      {
        key: "customerPhone",
        header: "Phone",
        render: (row) => <span className="font-mono text-[var(--color-text-secondary)]">{row.customerPhone || "-"}</span>,
      },
      { key: "totalAmount", header: "Sales Value", align: "right", render: (row) => formatCurrency(row.totalAmount) },
      {
        key: "balanceDue",
        header: "Amount Due",
        align: "right",
        render: (row) => <span className="font-semibold">{formatCurrency(row.balanceDue)}</span>,
      },
      { key: "status", header: "Status", render: (row) => <Badge variant={getBadgeVariant(row.status)}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            {row.status === "INVOICED" ? (
              <Button variant="ghost" size="sm" onClick={() => setPrintOrder(row)}>
                Print
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(row)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Sales & Invoicing"
          subtitle="Manage retail sales, order confirmation, invoicing, and exchange adjustments"
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
                Export
              </Button>
              <Button size="sm" onClick={() => navigate("new", { relative: "path" })}>
                New Sale Order
              </Button>
            </>
          }
        />

        <ExportDialog open={isExportOpen} onClose={() => setIsExportOpen(false)} rows={exportRows} />
        <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onPrint={setPrintOrder} />
        <InvoiceDialog order={printOrder} onClose={() => setPrintOrder(null)} />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard layout="compact" accent="indigo" icon={<Icon name="cart" />} label="Today's Orders" value={stats.todayCount} />
          <StatCard layout="compact" accent="emerald" icon={<Icon name="chart" />} label="Revenue (Today)" value={formatCurrency(stats.todaysRevenue)} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="refresh" />} label="Old Gold Received" value={formatCurrency(stats.todaysOldGold)} />
          <StatCard layout="compact" accent="slate" icon={<Icon name="database" />} label="Draft Orders" value={stats.draftCount} />
        </div>

        <SectionCard>
          <div className="flex flex-col gap-3">
            {error ? (
              <Alert variant="danger" title="Could not load sales orders">
                {error}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <DataTableToolbar
                query={search}
                onQueryChange={setSearch}
                searchPlaceholder="Search by order number, phone or customer..."
                recordCount={filtered.length}
              />
              <div className="w-full md:max-w-[220px]">
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={[
                    { label: "All", value: "all" },
                    { label: "Draft", value: "DRAFT" },
                    { label: "Confirmed", value: "CONFIRMED" },
                    { label: "Invoiced", value: "INVOICED" },
                    { label: "Cancelled", value: "CANCELLED" },
                  ]}
                />
              </div>
            </div>

            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(row) => row.id}
              loading={isLoading}
              emptyState={<EmptyState title="No sales orders found" description="Create a sales order or adjust the current search and status filters." />}
              className="border-0 shadow-none"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function ExportDialog({
  open,
  onClose,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  rows: Record<string, unknown>[];
}) {
  function downloadCsv() {
    const blob = new Blob([buildCsvFromRows(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Export Sales Orders" description="Choose an export format for the current filtered sales rows." size="sm">
      <div className="grid gap-2">
        <Button variant="outline" onClick={downloadCsv} disabled={!rows.length}>CSV</Button>
        <Button variant="outline" onClick={() => { downloadExcelDocument("Sales Orders", rows); onClose(); }} disabled={!rows.length}>Excel</Button>
        <Button variant="outline" onClick={() => { downloadWordDocument("Sales Orders", rows); onClose(); }} disabled={!rows.length}>Word</Button>
        <Button variant="outline" onClick={() => { downloadPdfDocument("Sales Orders", rows); onClose(); }} disabled={!rows.length}>PDF</Button>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}

function OrderDetailDrawer({
  order,
  onClose,
  onPrint,
}: {
  order: SalesRow | null;
  onClose: () => void;
  onPrint: (order: SalesRow) => void;
}) {
  if (!order) return null;

  const totals = calculateOrderTotals(order.source);

  return (
    <Drawer open={Boolean(order)} onClose={onClose} title={`Order ${order.orderNumber}`} size="md">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Customer" value={order.customerName} />
          <Field label="Phone" value={order.customerPhone || "-"} />
          <Field label="Order Date" value={formatDate(order.orderDate)} />
          <Field label="Status" value={order.status} />
          <Field label="Total Amount" value={formatCurrency(order.totalAmount)} />
          <Field label="Balance Due" value={formatCurrency(order.balanceDue)} />
        </div>

        <SectionCard title="Order Totals">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Line Total" value={formatCurrency(totals.lineTotal)} />
            <Field label="Advance Total" value={formatCurrency(totals.advanceTotal)} />
            <Field label="Old Gold Total" value={formatCurrency(totals.oldGoldTotal)} />
            <Field label="Discount Total" value={formatCurrency(totals.discountTotal)} />
          </div>
        </SectionCard>

        <SectionCard title="Lines">
          {order.source.lines?.length ? (
            <div className="space-y-3">
              {order.source.lines.map((line, index) => (
                <div key={line.lineUid || `${line.tagUid}-${index}`} className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  <div className="font-medium">{line.itemName || line.itemCode || line.tagNumber || line.tagUid}</div>
                  <div className="mt-1 text-[var(--color-text-secondary)]">
                    {line.tagNumber || line.tagUid} | {formatCurrency(line.finalPrice ?? line.sellingPrice ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No line details" description="This order has no loaded line items." />
          )}
        </SectionCard>

        <div className="flex justify-end gap-2">
          {order.status === "INVOICED" ? (
            <Button variant="outline" onClick={() => onPrint(order)}>
              Print Invoice
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Drawer>
  );
}

function InvoiceDialog({
  order,
  onClose,
}: {
  order: SalesRow | null;
  onClose: () => void;
}) {
  if (!order) return null;

  function printInvoice() {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.write(`
      <html>
        <head><title>Invoice ${order.orderNumber}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Invoice ${order.orderNumber}</h2>
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Date:</strong> ${formatDate(order.orderDate)}</p>
          <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
          <p><strong>Balance Due:</strong> ${formatCurrency(order.balanceDue)}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    onClose();
  }

  return (
    <Dialog open={Boolean(order)} onClose={onClose} title={`Print Invoice ${order.orderNumber}`} description="Preview the invoice summary and continue to browser print." size="sm">
      <div className="space-y-2 text-sm">
        <Field label="Customer" value={order.customerName} />
        <Field label="Date" value={formatDate(order.orderDate)} />
        <Field label="Total" value={formatCurrency(order.totalAmount)} />
        <Field label="Amount Due" value={formatCurrency(order.balanceDue)} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={printInvoice}>Print</Button>
      </DialogFooter>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
