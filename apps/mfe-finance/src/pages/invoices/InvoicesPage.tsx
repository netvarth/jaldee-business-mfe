import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Icon,
  Popover,
  Select,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { formatCurrency } from "../../lib/financeData";
import { FinanceFeatureLayout, FinanceFilterButton, ServerDataTableCard } from "../../components/FinancePageLayout";

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
        className: "py-4 text-right",
        render: (row) => {
          const isMaster = String(row.invoiceType || "").toUpperCase().includes("MASTER");
          return (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isMaster) {
                    navigate(`/master-invoice/${row.detailUid || row.id}`);
                  } else {
                    navigate(`view/${row.detailUid || row.id}`);
                  }
                }}
              >
                View
              </Button>
              {!isMaster && (
                <Popover
                  placement="bottom"
                  align="end"
                  portal
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`More actions for invoice ${row.invoiceNum || row.id}`}
                      className="h-8 w-8 px-0"
                      icon={<Icon name="moreVertical" className="text-[var(--color-text-secondary)]" aria-hidden="true" />}
                    />
                  }
                >
                  <div className="flex min-w-[120px] flex-col gap-0.5 p-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-8 px-2 text-[13px] font-normal text-slate-700 hover:bg-slate-50"
                      onClick={() => navigate(`edit/${row.detailUid || row.id}`)}
                      icon={<Icon name="pencil" className="h-3.5 w-3.5 text-slate-500" />}
                    >
                      Edit
                    </Button>
                  </div>
                </Popover>
              )}
            </div>
          );
        },
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
        </div>
      }
      main={
        <ServerDataTableCard
          actions={
            <FinanceFilterButton testId="finance-invoices-filter" />
          }
          title={`Invoice (${totalRecords})`}
          data={invoices}
          columns={unifiedInvoiceColumns}
          getRowId={(row) => row.id}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={totalRecords}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
          testId="finance-invoice-table"
          emptyTitle="No Invoice"
          emptyDescription={loading ? "Loading invoices..." : "No invoices found."}
        />
      }
    />
  );

}
