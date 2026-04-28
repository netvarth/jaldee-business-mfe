import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, DataTable, Dialog, EmptyState, Icon, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useOrdersItemConsumptionHistory, useOrdersItemDetail } from "../queries/orders";
import { buildOrdersItemDetailHref, buildOrdersModuleHref } from "../services/orders";
import type { OrdersItemConsumptionHistoryRow, OrdersItemDetail, OrdersItemOption } from "../types";

const HISTORY_PAGE_SIZE = 10;

const statsRangeOptions = [
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
] as const;

export function OrdersItemDetails() {
  const { routeParams, basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const itemId = routeParams?.recordId ?? "";
  const detailQuery = useOrdersItemDetail(itemId);
  const detail = detailQuery.data ?? null;
  const [statsRange, setStatsRange] = useState("7");
  const { page: historyPage, setPage: setHistoryPage, pageSize: historyPageSize, setPageSize: setHistoryPageSize } = useUrlPagination({
    namespace: "ordersItemHistory",
    defaultPageSize: HISTORY_PAGE_SIZE,
    resetDeps: [itemId],
  });
  const historyQuery = useOrdersItemConsumptionHistory(itemId, historyPage, historyPageSize, {
    enabled: Boolean(itemId),
  });
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(
    () => resolveInternalReturnToHref(returnTo) || buildOrdersModuleHref(basePath, product, "items"),
    [basePath, product, returnTo]
  );
  const galleryImages = useMemo(() => (detail ? buildGalleryImages(detail) : []), [detail]);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGalleryImage && !galleryImages.includes(selectedGalleryImage)) {
      setSelectedGalleryImage(null);
    }
  }, [galleryImages, selectedGalleryImage]);

  const historyRows = useMemo(() => {
    const fetchedRows = historyQuery.data?.rows ?? [];
    if (fetchedRows.length) return fetchedRows;
    return detail?.consumptionHistory ?? [];
  }, [detail?.consumptionHistory, historyQuery.data?.rows]);

  const historyTotal = historyQuery.data?.rows?.length
    ? Math.max(historyQuery.data?.total ?? 0, historyRows.length)
    : historyRows.length;

  const itemOptionsColumns = useMemo<ColumnDef<OrdersItemOption>[]>(
    () => [
      { key: "name", header: "Item Name", headerClassName: "font-semibold text-slate-900" },
      { key: "batchApplicable", header: "Batch Applicable", width: "16%", headerClassName: "font-semibold text-slate-900" },
      { key: "trackInventory", header: "Track Inventory", width: "16%", headerClassName: "font-semibold text-slate-900" },
      {
        key: "status",
        header: "Status",
        width: "12%",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <Badge variant={getItemStatusVariant(row.status)} className="rounded-md px-2 py-0.5 text-xs">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {formatItemStatus(row.status)}
          </Badge>
        ),
      },
      {
        key: "id",
        header: "Action",
        width: "10%",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate(buildOrdersItemDetailHref(basePath, row.id, product))}
          >
            <Icon name="eye" />
            &nbsp;View
          </Button>
        ),
      },
    ],
    [basePath, navigate, product]
  );

  const historyColumns = useMemo<ColumnDef<OrdersItemConsumptionHistoryRow>[]>(
    () => [
      { key: "date", header: "Date", width: "13%", headerClassName: "font-semibold text-slate-900" },
      { key: "batch", header: "Batch", width: "9%", headerClassName: "font-semibold text-slate-900" },
      { key: "referenceNumber", header: "Reference Number", width: "18%", headerClassName: "font-semibold text-slate-900" },
      { key: "store", header: "Store", width: "20%", headerClassName: "font-semibold text-slate-900" },
      { key: "transactionType", header: "Transaction Type", width: "17%", headerClassName: "font-semibold text-slate-900" },
      { key: "updateType", header: "Update Type", width: "13%", headerClassName: "font-semibold text-slate-900" },
      {
        key: "quantity",
        header: "Quantity",
        width: "10%",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => formatQuantity(row.quantity),
      },
    ],
    []
  );

  const pageState = detailQuery.isLoading ? "loading" : detailQuery.isError || !detail ? "error" : "ready";

  if (!itemId) {
    return (
      <ItemDetailsShell backHref={backHref}>
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title="Item not selected" description="Choose an item from the list to open its detail view." />
        </SectionCard>
      </ItemDetailsShell>
    );
  }

  if (detailQuery.isLoading && !detail) {
    return (
      <ItemDetailsShell backHref={backHref}>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500">Loading item details...</div>
        </SectionCard>
      </ItemDetailsShell>
    );
  }

  if ((detailQuery.isError && !detail) || !detail) {
    const message = detailQuery.error instanceof Error ? detailQuery.error.message : "";
    return (
      <ItemDetailsShell backHref={backHref}>
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="Item details unavailable"
            description={
              message
                ? `The selected item could not be loaded. ${message}`
                : "The selected item could not be loaded. Return to the item list and try another item."
            }
          />
        </SectionCard>
      </ItemDetailsShell>
    );
  }

  return (
    <>
      <ItemDetailsShell backHref={backHref} detail={detail}>
        <div data-testid="orders-item-details-page" data-state={pageState} className="space-y-1 bg-slate-100">
          <div className="grid gap-3 lg:grid-cols-[minmax(360px,0.48fr)_1fr]">
            <SectionCard className="min-h-[286px] border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <ItemImage
                    item={detail}
                    className="h-[76px] w-[92px] rounded-sm"
                    onClick={galleryImages.length ? () => setSelectedGalleryImage(galleryImages[0]) : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <h1 className="m-0 text-2xl font-semibold leading-7 text-slate-900">{detail.name}</h1>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{detail.property}</div>
                    <div className="mt-3 text-base font-medium text-slate-700">Id : {detail.id}</div>
                    <Badge className="mt-2 rounded-md px-2.5 py-1 text-xs" variant={getItemStatusVariant(detail.status)}>
                      {formatItemStatus(detail.status)}
                    </Badge>
                  </div>
                </div>

                {detail.description ? (
                  <p className="m-0 text-sm leading-6 text-slate-500">{detail.description}</p>
                ) : (
                  <p className="m-0 text-sm leading-6 text-slate-500">No description added.</p>
                )}
                <div className="h-px bg-slate-200" />
              </div>
            </SectionCard>

            <SectionCard className="min-h-[286px] border-slate-200 shadow-sm">
              <div className="space-y-5">
                <div className="grid gap-8 md:grid-cols-3">
                  <InfoField label="Category" value={detail.category} />
                  <InfoField label="Unit" value={detail.unit} />
                  <InfoField label="" value="" hidden />
                </div>
                <div className="h-px bg-slate-100" />
                <div className="grid gap-8 md:grid-cols-3">
                  <InfoField label="Track Inventory" value={detail.trackInventory} />
                  <InfoField label="Batch Applicable" value={detail.batchApplicable} />
                  <InfoField label="Tax" value={detail.tax} />
                </div>
                <div className="h-px bg-slate-100" />
                <div>
                  <div className="mb-2 text-xs font-medium text-slate-400">Gallery</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.gallery.length ? (
                      detail.gallery.map((imageUrl) => (
                        <GalleryImage
                          key={imageUrl}
                          src={imageUrl}
                          alt={detail.name}
                          onClick={() => setSelectedGalleryImage(imageUrl)}
                        />
                      ))
                    ) : (
                      <ItemImage
                        item={detail}
                        className="h-10 w-14 rounded-sm"
                        onClick={galleryImages.length ? () => setSelectedGalleryImage(galleryImages[0]) : undefined}
                      />
                    )}
                    <button
                      type="button"
                      className="flex h-10 w-14 items-center justify-center rounded border border-dashed border-slate-200 bg-white text-slate-400"
                      aria-label="Add gallery image"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Badges"
            className="border-slate-200 shadow-sm"
            actions={
              <Button type="button" variant="outline" size="sm" className="border-[#4C1D95] text-[#4C1D95]">
                Add
              </Button>
            }
          >
            {detail.badges.length ? (
              <div className="flex flex-wrap gap-2">
                {detail.badges.map((badge) => (
                  <Badge key={badge} variant="neutral">
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="min-h-7" />
            )}
          </SectionCard>

          {detail.itemOptions.length > 0 && (
            <SectionCard
              title="Item Attributes"
              className="border-slate-200 shadow-sm"
            >
              <DataTable
                data={detail.itemOptions}
                columns={itemOptionsColumns}
                getRowId={(row) => toAutomationId(row.id)}
                className="rounded-none border-0 bg-transparent shadow-none"
                tableClassName="min-w-[700px]"
                data-testid="orders-item-options-table"
                pagination={{
                  page: 1,
                  pageSize: 10,
                  total: detail.itemOptions.length,
                  mode: "client",
                  onChange: () => {},
                  onPageSizeChange: () => {},
                }}
                emptyState={
                  <EmptyState title="No item options" description="This item has no sub-variants." />
                }
              />
            </SectionCard>
          )}

          <SectionCard
            title="Stats"
            className="border-slate-200 shadow-sm"
            actions={
              <Select
                id="orders-item-details-stats-range"
                testId="orders-item-details-stats-range"
                value={statsRange}
                onChange={(event) => setStatsRange(event.target.value)}
                options={statsRangeOptions.map((option) => ({ value: option.value, label: option.label }))}
                className="min-w-[130px] border-0 bg-slate-100 text-xs"
              />
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatTile tone="blue" icon={<Icon name="list" />} value={detail.stats.numberOfOrders} label="Number Of Orders" />
              <StatTile tone="orange" icon={<Icon name="packagePlus" />} value={detail.stats.orderQuantity} label="Order Quantity" />
              <StatTile tone="green" icon={<Icon name="database" />} value={detail.stats.numberOfPurchase} label="Number Of Purchase" />
              <StatTile tone="slate" icon={<Icon name="box" />} value={detail.stats.purchasedQuantity} label="Purchased Quantity" />
            </div>
          </SectionCard>

          <SectionCard
            title="Item Consumption History"
            className="border-slate-200 shadow-sm"
            actions={
              <Button
                id="orders-item-details-history-filter"
                data-testid="orders-item-details-history-filter"
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 min-w-10 px-0 text-[#4C1D95]"
                aria-label="Filter consumption history"
              >
                <FilterIcon />
              </Button>
            }
          >
            <DataTable
              data={historyRows}
              columns={historyColumns}
              getRowId={(row) => toAutomationId(row.id)}
              loading={historyQuery.isLoading && !historyRows.length}
              className="rounded-none border-0 bg-transparent shadow-none"
              tableClassName="min-w-[1180px]"
              data-testid="orders-item-consumption-history-table"
              pagination={{
                page: historyPage,
                pageSize: historyPageSize,
                total: historyTotal,
                mode: historyQuery.data?.rows?.length ? "server" : "client",
                onChange: setHistoryPage,
                onPageSizeChange: setHistoryPageSize,
              }}
              emptyState={
                <div data-testid="orders-item-consumption-history-empty-state">
                  <EmptyState title="No consumption history" description="Item stock movement history will appear here." />
                </div>
              }
            />
          </SectionCard>
        </div>
      </ItemDetailsShell>
      <GalleryPreviewDialog
        images={galleryImages}
        selectedImage={selectedGalleryImage}
        alt={detail.name}
        onSelect={setSelectedGalleryImage}
        onClose={() => setSelectedGalleryImage(null)}
      />
    </>
  );
}

function ItemDetailsShell({
  backHref,
  detail,
  children,
}: {
  backHref: string;
  detail?: OrdersItemDetail;
  children: ReactNode;
}) {
  const navigate = useSharedNavigate();
  const statusAction = formatItemStatus(detail?.status ?? "").toLowerCase() === "active" ? "Disable" : "Enable";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-1 py-3">
        <button
          type="button"
          data-testid="orders-item-details-back"
          className="flex items-center gap-2 border-0 bg-transparent p-0 text-base font-semibold text-slate-900 transition hover:text-[#4C1D95]"
          onClick={() => navigate(backHref)}
        >
          <ArrowLeftIcon />
          <span>Back To Itemlist</span>
        </button>
        {detail ? (
          <div className="flex items-center gap-3">
            <Button type="button" variant="primary" size="sm">
              Edit
            </Button>
            <Button type="button" variant="danger" size="sm">
              {statusAction}
            </Button>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function InfoField({ label, value, hidden = false }: { label: string; value: string; hidden?: boolean }) {
  if (hidden) return <div className="hidden md:block" aria-hidden="true" />;

  return (
    <div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{value || "-"}</div>
    </div>
  );
}

function ItemImage({
  item,
  className,
  onClick,
}: {
  item: Pick<OrdersItemDetail, "imageUrl" | "name">;
  className: string;
  onClick?: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(item.imageUrl && !imageError);

  useEffect(() => {
    setImageError(false);
  }, [item.imageUrl]);

  const content = hasImage ? (
    <img
      src={item.imageUrl}
      alt={item.name}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setImageError(true)}
    />
  ) : (
    <Icon name="box" />
  );
  const classNames = `flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 text-slate-400 ${
    onClick ? "cursor-zoom-in p-0 transition hover:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/20" : ""
  } ${className}`;

  if (onClick) {
    return (
      <button type="button" className={classNames} onClick={onClick} aria-label={`Open gallery for ${item.name}`}>
        {content}
      </button>
    );
  }

  return (
    <div className={classNames}>
      {content}
    </div>
  );
}

function GalleryImage({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  const [imageError, setImageError] = useState(false);
  const className = "flex h-10 w-14 items-center justify-center overflow-hidden rounded-sm border border-slate-200 bg-slate-50 text-slate-400";

  if (imageError) {
    return (
      <div className={className}>
        <Icon name="box" />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${className} cursor-zoom-in p-0 transition hover:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/20`}
      onClick={onClick}
      aria-label={`Open gallery image for ${alt}`}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setImageError(true)}
      />
    </button>
  );
}

function GalleryPreviewDialog({
  images,
  selectedImage,
  alt,
  onSelect,
  onClose,
}: {
  images: string[];
  selectedImage: string | null;
  alt: string;
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}) {
  if (!selectedImage) return null;

  return (
    <Dialog
      open={Boolean(selectedImage)}
      onClose={onClose}
      title="Gallery"
      description=""
      size="lg"
      contentClassName="w-[92vw] max-w-[860px]"
    >
      <div className="space-y-4">
        <div className="flex max-h-[62vh] min-h-[280px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-3">
          <img src={selectedImage} alt={alt} className="max-h-[58vh] max-w-full object-contain" />
        </div>
        {images.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {images.map((imageUrl) => (
              <button
                key={imageUrl}
                type="button"
                className={`h-14 w-20 overflow-hidden rounded-sm border bg-slate-50 p-0 transition focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/20 ${
                  imageUrl === selectedImage ? "border-[#4C1D95]" : "border-slate-200 hover:border-[#4C1D95]"
                }`}
                onClick={() => onSelect(imageUrl)}
                aria-label={`Show gallery image ${images.indexOf(imageUrl) + 1}`}
              >
                <img src={imageUrl} alt={alt} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function buildGalleryImages(detail: OrdersItemDetail) {
  return Array.from(
    new Set(
      [detail.imageUrl, ...detail.gallery]
        .map((imageUrl) => String(imageUrl ?? "").trim())
        .filter(Boolean)
    )
  );
}

function StatTile({
  tone,
  icon,
  value,
  label,
}: {
  tone: "blue" | "orange" | "green" | "slate";
  icon: ReactNode;
  value: number;
  label: string;
}) {
  const toneClassName = {
    blue: "text-blue-600 ring-blue-100",
    orange: "text-orange-500 ring-orange-100",
    green: "text-emerald-500 ring-emerald-100",
    slate: "text-slate-500 ring-slate-200",
  }[tone];

  return (
    <div className="flex min-h-[60px] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ${toneClassName}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold leading-6 text-slate-900">{formatQuantity(value)}</div>
        <div className="mt-1 text-sm text-slate-700">{label}</div>
      </div>
    </div>
  );
}

function getItemStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("enable") || normalized.includes("active")) return "success";
  if (normalized.includes("disable") || normalized.includes("inactive")) return "danger";
  if (normalized.includes("draft")) return "warning";
  return "neutral";
}

function formatItemStatus(status: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "enable" || normalized === "enabled") return "Active";
  if (normalized === "disable" || normalized === "disabled") return "Inactive";
  return status || "-";
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function resolveInternalReturnToHref(returnTo: string) {
  const raw = String(returnTo ?? "").trim();
  if (!raw || raw === "#") return "";

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "";

    const href = `${url.pathname}${url.search}${url.hash}`;
    if (typeof window !== "undefined") {
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (href === currentHref) return "";
    }

    return href;
  } catch {
    return "";
  }
}

function toAutomationId(value: string) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11.5 4L6.5 9L11.5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.25A.75.75 0 0 1 3.75 4.5h16.5a.75.75 0 0 1 .58 1.226L14.25 13.77v4.98a.75.75 0 0 1-.44.682l-3.75 1.73A.75.75 0 0 1 9 20.48v-6.71L3.17 5.726A.75.75 0 0 1 3 5.25Z" />
    </svg>
  );
}
