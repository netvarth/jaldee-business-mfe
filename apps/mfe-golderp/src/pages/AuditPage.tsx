import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import { inventoryService, purchaseService, salesService } from "@/services";
import { formatDate } from "@/lib/gold-erp-utils";
import type { JewelleryTag, PurchaseOrder, SalesOrder, StockTransfer } from "@/lib/gold-erp-types";

type AuditEntry = {
  id: string;
  action: string;
  entity: "Purchase" | "Sales" | "Tag" | "Transfer";
  detail: string;
  timestamp: string;
  icon: "refresh" | "cart" | "tag" | "warehouse";
};

function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return {
    ...po,
    poUid: String(po.poUid ?? ""),
    poNumber: String(po.poNumber ?? "-"),
    supplierName: String(po.supplierName ?? "-"),
    orderDate: String(po.orderDate ?? ""),
    status: po.status ?? "DRAFT",
  };
}

function normalizeSalesOrder(order: SalesOrder): SalesOrder {
  return {
    ...order,
    orderUid: String(order.orderUid ?? ""),
    orderNumber: String(order.orderNumber ?? "-"),
    customerName: String(order.customerName ?? "-"),
    orderDate: String(order.orderDate ?? ""),
    status: order.status ?? "DRAFT",
    totalAmount: Number(order.totalAmount ?? 0),
  };
}

function normalizeTag(tag: JewelleryTag): JewelleryTag {
  return {
    ...tag,
    tagUid: String(tag.tagUid ?? ""),
    tagNumber: String(tag.tagNumber ?? tag.tagUid ?? "-"),
    status: tag.status ?? "DRAFT",
  };
}

function normalizeTransfer(transfer: StockTransfer): StockTransfer {
  return {
    ...transfer,
    transferUid: String(transfer.transferUid ?? ""),
    transferNumber: String(transfer.transferNumber ?? "-"),
    transferDate: String(transfer.transferDate ?? transfer.receivedDate ?? ""),
    status: transfer.status ?? "PENDING",
  };
}

function getEntityVariant(entity: AuditEntry["entity"]): "success" | "warning" | "danger" | "info" | "neutral" {
  if (entity === "Sales") return "info";
  if (entity === "Purchase") return "warning";
  if (entity === "Transfer") return "success";
  return "neutral";
}

export default function AuditPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [tags, setTags] = useState<JewelleryTag[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAuditData() {
      setIsLoading(true);
      setError("");

      try {
        const [loadedPurchases, loadedSales, loadedTags, loadedTransfers] = await Promise.all([
          purchaseService.getPurchaseOrders(),
          salesService.getSalesOrderHeaders(),
          inventoryService.getTags(),
          inventoryService.getTransfers(),
        ]);

        if (cancelled) return;

        setPurchaseOrders(Array.isArray(loadedPurchases) ? loadedPurchases.map(normalizePurchaseOrder) : []);
        setSalesOrders(Array.isArray(loadedSales) ? loadedSales.map(normalizeSalesOrder) : []);
        setTags(Array.isArray(loadedTags) ? loadedTags.map(normalizeTag) : []);
        setTransfers(Array.isArray(loadedTransfers) ? loadedTransfers.map(normalizeTransfer) : []);
      } catch (loadError) {
        console.error("[AuditPage] failed to load audit data", loadError);
        if (cancelled) return;
        setPurchaseOrders([]);
        setSalesOrders([]);
        setTags([]);
        setTransfers([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load audit activity.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAuditData();

    return () => {
      cancelled = true;
    };
  }, []);

  const auditEntries = useMemo<AuditEntry[]>(
    () =>
      [
        ...purchaseOrders.map((po) => ({
          id: `po-${po.poUid}`,
          action: "Purchase Order",
          entity: "Purchase" as const,
          detail: `${po.poNumber} for ${po.supplierName}`,
          timestamp: po.orderDate || "",
          icon: "refresh" as const,
        })),
        ...salesOrders.map((order) => ({
          id: `so-${order.orderUid}`,
          action: "Sales Order",
          entity: "Sales" as const,
          detail: `${order.orderNumber} for ${order.customerName}`,
          timestamp: order.orderDate || "",
          icon: "cart" as const,
        })),
        ...tags.slice(0, 10).map((tag) => ({
          id: `tag-${tag.tagUid}`,
          action: "Tag Status",
          entity: "Tag" as const,
          detail: `${tag.tagNumber} is ${tag.status}`,
          timestamp: new Date().toISOString(),
          icon: "tag" as const,
        })),
        ...transfers.map((transfer) => ({
          id: `tr-${transfer.transferUid}`,
          action: "Transfer",
          entity: "Transfer" as const,
          detail: `${transfer.transferNumber} to ${transfer.toAccountName || transfer.toAccount || "-"}`,
          timestamp: transfer.transferDate || "",
          icon: "warehouse" as const,
        })),
      ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [purchaseOrders, salesOrders, tags, transfers],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title="Audit Log" subtitle="Derived transaction activity from current ERP records" />

        {error ? (
          <Alert variant="danger" title="Could not load audit activity">
            {error}
          </Alert>
        ) : null}

        <SectionCard noPadding>
          {isLoading ? (
            <div className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">Loading audit activity...</div>
          ) : auditEntries.length === 0 ? (
            <EmptyState title="No audit activity found" description="Transactions will appear here once purchase, sales, tags, or transfer records are available." />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_24%,white)]">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon name={entry.icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{entry.action}</span>
                      <Badge variant={getEntityVariant(entry.entity)}>{entry.entity}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{entry.detail}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-[var(--color-text-secondary)]">{formatDate(entry.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
