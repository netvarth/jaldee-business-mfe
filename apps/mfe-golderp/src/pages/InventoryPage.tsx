import { useEffect, useMemo, useState } from "react";
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
  Tabs,
  type ColumnDef,
} from "@jaldee/design-system";
import { catalogueService, inventoryService } from "@/services";
import { formatCurrency, formatDate, formatWeight, summarizeInventory } from "@/lib/gold-erp-utils";
import type { JewelleryItem, JewelleryTag, StockTransfer } from "@/lib/gold-erp-types";

type InventorySummaryRow = {
  id: string;
  category: string;
  count: number;
  mass: string;
  value: number;
};

type TransferRow = {
  id: string;
  transferUid: string;
  transferNumber: string;
  destination: string;
  transferDate: string;
  itemCount: number;
  status: string;
};

function normalizeTag(tag: JewelleryTag): JewelleryTag {
  return {
    ...tag,
    tagUid: String(tag.tagUid ?? ""),
    itemUid: String(tag.itemUid ?? ""),
    itemName: String(tag.itemName ?? "Item"),
    status: tag.status ?? "DRAFT",
    sellingPrice: Number(tag.sellingPrice ?? 0),
    netWt: Number(tag.netWt ?? tag.netWeight ?? 0),
  };
}

function normalizeItem(item: JewelleryItem): JewelleryItem {
  return {
    ...item,
    itemUid: String(item.itemUid ?? ""),
    name: String(item.name ?? "Item"),
    itemType: item.itemType ?? "RING",
    status: item.status ?? "ACTIVE",
  };
}

function normalizeTransfer(transfer: StockTransfer): TransferRow {
  return {
    id: String(transfer.transferUid ?? transfer.transferNumber ?? ""),
    transferUid: String(transfer.transferUid ?? ""),
    transferNumber: String(transfer.transferNumber ?? "-"),
    destination: String(transfer.toAccountName ?? transfer.toAccount ?? "-"),
    transferDate: String(transfer.transferDate ?? transfer.receivedDate ?? ""),
    itemCount: Number(transfer.totalTags ?? transfer.lines?.length ?? 0),
    status: String(transfer.status ?? "PENDING"),
  };
}

function getBadgeVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "RECEIVED" || status === "IN_STOCK") return "success";
  if (status === "IN_TRANSIT") return "info";
  if (status === "PENDING") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("stock");
  const [tags, setTags] = useState<JewelleryTag[]>([]);
  const [items, setItems] = useState<JewelleryItem[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setIsLoading(true);
      setActionError("");

      try {
        const [loadedTags, loadedItems, loadedTransfers] = await Promise.all([
          inventoryService.getTags(),
          catalogueService.getItems(),
          inventoryService.getTransfers(),
        ]);

        if (cancelled) return;

        setTags(Array.isArray(loadedTags) ? loadedTags.map(normalizeTag) : []);
        setItems(Array.isArray(loadedItems) ? loadedItems.map(normalizeItem) : []);
        setTransfers(Array.isArray(loadedTransfers) ? loadedTransfers.map(normalizeTransfer) : []);
      } catch (error) {
        console.error("[InventoryPage] failed to load inventory", error);
        if (cancelled) return;
        setTags([]);
        setItems([]);
        setTransfers([]);
        setActionError(error instanceof Error ? error.message : "Failed to load inventory data.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, []);

  const stockSummary = useMemo<InventorySummaryRow[]>(
    () =>
      summarizeInventory(tags, items).map((entry, index) => ({
        id: `${entry.category}-${index}`,
        category: entry.category,
        count: entry.count,
        mass: entry.mass,
        value: entry.value,
      })),
    [items, tags],
  );

  const totalStockValue = useMemo(
    () => tags.filter((tag) => tag.status === "IN_STOCK").reduce((sum, tag) => sum + Number(tag.sellingPrice ?? 0), 0),
    [tags],
  );

  const itemsInStock = useMemo(
    () => tags.filter((tag) => tag.status === "IN_STOCK").length,
    [tags],
  );

  const categoriesInStock = stockSummary.length;
  const transfersInTransit = useMemo(
    () => transfers.filter((transfer) => transfer.status === "IN_TRANSIT").length,
    [transfers],
  );

  async function reloadTransfers() {
    const loadedTransfers = await inventoryService.getTransfers();
    setTransfers(Array.isArray(loadedTransfers) ? loadedTransfers.map(normalizeTransfer) : []);
  }

  async function handleTransit(transferUid: string) {
    setActionError("");
    setActionLoadingId(transferUid);

    try {
      await inventoryService.markTransferInTransit(transferUid);
      await reloadTransfers();
    } catch (error) {
      console.error("[InventoryPage] failed to mark transfer in transit", error);
      setActionError(error instanceof Error ? error.message : "Failed to dispatch transfer.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleReceived(transferUid: string) {
    setActionError("");
    setActionLoadingId(transferUid);

    try {
      await inventoryService.confirmTransferReceived(transferUid);
      await reloadTransfers();
    } catch (error) {
      console.error("[InventoryPage] failed to confirm transfer", error);
      setActionError(error instanceof Error ? error.message : "Failed to confirm transfer receipt.");
    } finally {
      setActionLoadingId("");
    }
  }

  const stockColumns = useMemo<ColumnDef<InventorySummaryRow>[]>(
    () => [
      { key: "category", header: "Category", render: (row) => <span className="font-medium">{row.category}</span> },
      { key: "count", header: "Items", align: "right", render: (row) => <span className="tabular-nums">{row.count}</span> },
      { key: "mass", header: "Total Mass", align: "right", render: (row) => <span className="tabular-nums">{row.mass}</span> },
      {
        key: "value",
        header: "Estimated Value",
        align: "right",
        render: (row) => <span className="font-semibold tabular-nums">{formatCurrency(row.value)}</span>,
      },
    ],
    [],
  );

  const transferColumns = useMemo<ColumnDef<TransferRow>[]>(
    () => [
      { key: "transferNumber", header: "Transfer", render: (row) => <span className="font-mono text-xs font-medium">{row.transferNumber}</span> },
      { key: "destination", header: "Destination", render: (row) => <span className="font-medium">{row.destination}</span> },
      { key: "transferDate", header: "Transfer Date", render: (row) => formatDate(row.transferDate) },
      { key: "itemCount", header: "Items", align: "right", render: (row) => <span className="tabular-nums">{row.itemCount}</span> },
      { key: "status", header: "Status", render: (row) => <Badge variant={getBadgeVariant(row.status)}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className="flex justify-end gap-2">
            {row.status === "PENDING" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleTransit(row.transferUid)}
                disabled={actionLoadingId === row.transferUid}
              >
                Dispatch
              </Button>
            ) : null}
            {row.status === "IN_TRANSIT" ? (
              <Button
                size="sm"
                onClick={() => void handleReceived(row.transferUid)}
                disabled={actionLoadingId === row.transferUid}
              >
                Receive
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [actionLoadingId],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader title="Store Inventory" subtitle="Live stock summary" />

        {actionError ? (
          <Alert variant="danger" title="Inventory action failed">
            {actionError}
          </Alert>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard layout="compact" accent="indigo" icon={<Icon name="layers" />} label="Total Stock Value" value={formatCurrency(totalStockValue)} />
          <StatCard layout="compact" accent="emerald" icon={<Icon name="box" />} label="Items In Stock" value={itemsInStock} />
          <StatCard layout="compact" accent="amber" icon={<Icon name="warehouse" />} label="Categories In Stock" value={categoriesInStock} />
          <StatCard layout="compact" accent="slate" icon={<Icon name="refresh" />} label="Transfers In Transit" value={transfersInTransit} />
        </div>

        <SectionCard>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              { value: "stock", label: "Stock by Category" },
              { value: "transfers", label: "Transfer History", count: transfers.length },
            ]}
            className="mb-4"
          />

          {activeTab === "stock" ? (
            <SectionCard title="Current Valuation Summary" noPadding>
              <DataTable
                data={stockSummary}
                columns={stockColumns}
                getRowId={(row) => row.id}
                loading={isLoading}
                emptyState={<EmptyState title="No stock data available" description="Confirmed GRNs will populate inventory valuation by category." />}
                className="border-0 shadow-none"
              />
            </SectionCard>
          ) : (
            <SectionCard title="Inter-Branch Movements" noPadding>
              <DataTable
                data={transfers}
                columns={transferColumns}
                getRowId={(row) => row.id}
                loading={isLoading}
                emptyState={<EmptyState title="No transfers available" description="Create a stock transfer when you need to move tags between locations." />}
                className="border-0 shadow-none"
              />
            </SectionCard>
          )}
        </SectionCard>

        <SectionCard title="Inventory Snapshot">
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <SnapshotField label="Net Weight In Stock" value={formatWeight(tags.filter((tag) => tag.status === "IN_STOCK").reduce((sum, tag) => sum + Number(tag.netWt ?? tag.netWeight ?? 0), 0))} />
            <SnapshotField label="Reserved Tags" value={String(tags.filter((tag) => tag.status === "RESERVED").length)} />
            <SnapshotField label="Transferred Tags" value={String(tags.filter((tag) => tag.status === "TRANSFERRED").length)} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SnapshotField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
