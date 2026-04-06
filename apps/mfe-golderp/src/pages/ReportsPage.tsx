import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogFooter,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import { inventoryService, purchaseService, rateService, salesService } from "@/services";
import {
  buildCsvFromRows,
  calculateOrderTotals,
  downloadExcelDocument,
  downloadPdfDocument,
  downloadWordDocument,
  flattenExportRows,
} from "@/lib/gold-erp-utils";
import type { JewelleryTag, MetalRate, PurchaseOrder, SalesOrder } from "@/lib/gold-erp-types";

type ReportCard = {
  name: string;
  description: string;
  icon: "cart" | "box" | "tag" | "warehouse" | "refresh" | "globe" | "trend" | "database";
  data: unknown;
};

function normalizeSalesOrder(order: SalesOrder): SalesOrder {
  return {
    ...order,
    orderUid: String(order.orderUid ?? ""),
    orderNumber: String(order.orderNumber ?? "-"),
    customerName: String(order.customerName ?? "-"),
    orderType: order.orderType ?? "WALK_IN",
    orderDate: String(order.orderDate ?? ""),
    status: order.status ?? "DRAFT",
    totalAmount: Number(order.totalAmount ?? 0),
  };
}

function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return {
    ...po,
    poUid: String(po.poUid ?? ""),
    poNumber: String(po.poNumber ?? "-"),
    supplierName: String(po.supplierName ?? "-"),
    orderDate: String(po.orderDate ?? ""),
    status: po.status ?? "DRAFT",
    totalAmount: Number(po.totalAmount ?? 0),
  };
}

function normalizeTag(tag: JewelleryTag): JewelleryTag {
  return {
    ...tag,
    tagUid: String(tag.tagUid ?? ""),
    tagNumber: String(tag.tagNumber ?? tag.barcode ?? tag.tagUid ?? "-"),
    itemName: String(tag.itemName ?? "Item"),
    status: tag.status ?? "DRAFT",
  };
}

function normalizeRate(rate: MetalRate): MetalRate {
  return {
    ...rate,
    rateUid: String(rate.rateUid ?? ""),
    metalName: String(rate.metalName ?? "Metal"),
    purityLabel: String(rate.purityLabel ?? rate.purityName ?? "Purity"),
    ratePerGram: Number(rate.ratePerGram ?? 0),
  };
}

export default function ReportsPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [tags, setTags] = useState<JewelleryTag[]>([]);
  const [rates, setRates] = useState<MetalRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setIsLoading(true);
      setError("");

      try {
        const [loadedSales, loadedPurchases, loadedTags, loadedRates] = await Promise.all([
          salesService.getSalesOrderHeaders(),
          purchaseService.getPurchaseOrders(),
          inventoryService.getTags(),
          rateService.getRates(),
        ]);

        if (cancelled) return;

        setSalesOrders(Array.isArray(loadedSales) ? loadedSales.map(normalizeSalesOrder) : []);
        setPurchaseOrders(Array.isArray(loadedPurchases) ? loadedPurchases.map(normalizePurchaseOrder) : []);
        setTags(Array.isArray(loadedTags) ? loadedTags.map(normalizeTag) : []);
        setRates(Array.isArray(loadedRates) ? loadedRates.map(normalizeRate) : []);
      } catch (loadError) {
        console.error("[ReportsPage] failed to load reports data", loadError);
        if (cancelled) return;
        setSalesOrders([]);
        setPurchaseOrders([]);
        setTags([]);
        setRates([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load report snapshots.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const reports = useMemo<ReportCard[]>(
    () => [
      { name: "Sales Report", description: `${salesOrders.length} sales orders`, icon: "cart", data: salesOrders },
      { name: "Purchase Report", description: `${purchaseOrders.length} purchase orders`, icon: "box", data: purchaseOrders },
      { name: "Tag Movement Report", description: `${tags.length} tracked tags`, icon: "tag", data: tags },
      {
        name: "Stock by Status",
        description: `${tags.filter((tag) => tag.status === "IN_STOCK").length} tags in stock`,
        icon: "warehouse",
        data: tags.map((tag) => ({
          tagNumber: tag.tagNumber,
          itemName: tag.itemName,
          status: tag.status,
        })),
      },
      {
        name: "Metal Exchange Report",
        description: "Derived from sales orders",
        icon: "refresh",
        data: salesOrders.map((order) => ({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          oldGoldTotal: calculateOrderTotals(order).oldGoldTotal,
        })),
      },
      {
        name: "Online Order Report",
        description: `${salesOrders.filter((order) => order.orderType === "ONLINE").length} online orders`,
        icon: "globe",
        data: salesOrders.filter((order) => order.orderType === "ONLINE"),
      },
      { name: "Rate History Snapshot", description: `${rates.length} active rates`, icon: "trend", data: rates },
      {
        name: "Invoice Summary",
        description: `${salesOrders.filter((order) => order.status === "INVOICED").length} invoiced orders`,
        icon: "database",
        data: salesOrders.filter((order) => order.status === "INVOICED"),
      },
    ],
    [purchaseOrders, rates, salesOrders, tags],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title="Reports & Analytics" subtitle="Operational report snapshots using live Gold ERP data" />

        {error ? (
          <Alert variant="danger" title="Could not load report data">
            {error}
          </Alert>
        ) : null}

        {isLoading ? (
          <SectionCard>
            <div className="text-sm text-[var(--color-text-secondary)]">Loading report snapshots...</div>
          </SectionCard>
        ) : reports.length === 0 ? (
          <SectionCard>
            <EmptyState title="No reports available" description="Reports will appear here once ERP records are available." />
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const rows = flattenExportRows(report.data);
              return (
                <SectionCard key={report.name} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon name={report.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{report.name}</h3>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{report.description}</p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" size="sm" disabled>
                        {rows.length} rows
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                        Export
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}

        <ReportExportDialog report={selectedReport} onClose={() => setSelectedReport(null)} />
      </div>
    </div>
  );
}

function ReportExportDialog({
  report,
  onClose,
}: {
  report: ReportCard | null;
  onClose: () => void;
}) {
  if (!report) return null;

  const rows = flattenExportRows(report.data);
  const fileBase = report.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  function downloadCsv() {
    const blob = new Blob([buildCsvFromRows(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBase}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <Dialog
      open={Boolean(report)}
      onClose={onClose}
      title={`Export ${report.name}`}
      description="Choose an export format for the selected report snapshot."
      size="sm"
    >
      <div className="grid gap-2">
        <Button variant="outline" onClick={downloadCsv} disabled={!rows.length}>CSV</Button>
        <Button variant="outline" onClick={() => { downloadExcelDocument(report.name, rows); onClose(); }} disabled={!rows.length}>Excel</Button>
        <Button variant="outline" onClick={() => { downloadWordDocument(report.name, rows); onClose(); }} disabled={!rows.length}>Word</Button>
        <Button variant="outline" onClick={() => { downloadPdfDocument(report.name, rows); onClose(); }} disabled={!rows.length}>PDF</Button>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}
