import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, PageHeader, SectionCard } from "@jaldee/design-system";
import { salesService } from "@/services";
import { formatCurrency, formatDate } from "@/lib/gold-erp-utils";

type InvoiceRecord = Record<string, any>;

function parseStoredJson(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolvePaymentLink(invoice: InvoiceRecord | null, loadedBusinessProfile?: Record<string, unknown> | null) {
  const token = typeof invoice?.paymentLink === "string" ? invoice.paymentLink.trim() : "";
  if (!token) return null;
  if (/^https?:\/\//i.test(token)) return token;

  const storedAccount =
    parseStoredJson("account") ||
    parseStoredJson("accountInfo") ||
    parseStoredJson("businessProfile") ||
    parseStoredJson("bProfile");

  const businessProfile =
    loadedBusinessProfile ||
    (storedAccount?.businessProfile as Record<string, unknown> | undefined) ||
    storedAccount;

  const customDomainName = typeof businessProfile?.customDomainName === "string" ? businessProfile.customDomainName.trim() : "";
  if (customDomainName) {
    return `${customDomainName.replace(/\/$/, "")}/pay/${token}`;
  }

  const customId = typeof businessProfile?.customId === "string" ? businessProfile.customId.trim() : "";
  const accEncUid = typeof businessProfile?.accEncUid === "string" ? businessProfile.accEncUid.trim() : "";
  const routeId = customId || accEncUid;
  if (!routeId) return null;

  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL(`${routeId}/pay/${token}`, `${new URL(providerBaseUrl).origin}/`).toString();
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/${routeId}/pay/${token}`;
    }
  }

  return `${window.location.origin.replace(/\/$/, "")}/${routeId}/pay/${token}`;
}

export default function SalesInvoicePage() {
  const navigate = useNavigate();
  const { orderUid = "" } = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [invoiceUid, setInvoiceUid] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void salesService
      .getSalesInvoiceByOrder(orderUid)
      .then((result) => {
        if (cancelled) return;
        setInvoice(result.invoice);
        setInvoiceUid(result.invoiceUid);
        setError("");
      })
      .catch((loadError: unknown) => {
        console.error("[SalesInvoicePage] failed to load invoice", loadError);
        if (cancelled) return;
        setInvoice(null);
        setInvoiceUid(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load invoice.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderUid]);

  useEffect(() => {
    if (!invoice?.paymentLink) return;
    let cancelled = false;

    void salesService
      .getBusinessProfile()
      .then((profile) => {
        if (!cancelled) setBusinessProfile(profile);
      })
      .catch(() => {
        if (!cancelled) setBusinessProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [invoice?.paymentLink]);

  useEffect(() => {
    document.body.classList.add("sales-invoice-page");
    const printStyle = document.createElement("style");
    printStyle.textContent = `
      @media print {
        body.sales-invoice-page * { visibility: hidden !important; }
        body.sales-invoice-page .sales-invoice-print-root,
        body.sales-invoice-page .sales-invoice-print-root * { visibility: visible !important; }
        body.sales-invoice-page .sales-invoice-print-root {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
        }
      }
    `;
    document.head.appendChild(printStyle);

    return () => {
      document.body.classList.remove("sales-invoice-page");
      printStyle.remove();
    };
  }, []);

  const paymentLink = useMemo(() => resolvePaymentLink(invoice, businessProfile), [businessProfile, invoice]);
  const invoiceNumber = invoice?.invoiceNumber || invoice?.invoiceNum || invoice?.orderNumber || "Sales";

  async function openPaymentLink() {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
    } catch {
      // Opening the link is still useful when clipboard permissions are blocked.
    }
    window.open(paymentLink, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <div className="print:hidden">
          <PageHeader
            title={invoice?.invoiceNumber || invoice?.invoiceNum ? `Invoice #${invoice.invoiceNumber || invoice.invoiceNum}` : "Sales Invoice"}
            subtitle="Invoice preview and print actions for the selected sales order."
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/sales")}>
                  Back
                </Button>
                {invoice?.paymentLink ? (
                  <Button variant="outline" size="sm" onClick={openPaymentLink} disabled={!paymentLink}>
                    Payment Link
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => window.print()} disabled={!invoice}>
                  Print
                </Button>
              </>
            }
          />
        </div>

        {error ? (
          <Alert variant="danger" title="Could not load invoice">
            {error}
          </Alert>
        ) : null}

        <SectionCard className="sales-invoice-print-root print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div ref={printRef} className="rounded-md border border-[var(--color-border)] bg-white p-4 text-black shadow-inner md:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <InvoiceDocument invoice={invoice} isLoading={isLoading} />
            {!isLoading && invoice && !invoiceUid ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
                Invoice UID is not available on the sales order yet. This page is showing the order data fallback until the backend returns a recoverable invoice UID.
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function InvoiceDocument({ invoice, isLoading }: { invoice: InvoiceRecord | null; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-sm text-[var(--color-text-secondary)]">Loading latest invoice details...</div>;
  }

  if (!invoice) {
    return <div className="text-sm text-[var(--color-text-secondary)]">No invoice details available.</div>;
  }

  const lines = Array.isArray(invoice.lines) ? invoice.lines : [];
  const locationName = invoice.location?.name || "-";
  const gstNumber = invoice.taxSettings?.gstNumber || "-";
  const gstBusinessName = invoice.taxSettings?.nameAsInGst || invoice.businessName || "-";
  const invoiceNumber = invoice.invoiceNumber || invoice.invoiceNum || "-";
  const amountDue = Number(invoice.balanceDue ?? invoice.amountDue ?? 0) || 0;
  const amountPaid = Number(invoice.advancePaid ?? invoice.amountPaid ?? 0) || 0;
  const totalAmount = Number(invoice.totalAmount ?? invoice.netRate ?? 0) || 0;
  const taxTotal = Number(invoice.taxTotal ?? 0) || 0;
  const discountTotal = Number(invoice.discountTotal ?? invoice.discountAmount ?? 0) || 0;
  const roundedValue = Number(invoice.roundedValue ?? 0) || 0;
  const deliveryCharges = Number(invoice.deliveryCharges ?? 0) || 0;
  const cgstTotal = Number(invoice.cgstTotal ?? 0) || 0;
  const sgstTotal = Number(invoice.sgstTotal ?? 0) || 0;
  const igstTotal = Number(invoice.igstTotal ?? 0) || 0;
  const cessTotal = Number(invoice.cessTotal ?? 0) || 0;
  const customerName = [invoice.providerConsumer?.title, invoice.customerName].filter(Boolean).join(" ") || invoice.customerName || "-";
  const customerId = invoice.providerConsumer?.memberJaldeeId || "-";
  const storeName = invoice.store?.details?.name || invoice.store?.name || locationName;
  const storeLogo = invoice.store?.details?.storeLogo?.s3path || invoice.store?.details?.logo || invoice.store?.logo || null;
  const effectiveSubtotal = Number(invoice.netTotal ?? totalAmount - taxTotal + discountTotal) || 0;
  const billingAddress = [invoice.billingAddress?.address, invoice.billingAddress?.state].filter(Boolean).join(", ");
  const deliveryAddress = [invoice.homeDeliveryAddress?.address, invoice.homeDeliveryAddress?.state].filter(Boolean).join(", ");
  const orderIdentifier = invoice.orderNumber || invoice.orderId || invoice.order?.id || "-";

  return (
    <div className="sales-invoice-document text-[12px] leading-relaxed text-black">
      <div className="mb-6 flex flex-wrap justify-between gap-4 border-b-2 border-black pb-4">
        <div className="flex min-w-0 flex-1 basis-[300px] items-start gap-3">
          {storeLogo ? <img src={storeLogo} alt={storeName || "Store Logo"} className="h-14 w-14 rounded-md border border-zinc-300 object-contain p-1" /> : null}
          <div>
            <div className="text-base font-bold">{storeName || "GOLD ERP JEWELLERS"}</div>
            <div className="text-[11px] text-zinc-600">Sales invoice</div>
          </div>
        </div>
        <div className="min-w-[220px] text-right">
          <h1 className="m-0 text-[22px] font-bold">INVOICE</h1>
          <div className="mt-2">Invoice No: {invoiceNumber}</div>
          <div>Invoice Date: {formatDate(invoice.orderDate || invoice.invoiceDate)}</div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Billed To</div>
          <div>{customerName}</div>
          <div className="text-[11px] text-zinc-500">Customer ID: {customerId}</div>
          <div>{invoice.customerPhone || "-"}</div>
          {invoice.providerConsumer?.email || invoice.contactInfo?.email ? <div>{invoice.providerConsumer?.email || invoice.contactInfo?.email}</div> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 border border-zinc-300 bg-slate-50 p-3 text-[11px]">
          <InvoiceMeta label="Order Number" value={orderIdentifier} />
          <InvoiceMeta label="Payment Status" value={invoice.paymentStatus || "-"} />
          <InvoiceMeta label="Location" value={locationName} />
          <InvoiceMeta label="GSTIN" value={gstNumber} />
          <InvoiceMeta label="GST Name" value={gstBusinessName} />
        </div>
      </div>

      {billingAddress || deliveryAddress ? (
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          {billingAddress ? <AddressBlock label="Billing Address" value={billingAddress} /> : null}
          {deliveryAddress ? <AddressBlock label="Delivery Address" value={deliveryAddress} /> : null}
        </div>
      ) : null}

      <div className="mb-6 overflow-x-auto">
        <table className="min-w-[520px] w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-black">
              <th className="px-2 py-2 text-left">Sl</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Tax</th>
              <th className="px-2 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line: InvoiceRecord, index: number) => (
                <tr key={line.lineUid || line.tagUid || index} className="border-b border-zinc-200">
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="px-2 py-2">{line.itemName || line.tagNumber || "Item"}</td>
                  <td className="px-2 py-2 text-right">{line.quantity || 1}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(line.sellingPrice || line.price || 0)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(line.lineTaxAmount || line.taxAmount || 0)}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(line.finalPrice || line.lineTotal || 0)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-2 py-3 text-zinc-500" colSpan={6}>No invoice line items available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-[380px] border border-black p-4">
          <SummaryLine label="Total Before Tax" value={formatCurrency(effectiveSubtotal)} />
          {discountTotal > 0 ? <SummaryLine label="Discount" value={`- ${formatCurrency(discountTotal)}`} /> : null}
          {deliveryCharges > 0 ? <SummaryLine label="Delivery Charges" value={formatCurrency(deliveryCharges)} /> : null}
          {taxTotal > 0 ? <SummaryLine label="Tax Amount" value={formatCurrency(taxTotal)} /> : null}
          {cgstTotal > 0 ? <SummaryLine label="CGST" value={formatCurrency(cgstTotal)} /> : null}
          {sgstTotal > 0 ? <SummaryLine label="SGST" value={formatCurrency(sgstTotal)} /> : null}
          {igstTotal > 0 ? <SummaryLine label="IGST" value={formatCurrency(igstTotal)} /> : null}
          {cessTotal > 0 ? <SummaryLine label="CESS" value={formatCurrency(cessTotal)} /> : null}
          {roundedValue !== 0 ? <SummaryLine label="Round Off" value={roundedValue > 0 ? formatCurrency(roundedValue) : `- ${formatCurrency(Math.abs(roundedValue))}`} /> : null}
          <SummaryLine label="Net Total" value={formatCurrency(totalAmount)} />
          {amountPaid > 0 ? <SummaryLine label="Amount Paid" value={`- ${formatCurrency(amountPaid)}`} /> : null}
          <div className="mt-3 flex justify-between gap-3 border-t border-black pt-3 text-[15px] font-bold">
            <span>Amount Due:</span>
            <span>{formatCurrency(amountDue)}</span>
          </div>
        </div>
      </div>

      {invoice.netRateInWords ? (
        <div className="mt-4 border border-zinc-300 bg-slate-50 p-3 text-[13px]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Amount In Words</div>
          <div className="mt-1">{invoice.netRateInWords}</div>
        </div>
      ) : null}
    </div>
  );
}

function InvoiceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function AddressBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-300 bg-zinc-50 p-3 text-[13px]">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between gap-3">
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}
