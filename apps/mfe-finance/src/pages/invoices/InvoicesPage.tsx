import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  SectionCard,
  Select,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { formatCurrency } from "../../lib/financeData";
import { FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  function getInvoiceTypeMeta(type: string) {
    const normalized = String(type || "").toUpperCase();
    if (normalized.includes("MASTER")) {
      return { label: "Master Invoice", className: "text-[#0F3D91]" };
    }
    if (normalized.includes("LINKED")) {
      return { label: "Linked Invoice", className: "text-emerald-500" };
    }
    return { label: "Individual Invoice", className: "text-amber-500" };
  }

  function formatInvoicePaymentStatus(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "-";
    }
    return normalized
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\bnotpaid\b/i, "Not Paid")
      .replace(/\bpartiallypaid\b/i, "Partially Paid")
      .replace(/\bfullypaid\b/i, "Fully Paid")
      .replace(/\bpaid\b/i, "Paid");
  }

  function formatInvoiceStatus(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "-";
    }
    if (/cancel/i.test(normalized)) {
      return "Cancelled";
    }
    return normalized
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  function getStatusText(row: any) {
    const invoiceStatus = String(row.invoiceStatus || row.status || "");
    const paymentStatus = String(row.invoicePaymentStatus || "");
    const formattedPaymentStatus = formatInvoicePaymentStatus(paymentStatus);
    const formattedInvoiceStatus = formatInvoiceStatus(invoiceStatus);
    const invoiceStatusClass =
      /settled/i.test(invoiceStatus)
        ? "text-emerald-600"
        : /cancel/i.test(invoiceStatus)
          ? "text-rose-600"
          : "text-slate-700";

    return (
      <span className="text-slate-800">
        {formattedPaymentStatus}{" "}
        <span className={invoiceStatusClass}>({formattedInvoiceStatus})</span>
      </span>
    );
  }

  useEffect(() => {
    let active = true;
    async function loadInvoices() {
      setLoading(true);
      try {
        const res = await financeApi.invoices.listGeneral<any>({ from: (page - 1) * pageSize, count: pageSize });
        if (active) {
          const payload = res.data?.content || res.data || [];
          const normalized = (Array.isArray(payload) ? payload : []).map((item: any, index: number) => ({
            id: String(item.uid || item.invoiceNum || item.invoiceId || `invoice-${index}`),
            detailUid: String(item.uid || item.invoiceUid || item.invoiceEncId || item.id || item.invoiceId || ""),
            invoiceNum: String(item.invoiceNum || item.invoiceId || item.uid || `invoice-${index}`),
            customer: String(item.consumerName || item.customerName || item.invoiceFor || item.userName || ""),
            customerCode:
              item.consumerUid &&
              String(item.consumerUid) !== "00000000-0000-0000-0000-000000000000"
                ? String(item.consumerUid)
                : "",
            assignedFor: String(item.assignedUserName || item.createdByName || item.userName || item.consumerPhone || "-"),
            category: String(item.categoryName || item.invoiceCategoryName || "Finance"),
            product: String(item.product || item.productName || item.featureModule || "FINANCE"),
            invoiceType: String(item.internalInvoiceType || item.invoiceType || item.type || "INDIVIDUAL_INVOICE"),
            amount: Number(item.netRate || item.netTotal || item.totalAmount || item.amountDue || 0),
            amountDue: Number(item.amountDue || item.netRate || item.netTotal || item.totalAmount || 0),
            date: item.invoiceDate || item.createdDate || item.createdAt
              ? new Date(item.invoiceDate || item.createdDate || item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            location: String(item.locationName || item.location || item.locationPlace || item.locationUid || "-"),
            invoiceStatus: String(item.invoiceStatus || item.billStatus || item.status || "New"),
            invoicePaymentStatus: String(item.invoicePaymentStatus || item.paymentStatus || "NotPaid"),
            status: String(item.invoiceStatus || item.billStatus || item.status || item.invoicePaymentStatus || "New"),
          }));
          setInvoices(normalized);
          setTotalRecords(res.data?.totalElements ?? res.data?.length ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch invoices", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInvoices();
    return () => { active = false; };
  }, [page, pageSize]);

  const unifiedInvoiceColumns = useMemo<ColumnDef<(typeof invoices)[number]>[]>(
    () => [
      { key: "invoiceNum", header: "ID", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "date", header: "Date", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "customer",
        header: "Invoice For",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => <div className="font-medium text-slate-900">{row.customer || "-"}</div>,
      },
      { key: "assignedFor", header: "Assigned For", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "location", header: "Location", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "amount", header: "Amount (INR)", align: "right", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4", render: (row) => formatCurrency(row.amount).replace("â‚¹", "").trim() },
      { key: "amountDue", header: "Amount Due (INR)", align: "right", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4", render: (row) => formatCurrency(row.amountDue).replace("â‚¹", "").trim() },
      { key: "category", header: "Category", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "product", header: "Product", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "invoiceType",
        header: "Invoice Type",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => {
          const typeMeta = getInvoiceTypeMeta(row.invoiceType);
          return <span className={`font-semibold ${typeMeta.className}`}>{typeMeta.label}</span>;
        },
      },
      { key: "status", header: "Status", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4", render: (row) => getStatusText(row) },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(`view/${row.detailUid || row.id}`)}>
              View
            </Button>
            <button
              type="button"
              className="flex h-9 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
              aria-label={`More actions for invoice ${row.invoiceNum}`}
            >
              <Icon name="moreVertical" className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Invoice"
      subtitle=" "
      actions={
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              value="Finance"
              onChange={() => undefined}
              options={[{ value: "Finance", label: "Finance" }]}
            />
          </div>
          <Button onClick={() => navigate("newInvoice")}>Create Invoice</Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-[#4B1FCF] transition hover:bg-slate-100"
            aria-label="Filter invoices"
          >
            <Icon name="filter" className="h-5 w-5" />
          </button>
        </div>
      }
      main={
        <SectionCard className="border-slate-200 bg-white shadow-sm">
          <div className="mb-4 text-xl font-semibold text-slate-900">{`Invoice(${totalRecords})`}</div>
          <DataTable
            data={invoices}
            columns={unifiedInvoiceColumns}
            getRowId={(row) => row.id}
            loading={loading}
            pagination={{
              page,
              pageSize,
              total: totalRecords,
              onChange: setPage,
              onPageSizeChange: (size) => {
                setPage(1);
                setPageSize(size);
              },
              mode: "server",
            }}
            emptyState={<EmptyState title="No Invoice" description={loading ? "Loading invoices..." : "No invoices found."} />}
          />
        </SectionCard>
      }
    />
  );

  const columns = useMemo<ColumnDef<(typeof invoices)[number]>[]>(
    () => [
      { key: "invoiceNum", header: "ID" },
      { key: "date", header: "Date" },
      {
        key: "customer",
        header: "Invoice For",
        render: (row) => <div className="font-medium text-slate-900">{row.customer || "-"}</div>,
      },
      { key: "assignedFor", header: "Assigned For" },
      { key: "location", header: "Location" },
      { key: "amount", header: "Amount (INR)", align: "right", render: (row) => formatCurrency(row.amount).replace("₹", "").trim() },
      { key: "amountDue", header: "Amount Due (INR)", align: "right", render: (row) => formatCurrency(row.amountDue).replace("₹", "").trim() },
      { key: "category", header: "Category" },
      { key: "product", header: "Product" },
      {
        key: "invoiceType",
        header: "Invoice Type",
        render: (row) => {
          const typeMeta = getInvoiceTypeMeta(row.invoiceType);
          return <span className={`font-semibold ${typeMeta.className}`}>{typeMeta.label}</span>;
        },
      },
      { key: "status", header: "Status", render: (row) => getStatusText(row) },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(`view/${row.detailUid || row.id}`)}>
              View
            </Button>
            <button
              type="button"
              className="flex h-9 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
              aria-label={`More actions for invoice ${row.invoiceNum}`}
            >
              <Icon name="moreVertical" className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(totalRecords, page * pageSize);
  const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    if (totalPages <= 5) {
      return index + 1;
    }
    const start = Math.min(Math.max(page - 2, 1), totalPages - 4);
    return start + index;
  });

  return (
    <PageShell
      title={`Invoice (${totalRecords})`}
      subtitle=" "
      actions={
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              value="Finance"
              onChange={() => undefined}
              options={[{ value: "Finance", label: "Finance" }]}
            />
          </div>
          <Button onClick={() => navigate("newInvoice")}>Create Invoice</Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-[#4B1FCF] transition hover:bg-slate-100"
            aria-label="Filter invoices"
          >
            <Icon name="filter" className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <SectionCard className="border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-800">
                <th className="px-4 py-4 font-semibold">ID</th>
                <th className="px-4 py-4 font-semibold">Date</th>
                <th className="px-4 py-4 font-semibold">Invoice For</th>
                <th className="px-4 py-4 font-semibold">Assigned For</th>
                <th className="px-4 py-4 font-semibold">Location</th>
                <th className="px-4 py-4 font-semibold text-right">Amount (₹)</th>
                <th className="px-4 py-4 font-semibold text-right">Amount Due (₹)</th>
                <th className="px-4 py-4 font-semibold">Category</th>
                <th className="px-4 py-4 font-semibold">Product</th>
                <th className="px-4 py-4 font-semibold">Invoice Type</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.length ? invoices.map((row) => {
                const typeMeta = getInvoiceTypeMeta(row.invoiceType);
                return (
                  <tr key={row.id} className="text-slate-800">
                    <td className="px-4 py-4 font-medium">{row.invoiceNum}</td>
                    <td className="px-4 py-4">{row.date}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{row.customer || "-"}</div>
                    </td>
                    <td className="px-4 py-4">{row.assignedFor || "-"}</td>
                    <td className="px-4 py-4">{row.location || "-"}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(row.amount).replace("₹", "").trim()}</td>
                    <td className="px-4 py-4 text-right">{formatCurrency(row.amountDue).replace("₹", "").trim()}</td>
                    <td className="px-4 py-4">{row.category}</td>
                    <td className="px-4 py-4">{row.product}</td>
                    <td className={`px-4 py-4 font-semibold ${typeMeta.className}`}>{typeMeta.label}</td>
                    <td className="px-4 py-4">{getStatusText(row)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => navigate(`view/${row.detailUid || row.id}`)}>
                          View
                        </Button>
                        <button
                          type="button"
                          className="flex h-9 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                          aria-label={`More actions for invoice ${row.invoiceNum}`}
                        >
                          <Icon name="moreVertical" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-500">
                    {loading ? "Loading invoices..." : "No invoices found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <div>
            Showing {startRecord} to {endRecord} of {totalRecords} Invoices
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
            >
              «
            </button>
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
            >
              ‹
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  page === pageNumber ? "bg-indigo-100 font-semibold text-[#4B1FCF]" : "text-slate-700"
                }`}
              >
                  {pageNumber}
              </button>
            ))}
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
            >
              ›
            </button>
            <button
              type="button"
              className="px-2 text-lg text-slate-400 disabled:opacity-40"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
            >
              »
            </button>
            <div className="w-20">
              <Select
                value={String(pageSize)}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value) || 10);
                }}
                options={[
                  { value: "10", label: "10" },
                  { value: "15", label: "15" },
                  { value: "20", label: "20" },
                ]}
              />
            </div>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
