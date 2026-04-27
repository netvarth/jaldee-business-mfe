import { useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, PageHeader, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useOrdersInvoicesPage } from "../queries/orders";
import { buildOrdersInvoiceHref, formatOrdersCurrency } from "../services/orders";
import type { OrdersInvoiceRow } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function OrdersInvoicesList() {
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const invoicesQuery = useOrdersInvoicesPage(page, pageSize);
  const rows = invoicesQuery.data?.rows ?? [];
  const total = invoicesQuery.data?.total ?? 0;
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const normalizedQuery = query.trim().toLowerCase();
  const filtersActive = Boolean(normalizedQuery || statusFilter !== "all");

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, statusFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, total]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(rows.map((row) => row.status).filter((status) => status && status !== "-")));
    return [
      { value: "all", label: "All Invoices" },
      ...statuses.map((status) => ({ value: status, label: status })),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.invoiceNumber,
          row.invoiceUid,
          row.orderId,
          row.orderNumber,
          row.customer,
          row.customerRef,
          row.source,
          row.storeName,
          row.invoiceDate,
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [normalizedQuery, rows, statusFilter]);

  const columns = useMemo(
    () => [
      {
        key: "dateInvoice",
        header: "Date & Invoice Id",
        width: "15%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersInvoiceRow) => (
          <div className="space-y-1" data-testid={`orders-invoices-invoice-${toAutomationId(row.invoiceUid)}`}>
            <div className="font-semibold text-slate-900">{formatInvoiceDate(row.invoiceDate)}</div>
            <div className="text-sm text-slate-500">{formatInvoiceNumber(row)}</div>
          </div>
        ),
      },
      {
        key: "customer",
        header: "Invoice For",
        width: "18%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersInvoiceRow) => <CustomerCell row={row} />,
      },
      {
        key: "source",
        header: "Order Source",
        width: "10%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersInvoiceRow) => (
          <span data-testid={`orders-invoices-source-${toAutomationId(row.invoiceUid)}`}>{row.source || "-"}</span>
        ),
      },
      {
        key: "storeName",
        header: "Store Name",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersInvoiceRow) => (
          <span data-testid={`orders-invoices-store-${toAutomationId(row.invoiceUid)}`}>{row.storeName || "-"}</span>
        ),
      },
      {
        key: "totalAmount",
        header: "Invoice Amount",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        align: "right" as const,
        render: (row: OrdersInvoiceRow) => formatOrdersCurrency(row.totalAmount),
      },
      {
        key: "amountPaid",
        header: "Amount Paid",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        align: "right" as const,
        render: (row: OrdersInvoiceRow) => formatOrdersCurrency(resolveAmountPaid(row)),
      },
      {
        key: "amountDue",
        header: "Amount Due",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        align: "right" as const,
        render: (row: OrdersInvoiceRow) => formatOrdersCurrency(resolveAmountDue(row)),
      },
      {
        key: "status",
        header: "Status",
        width: "12%",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersInvoiceRow) => (
          <Badge
            variant={getInvoiceStatusVariant(row.status)}
            data-testid={`orders-invoices-status-${toAutomationId(row.invoiceUid)}`}
            data-state={toAutomationId(row.status || "unknown")}
          >
            {row.status}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "10%",
        align: "center" as const,
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-5",
        render: (row: OrdersInvoiceRow) => {
          const automationId = toAutomationId(row.invoiceUid);

          return (
            <Button
              id={`orders-invoices-view-${automationId}`}
              data-testid={`orders-invoices-view-${automationId}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const returnTo = getCurrentReturnTo();
                navigate(
                  buildOrdersInvoiceHref(
                    basePath,
                    row.invoiceUid,
                    returnTo ? { from: "invoices", returnTo } : { from: "invoices" },
                    product
                  )
                );
              }}
            >
              View
            </Button>
          );
        },
      },
    ],
    [basePath, navigate, product]
  );

  const pageState = invoicesQuery.isLoading ? "loading" : invoicesQuery.isError ? "error" : filteredRows.length === 0 ? "empty" : "ready";

  return (
    <div data-testid="orders-invoices-page" data-state={pageState} className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle=""
        back={backHref ? { label: "Back", href: backHref } : undefined}
        onNavigate={navigate}
      />
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 2.5h7l3 3v12H5v-15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M12 2.5v3h3M7.5 9h5M7.5 12h5M7.5 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 data-testid="orders-invoices-heading" className="m-0 text-[22px] font-semibold leading-7 text-slate-900">
                  Invoices
                </h2>
                <div data-testid="orders-invoices-count" className="mt-0.5 text-sm font-medium text-slate-500">
                  {filtersActive ? filteredRows.length : total} invoices
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(280px,1fr)_220px_auto]">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="orders-invoices-search-input"
                  data-testid="orders-invoices-search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={product === "health" ? "Search with patient or invoice" : "Search with customer or invoice"}
                  className="h-[38px] w-full rounded-[var(--radius-control)] border border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)] pl-10 pr-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]"
                />
              </div>
              <Select
                id="orders-invoices-status-filter"
                testId="orders-invoices-status-filter"
                options={statusOptions}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
              <Button
                id="orders-invoices-refresh"
                data-testid="orders-invoices-refresh"
                type="button"
                variant="ghost"
                size="sm"
                className="h-[38px]"
                onClick={() => invoicesQuery.refetch()}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {invoicesQuery.isError ? (
          <div data-testid="orders-invoices-error-state" data-state="error">
            <EmptyState title="Invoices unavailable" description="Sales-order invoices could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={filteredRows}
            columns={columns}
            getRowId={(row) => toAutomationId(row.invoiceUid)}
            loading={invoicesQuery.isLoading}
            className="rounded-none border-0 bg-transparent shadow-none"
            tableClassName="min-w-[1420px] text-base"
            data-testid="orders-invoices-table"
            pagination={{
              page,
              pageSize,
              total: filtersActive ? filteredRows.length : total,
              mode: filtersActive ? "client" : "server",
              onChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            emptyState={
              <div data-testid="orders-invoices-empty-state" data-state="empty">
                <EmptyState title="No invoices found" description="Sales-order invoices matching the current filter will appear here." />
              </div>
            }
          />
        )}
      </SectionCard>
    </div>
  );
}

function CustomerCell({ row }: { row: OrdersInvoiceRow }) {
  const automationId = toAutomationId(row.invoiceUid);

  return (
    <div className="flex items-center gap-3" data-testid={`orders-invoices-customer-${automationId}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
        {getInitials(row.customer) || "U"}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">{row.customer}</div>
        <div className="text-sm text-slate-500">{row.customerRef ? `Id:${row.customerRef}` : ""}</div>
      </div>
    </div>
  );
}

function formatInvoiceNumber(row: OrdersInvoiceRow) {
  return row.invoiceNumber ? `#${row.invoiceNumber}` : `#${row.invoiceUid}`;
}

function formatInvoiceDate(value: string) {
  return String(value ?? "").split(",")[0] || "-";
}

function resolveAmountPaid(row: OrdersInvoiceRow) {
  if (typeof row.amountPaid === "number") return row.amountPaid;
  if (typeof row.amountDue === "number") return Math.max(row.totalAmount - row.amountDue, 0);
  return 0;
}

function resolveAmountDue(row: OrdersInvoiceRow) {
  if (typeof row.amountDue === "number") return row.amountDue;
  return Math.max(row.totalAmount - resolveAmountPaid(row), 0);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getInvoiceStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toLowerCase();

  if (normalized.includes("paid") || normalized.includes("settled") || normalized.includes("complete")) return "success";
  if (normalized.includes("pending") || normalized.includes("draft")) return "warning";
  if (normalized.includes("fail") || normalized.includes("cancel") || normalized.includes("overdue")) return "danger";
  if (normalized.includes("partial") || normalized.includes("issued")) return "info";
  return "neutral";
}

function toAutomationId(value: string) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function getCurrentReturnTo() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
