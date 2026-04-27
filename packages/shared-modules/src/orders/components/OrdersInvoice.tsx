import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, DataTable, Dialog, DialogFooter, EmptyState, Input, PhoneInput, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  buildOrdersDetailHref,
  buildOrdersModuleHref,
  formatOrdersCurrency,
  normalizeOrdersInvoiceUid,
} from "../services/orders";
import type { ProductKey } from "@jaldee/auth-context";
import {
  useOrdersCustomer,
  useOrdersInvoiceAuditLogs,
  useOrdersInvoiceAuditLogsCount,
  useOrdersInvoiceDetail,
  useOrdersOrderDetail,
  useOrdersPaymentDetails,
} from "../queries/orders";
import { SharedOrdersLayout } from "./shared";

type InvoiceLineItem = {
  name: string;
  qty: number;
  mrp: number;
  sellingPrice: number;
  netTotal: number;
  gst: number;
  totalAmount: number;
};

type InvoiceAuditLogRow = {
  uid: string;
  date: string;
  action: string;
  type: string;
  description: string;
  user: string;
};

type SharePhoneValue = { countryCode: string; number: string };
const RUPEE_SYMBOL = "\u20B9";

export function OrdersInvoice() {
  const { basePath, routeParams, account, location, user, api, product } = useSharedModulesContext();
  const recordId = routeParams?.recordId ?? null;
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const from = searchParams?.get("from") ?? "";
  const invoiceUid = normalizeOrdersInvoiceUid(String(searchParams?.get("invUid") ?? recordId ?? ""));
  const invoiceExportRef = useRef<HTMLDivElement | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<SharePhoneValue>({ countryCode: "+91", number: "" });
  const [whatsAppNumber, setWhatsAppNumber] = useState<SharePhoneValue>({ countryCode: "+91", number: "" });
  const [emailId, setEmailId] = useState("");
  const invoiceQuery = useOrdersInvoiceDetail(invoiceUid || null);
  const invoice = invoiceQuery.data ?? null;
  const paymentQuery = useOrdersPaymentDetails(invoiceUid || null);
  const customerId = invoice?.customerId ?? null;
  const customerQuery = useOrdersCustomer(customerId);
  const orderRecordId = useMemo(() => invoice?.orderId ?? resolveOrderRecordId(returnTo), [invoice?.orderId, returnTo]);
  const backHref = useMemo(
    () => resolveInvoiceBackHref(basePath, product, returnTo, from, orderRecordId),
    [basePath, from, orderRecordId, product, returnTo]
  );
  const orderDetailQuery = useOrdersOrderDetail(orderRecordId);
  const orderDetail = orderDetailQuery.data ?? null;

  const invoiceTitle = useMemo(() => {
    if (invoice?.invoiceNumber) return `Invoice No# : ${invoice.invoiceNumber}`;
    if (invoiceUid) return `Invoice No# : ${invoiceUid}`;
    return "Invoice";
  }, [invoice?.invoiceNumber, invoiceUid]);

  const createdByLabel = useMemo(() => {
    const maybeUser: any = user as any;
    const displayName =
      String(maybeUser?.displayName ?? "").trim() ||
      [maybeUser?.firstName, maybeUser?.lastName].filter(Boolean).join(" ").trim() ||
      String(maybeUser?.name ?? "").trim();
    return displayName || "-";
  }, [user]);

  const outletDetails = useMemo(() => {
    return readOutletDetails(invoice?.raw, account, location, orderDetail);
  }, [account, invoice?.raw, location, orderDetail]);

  const companyName = useMemo(() => {
    return readCompanyName(invoice?.raw, account, orderDetail);
  }, [account, invoice?.raw, orderDetail]);

  const invoiceDateLabel = invoice?.invoiceDate || "";
  const orderNumberLabel = orderDetail?.orderNumber || invoice?.orderId || "";
  const gstNumberLabel = String(
    (invoice?.raw as any)?.taxSettings?.gstNumber ??
      (invoice?.raw as any)?.gstNumber ??
      orderDetail?.gstNumber ??
      ""
  ).trim();

  const customerNameLabel =
    customerQuery.data?.name || orderDetail?.customer || invoice?.customer || "-";
  const customerIdLabel = customerQuery.data?.memberJaldeeId || customerQuery.data?.id || customerId || "";

  const lineItems: InvoiceLineItem[] = useMemo(() => {
    const payload: any = invoice?.raw as any;
    const candidates =
      (Array.isArray(payload?.invoiceItems) ? payload.invoiceItems : null) ||
      (Array.isArray(payload?.items) ? payload.items : null) ||
      (Array.isArray(payload?.itemList) ? payload.itemList : null) ||
      (Array.isArray(payload?.lines) ? payload.lines : null) ||
      [];

    const invoiceItems = (candidates as any[]).map((item) => {
      const qty = toNumber(item?.qty ?? item?.quantity ?? item?.count ?? 0);
      const mrp = toNumber(item?.mrp ?? item?.mrpPrice ?? item?.listPrice ?? item?.rate ?? 0);
      const sellingPrice = toNumber(item?.sellingPrice ?? item?.sPrice ?? item?.unitPrice ?? item?.price ?? item?.rate ?? mrp);
      const netTotal = toNumber(item?.netTotal ?? item?.netAmount ?? item?.subtotal ?? item?.totalAmount ?? item?.total ?? 0);

      const rawGst =
        item?.gst ??
        item?.gstAmount ??
        item?.taxAmount ??
        item?.taxTotal ??
        item?.tax ??
        item?.taxValue ??
        null;

      const cgst = toNumber(item?.cgst ?? item?.cgstAmount ?? item?.cgstTotal ?? 0);
      const sgst = toNumber(item?.sgst ?? item?.sgstAmount ?? item?.sgstTotal ?? 0);
      const igst = toNumber(item?.igst ?? item?.igstAmount ?? item?.igstTotal ?? 0);
      const utgst = toNumber(item?.utgst ?? item?.utgstAmount ?? item?.utgstTotal ?? 0);
      const taxPercent = toNumber(
        item?.taxPercentage ?? item?.gstPercentage ?? item?.taxPercent ?? item?.gstPercent ?? item?.taxRate ?? 0
      );

      const gst = resolveGstAmount(rawGst, { cgst, sgst, igst, utgst }, taxPercent, netTotal);
      const resolvedTotalAmount = toNumber(item?.netRate ?? item?.totalAmount ?? item?.grossAmount ?? item?.total ?? 0);
      const totalAmount = resolvedTotalAmount || netTotal + gst;

      return {
        name: String(item?.itemName ?? item?.name ?? item?.displayName ?? "").trim() || "-",
        qty,
        mrp,
        sellingPrice,
        netTotal,
        gst,
        totalAmount,
      };
    });

    // Prefer invoice payload items when present (these typically contain per-line GST values).
    if (invoiceItems.length) {
      return invoiceItems;
    }

    // Fallback: derive GST per line by allocating the order-level tax amount.
    if (orderDetail?.items?.length) {
      const netTotals = orderDetail.items.map((item) => Number(item.total ?? 0) || 0);
      const allocatedGst = allocateProportionalAmounts(netTotals, Number(orderDetail.taxAmount ?? 0) || 0);

      return orderDetail.items.map((item, index) => {
        const qty = Number(item.quantity ?? 0) || 0;
        const rate = Number(item.rate ?? 0) || 0;
        const total = Number(item.total ?? 0) || 0;
        const gst = allocatedGst[index] ?? 0;
        return {
          name: String(item.name ?? "").trim() || "-",
          qty,
          mrp: rate,
          sellingPrice: rate,
          netTotal: total,
          gst,
          totalAmount: total + gst,
        };
      });
    }

    return [];
  }, [invoice?.raw, orderDetail?.items, orderDetail?.taxAmount]);

  useEffect(() => {
    if (!logsOpen) {
      return;
    }
    setLogsPage(1);
  }, [logsOpen, logsPageSize, invoiceUid]);

  const logFilters = useMemo(() => {
    return {
      from: (logsPage - 1) * logsPageSize,
      count: logsPageSize,
    };
  }, [logsPage, logsPageSize]);

  const auditLogsQuery = useOrdersInvoiceAuditLogs(invoiceUid || null, logFilters, { enabled: logsOpen });
  const auditLogsCountQuery = useOrdersInvoiceAuditLogsCount(invoiceUid || null, { enabled: logsOpen });
  const auditLogsTotal = (auditLogsCountQuery.data ?? 0) || 0;

  const auditRows = useMemo<InvoiceAuditLogRow[]>(() => {
    return mapInvoiceAuditLogs(auditLogsQuery.data);
  }, [auditLogsQuery.data]);

  const auditColumns = useMemo<ColumnDef<InvoiceAuditLogRow>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        render: (row) => <span className="whitespace-pre-line text-slate-700">{row.date}</span>,
      },
      { key: "action", header: "Action", render: (row) => <span className="text-slate-800">{row.action}</span> },
      { key: "type", header: "Type", render: (row) => <span className="text-slate-800">{row.type}</span> },
      {
        key: "description",
        header: "Description",
        render: (row) => <span className="text-slate-800">{row.description}</span>,
      },
      { key: "user", header: "User", render: (row) => <span className="text-slate-800">{row.user}</span> },
    ],
    []
  );

  const totals = useMemo(() => {
    const totalItems = lineItems.length || orderDetail?.items?.length || 0;
    const subtotal = orderDetail?.subtotal ?? lineItems.reduce((sum, item) => sum + item.netTotal, 0);
    const taxAmount = orderDetail?.taxAmount ?? lineItems.reduce((sum, item) => sum + item.gst, 0);
    const discountAmount = (orderDetail?.discountAmount ?? 0) + (orderDetail?.couponAmount ?? 0);
    const netTotalWithTax = subtotal + taxAmount;
    const netTotal = orderDetail?.netTotal ?? Math.max(0, netTotalWithTax - discountAmount);
    const amountPaid = orderDetail?.amountPaid ?? paymentQuery.data?.amount ?? 0;
    const amountDue = orderDetail?.amountDue ?? Math.max(0, netTotal - amountPaid);

    return {
      totalItems,
      subtotal,
      taxAmount,
      discountAmount,
      netTotalWithTax,
      netTotal,
      amountPaid,
      amountDue,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
    };
  }, [lineItems, orderDetail, paymentQuery.data?.amount]);

  const notes = useMemo(() => {
    const fromCustomer = String(orderDetail?.notesToCustomer ?? "").trim();
    const fromStaff = String(orderDetail?.notesFromStaff ?? "").trim();
    return [fromCustomer, fromStaff].filter(Boolean);
  }, [orderDetail?.notesFromStaff, orderDetail?.notesToCustomer]);

  function handlePrintInvoice() {
    if (typeof window === "undefined") return;
    try {
      window.print();
    } catch {
      // ignore
    }
  }

  function openShareDialog() {
    setShareError(null);
    setShareDialogOpen(true);
  }

  function closeShareDialog() {
    setShareDialogOpen(false);
    setShareError(null);
  }

  const shareDisabled = useMemo(() => {
    const hasPhone = phoneNumber.number.trim().length > 0;
    const hasWhatsApp = whatsAppNumber.number.trim().length > 0;
    const hasEmail = Boolean(emailId.trim()) && isValidEmail(emailId);
    return !(hasPhone || hasWhatsApp || hasEmail);
  }, [emailId, phoneNumber.number, whatsAppNumber.number]);

  async function submitShareInvoice() {
    if (typeof window === "undefined") return;

    if (shareDisabled) {
      setShareError("Enter at least one valid contact to share the invoice.");
      return;
    }

    setShareLoading(true);
    setShareError(null);

    try {
      const normalizedSmsNumber = normalizePhoneForSms(phoneNumber);
      const normalizedWhatsAppNumber = normalizePhoneForWhatsApp(whatsAppNumber);
      const normalizedEmailId = emailId.trim();

      if (normalizedSmsNumber) {
        await assertShareChannelQuota(api, "sms");
      }

      if (normalizedWhatsAppNumber) {
        await assertShareChannelQuota(api, "whatsApp");
      }

      const file = await generateInvoicePdfFile(invoiceExportRef.current, {
        invoiceNumber: invoice?.invoiceNumber ?? invoiceUid ?? "invoice",
      });
      if (!file) {
        setShareError("Unable to generate invoice PDF right now.");
        return;
      }

      const uploadedAttachment = await uploadInvoicePdfAttachment(api, String(account?.id ?? ""), file);
      if (!uploadedAttachment) {
        setShareError("Unable to upload invoice PDF right now.");
        return;
      }

      await shareInvoicePdfAttachment(api, invoiceUid, {
        attachment: uploadedAttachment,
        smsNumber: normalizedSmsNumber,
        smsCountryCode: String(phoneNumber.countryCode ?? "").trim() || undefined,
        whatsAppNumber: normalizedWhatsAppNumber,
        whatsAppCountryCode: String(whatsAppNumber.countryCode ?? "").trim() || undefined,
        emailId: normalizedEmailId || undefined,
      });

      closeShareDialog();
    } catch (error: any) {
      setShareError(typeof error?.message === "string" ? error.message : "Unable to share invoice right now.");
    } finally {
      setShareLoading(false);
    }
  }

  return (
    <SharedOrdersLayout
      title={invoiceTitle}
      subtitle=""
      backHref={backHref}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrintInvoice} disabled={!invoiceUid}>
            Print Invoice
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openShareDialog} disabled={!invoiceUid}>
            Share Invoice
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => setLogsOpen(true)} disabled={!invoiceUid}>
            Log
          </Button>
        </div>
      }
    >
      {invoiceUid ? (
        <SectionCard className="border-slate-200 shadow-sm" padding={false}>
          <div className="bg-white p-6" ref={invoiceExportRef}>
            {invoiceQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading invoice details...</div>
            ) : invoiceQuery.isError ? (
              <div className="text-sm text-slate-500">Invoice details unavailable.</div>
            ) : null}

            <div className="mx-auto max-w-[980px] border-2 border-slate-900 bg-white text-[13px] text-slate-900">
              <div className="border-b border-slate-900 py-3 text-center text-[20px] font-bold uppercase leading-none">
                Tax Invoice
              </div>

              <div className="grid grid-cols-[1.1fr_1fr] border-b border-slate-900">
                <div className="space-y-2 border-r border-slate-900 px-4 py-4">
                  <div className="text-[18px] font-bold">{outletDetails.name}</div>
                  {outletDetails.place ? <div className="text-[15px]">{outletDetails.place}</div> : null}
                  {outletDetails.email ? <div className="text-[15px]">{outletDetails.email}</div> : null}
                  {outletDetails.phone ? <div className="text-[15px]">Phone Number : {outletDetails.phone}</div> : null}
                </div>

                <div className="grid grid-cols-[1fr_auto] px-4 py-4">
                  <div className="space-y-1">
                    <div className="text-[15px] font-semibold">
                      Invoice No. <span className="text-blue-700">{invoice?.invoiceNumber ?? invoiceUid}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-semibold">Invoice Date</div>
                    <div className="text-[15px] font-semibold text-blue-700">{invoiceDateLabel || "-"}</div>
                  </div>

                  <div className="col-span-2 mt-6 space-y-1 text-[15px]">
                    <div className="font-semibold">{customerNameLabel}</div>
                    {customerIdLabel ? <div><span className="font-semibold">Id :</span> {customerIdLabel}</div> : null}
                    {gstNumberLabel ? <div>GSTIN / Unique ID: {gstNumberLabel}</div> : null}
                    <div>Business Name: {companyName}</div>
                  </div>
                </div>
              </div>

              <table className="min-w-full table-fixed border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-[6%] border-b border-r border-slate-900 px-2 py-2 text-left font-semibold">Sl No</th>
                    <th className="w-[25%] border-b border-r border-slate-900 px-2 py-2 text-left font-semibold">Item Name</th>
                    <th className="w-[6%] border-b border-r border-slate-900 px-2 py-2 text-center font-semibold">HSN</th>
                    <th className="w-[9%] border-b border-r border-slate-900 px-2 py-2 text-center font-semibold">Quantity</th>
                    <th className="w-[11%] border-b border-r border-slate-900 px-2 py-2 text-right font-semibold">S. Price({RUPEE_SYMBOL})</th>
                    <th className="w-[14%] border-b border-r border-slate-900 px-2 py-2 text-right font-semibold">Tax Amount({RUPEE_SYMBOL})</th>
                    <th className="w-[7%] border-b border-r border-slate-900 px-2 py-2 text-right font-semibold">Tax(%)</th>
                    <th className="w-[12%] border-b border-r border-slate-900 px-2 py-2 text-right font-semibold">Net Total({RUPEE_SYMBOL})</th>
                    <th className="w-[10%] border-b border-slate-900 px-2 py-2 text-right font-semibold">Amount({RUPEE_SYMBOL})</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length ? (
                    lineItems.map((item, index) => {
                      const taxPercent = resolveLineTaxPercent(item);
                      return (
                        <tr key={`${index}-${item.name}`}>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-center align-top">{index + 1}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 align-top">{item.name}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-center align-top">{resolveLineHsn(invoice?.raw, index)}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-center align-top">{item.qty}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-right align-top">{formatCurrencyNumber(item.sellingPrice)}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-right align-top">{formatCurrencyNumber(item.gst)}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-right align-top">{formatTaxPercent(taxPercent)}</td>
                          <td className="border-b border-r border-slate-900 px-2 py-2 text-right align-top">{formatCurrencyNumber(item.netTotal)}</td>
                          <td className="border-b border-slate-900 px-2 py-2 text-right align-top">{formatCurrencyNumber(item.totalAmount)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="border-b border-slate-900 px-2 py-8 text-center text-slate-500">
                        No line items available.
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td colSpan={5} className="border-b border-r border-slate-900 px-2 py-2" />
                    <td className="border-b border-r border-slate-900 px-2 py-2 text-right">{formatCurrencyNumber(totals.taxAmount)}</td>
                    <td className="border-b border-r border-slate-900 px-2 py-2" />
                    <td className="border-b border-r border-slate-900 px-2 py-2 text-right">{formatCurrencyNumber(totals.subtotal)}</td>
                    <td className="border-b border-slate-900 px-2 py-2 text-right font-semibold">{formatCurrencyNumber(totals.netTotal)}</td>
                  </tr>

                  <tr>
                    <td colSpan={9} className="border-b border-slate-900 px-2 py-10" />
                  </tr>

                  <tr>
                    <td colSpan={9} className="border-b border-slate-900 px-2 py-2 italic">
                      Amount (In Words) : <span className="font-semibold not-italic">{convertAmountToWords(totals.netTotal)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={9} className="border-b border-slate-900 px-2 py-2 italic">
                      less :
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-[1.4fr_0.95fr] border-b border-slate-900">
                <div className="min-h-[112px] border-r border-slate-900" />
                <div>
                  <div className="flex items-center justify-between border-b border-slate-900 px-2 py-2">
                    <span>OUTPUT CGST</span>
                    <span>{RUPEE_SYMBOL}{formatCurrencyNumber(totals.cgst)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-900 px-2 py-2">
                    <span>OUTPUT SGST</span>
                    <span>{RUPEE_SYMBOL}{formatCurrencyNumber(totals.sgst)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-900 px-2 py-2">
                    <span>Discount</span>
                    <span>(-) {RUPEE_SYMBOL}{formatCurrencyNumber(totals.discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-900 px-2 py-2 font-bold">
                    <span>Total</span>
                    <span>{RUPEE_SYMBOL}{formatCurrencyNumber(totals.netTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-2">
                    <span>Amount Paid</span>
                    <span>{RUPEE_SYMBOL}{formatCurrencyNumber(totals.amountPaid)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1.4fr_0.95fr]">
                <div className="border-r border-slate-900 px-2 py-3">
                  <div className="mb-2 text-[13px] underline">Declaration</div>
                  <div className="max-w-[420px] leading-6">
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </div>
                </div>
                <div className="flex min-h-[104px] flex-col justify-end px-4 py-3 text-right">
                  <div className="font-semibold">For, {outletDetails.name}</div>
                  <div>Authorised Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="p-6 text-sm text-slate-600">
            Invoice id was not provided. Return to the order details page and try again.
          </div>
        </SectionCard>
      )}

      <Dialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        title="Logs"
        description=""
        size="lg"
        contentClassName="w-[92vw] max-w-[980px] max-h-[82vh] overflow-hidden flex flex-col"
        bodyClassName="flex-1 overflow-y-auto"
      >
        <div className="space-y-4">
          <DataTable
            data={auditRows}
            columns={auditColumns}
            getRowId={(row) => row.uid}
            loading={auditLogsQuery.isLoading || auditLogsCountQuery.isLoading}
            pagination={{
              page: logsPage,
              pageSize: logsPageSize,
              total: auditLogsTotal || auditRows.length,
              onChange: setLogsPage,
              onPageSizeChange: setLogsPageSize,
              mode: "server",
            }}
            emptyState={
              <EmptyState
                title="No logs found"
                description="This invoice doesn't have any audit-log entries yet."
              />
            }
          />
        </div>
      </Dialog>

      <Dialog open={shareDialogOpen} onClose={closeShareDialog} title="Share Invoice" description="" size="md">
        <div className="space-y-4">
          {shareError ? <Alert variant="danger">{shareError}</Alert> : null}

          <PhoneInput
            label="Mobile Number"
            value={phoneNumber}
            onChange={(value) => {
              setPhoneNumber(value as SharePhoneValue);
              setShareError(null);
            }}
          />

          <PhoneInput
            label="WhatsApp Number"
            value={whatsAppNumber}
            onChange={(value) => {
              setWhatsAppNumber(value as SharePhoneValue);
              setShareError(null);
            }}
          />

          <Input
            label="Email"
            type="email"
            placeholder="user@xyz.com"
            value={emailId}
            error={!isValidEmail(emailId) ? "Please enter a valid email." : undefined}
            onChange={(event) => {
              setEmailId(event.target.value);
              setShareError(null);
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={closeShareDialog}>
            Cancel
          </Button>
          <Button onClick={submitShareInvoice} disabled={shareDisabled} loading={shareLoading}>
            Share
          </Button>
        </DialogFooter>
      </Dialog>
    </SharedOrdersLayout>
  );
}

function resolveOrderRecordId(returnTo: string) {
  const raw = String(returnTo ?? "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);
    const ordersIndex = segments.indexOf("orders");
    if (ordersIndex < 0) return null;

    const detailsIndex = segments.indexOf("details");
    if (detailsIndex < 0) return null;

    const recordId = segments[detailsIndex + 1] ?? "";
    return recordId ? decodeURIComponent(recordId) : null;
  } catch {
    return null;
  }
}

function resolveInvoiceBackHref(
  basePath: string,
  product: ProductKey,
  returnTo: string,
  from: string,
  orderRecordId?: string | null
) {
  const resolvedReturnTo = resolveInternalReturnToHref(returnTo);
  if (resolvedReturnTo) return resolvedReturnTo;

  const normalizedFrom = String(from ?? "").trim().toLowerCase();
  if (normalizedFrom === "invoices") {
    return buildOrdersModuleHref(basePath, product, "invoices");
  }

  if ((normalizedFrom === "details" || normalizedFrom === "order-details") && orderRecordId) {
    return buildOrdersDetailHref(basePath, orderRecordId, product);
  }

  return buildOrdersModuleHref(basePath, product, "overview");
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

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveGstAmount(
  direct: unknown,
  parts: { cgst: number; sgst: number; igst: number; utgst: number },
  taxPercent: number,
  netTotal: number
) {
  if (direct !== null && direct !== undefined && direct !== "") {
    return toNumber(direct);
  }

  const sumParts = (parts.cgst ?? 0) + (parts.sgst ?? 0) + (parts.igst ?? 0) + (parts.utgst ?? 0);
  if (sumParts > 0) {
    return sumParts;
  }

  if (taxPercent > 0 && netTotal > 0) {
    const value = (netTotal * taxPercent) / 100;
    return Math.round(value * 100) / 100;
  }

  return 0;
}

function mapInvoiceAuditLogs(raw: unknown): InvoiceAuditLogRow[] {
  const unwrapList = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  const titleCase = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (!text) return "-";

    return text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDateTime = (value: unknown) => {
    if (!value) return "-";

    const rawText = String(value).trim();
    if (!rawText) return "-";

    // If API already sends a display string like "Jan 22, 2026, 03:19 PM",
    // keep it but split date/time into 2 lines to match the UI.
    if (typeof value === "string" && /,\s*\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(rawText)) {
      const lastComma = rawText.lastIndexOf(",");
      if (lastComma > 0) {
        const left = rawText.slice(0, lastComma).trim();
        const right = rawText.slice(lastComma + 1).trim();
        if (left && right) {
          return `${left},\n${right}`;
        }
      }
      return rawText;
    }

    const tryDate = (() => {
      if (typeof value === "number") {
        const ms = value > 10_000_000_000 ? value : value * 1000;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
      }

      const numeric = Number(rawText);
      if (Number.isFinite(numeric) && rawText.length >= 10) {
        const ms = numeric > 10_000_000_000 ? numeric : numeric * 1000;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return d;
      }

      const d = new Date(rawText);
      return Number.isNaN(d.getTime()) ? null : d;
    })();

    if (!tryDate) {
      return rawText;
    }

    const date = tryDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const time = tryDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${date},\n${time}`;
  };

  return unwrapList(raw).map((item: any, index: number) => {
    const uid = String(item?.uid ?? item?.id ?? item?.auditUid ?? index);

    const date = formatDateTime(
      item?.dateTime ??
        item?.date ??
        item?.createdDate ??
        item?.createdOn ??
        item?.createdAt ??
        item?.actionDate ??
        item?.auditDate ??
        item?.timestamp ??
        item?.time
    );

    const action = titleCase(
      item?.auditLogAction ?? item?.action ?? item?.auditContext ?? item?.event ?? item?.operation ?? item?.auditType ?? "-"
    );
    const type = titleCase(item?.type ?? item?.objectType ?? item?.entityType ?? item?.module ?? "Order Invoice");
    const description = String(item?.description ?? item?.message ?? item?.auditMessage ?? "-").trim() || "-";
    const user = String(item?.user ?? item?.userName ?? item?.username ?? item?.createdBy ?? item?.userId ?? "-").trim() || "-";

    return { uid, date, action, type, description, user };
  });
}

function isValidEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePhoneForWhatsApp(value: SharePhoneValue) {
  const cc = String(value?.countryCode ?? "").replace(/\s+/g, "");
  const num = String(value?.number ?? "").replace(/\s+/g, "");
  const digits = `${cc}${num}`.replace(/[^\d+]/g, "").replace(/^\+/, "").trim();
  return digits || "";
}

function normalizePhoneForSms(value: SharePhoneValue) {
  const cc = String(value?.countryCode ?? "").replace(/\s+/g, "");
  const num = String(value?.number ?? "").replace(/\s+/g, "");
  const combined = `${cc}${num}`.replace(/[^\d+]/g, "").trim();
  return combined || "";
}

async function generateInvoicePdfFile(
  element: HTMLElement | null,
  meta: { invoiceNumber: string }
): Promise<File | null> {
  if (typeof window === "undefined" || !element) {
    return null;
  }

  // Lazy-load optional PDF libs. These need to be installed in the workspace:
  // `html2canvas` + `jspdf`.
  const [{ default: html2canvas }, { jsPDF }]: any = await Promise.all([import("html2canvas"), import("jspdf")]);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxWidth = "980px";
  clone.style.margin = "0 auto";
  clone.style.background = "#fff";
  clone.style.padding = "24px";

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "1024px";
  wrapper.style.background = "#fff";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#FFFFFF",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output("blob") as Blob;

    const invoiceNum = String(meta?.invoiceNumber ?? "invoice").replace(/[^\w.-]+/g, "_");
    const datePart = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${invoiceNum}_${datePart}.pdf`;
    return new File([blob], filename, { type: "application/pdf" });
  } finally {
    document.body.removeChild(wrapper);
  }
}

function triggerFileDownload(file: File) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(file);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}

type OrdersUploadTarget = {
  url: string;
  driveId: string;
  orderId?: number;
};

type OrdersSharedAttachment = {
  file: Record<string, never>;
  type: "invoice";
  fileName: string;
  fileType: string;
  fileSize: number;
  caption: string;
  driveId: string;
  action: "add";
  order: number;
  lastModified: number;
  ownerType: "Provider";
  owner: string | number;
};

async function uploadInvoicePdfAttachment(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  ownerId: string,
  file: File
): Promise<OrdersSharedAttachment | null> {
  const resolvedOwnerId = String(ownerId ?? "").trim();
  if (!resolvedOwnerId) {
    throw new Error("Provider account id is required to upload the invoice PDF.");
  }

  const uploadRequest = [
    {
      owner: resolvedOwnerId,
      ownerType: "Provider" as const,
      fileName: file.name,
      fileSize: file.size / (1024 * 1024),
      caption: "Invoice PDF",
      fileType: resolveUploadFileType(file),
      action: "add" as const,
      order: 0,
    },
  ];

  const response = await api.post<OrdersUploadTarget[]>("provider/fileShare/upload", uploadRequest);
  const target = Array.isArray(response?.data) ? response.data[0] : null;

  if (!target?.url || !target.driveId) {
    throw new Error("File upload target was not returned by the server.");
  }

  const uploadResponse = await fetch(target.url, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload invoice PDF right now.");
  }

  await api.put(`provider/fileShare/upload/COMPLETE/${target.driveId}`, null);

  return {
    file: {},
    type: "invoice",
    fileName: file.name,
    fileType: resolveUploadFileType(file),
    fileSize: file.size / (1024 * 1024),
    caption: "Invoice PDF",
    driveId: target.driveId,
    action: "add",
    order: typeof target.orderId === "number" ? target.orderId : 0,
    lastModified: file.lastModified,
    ownerType: "Provider",
    owner: resolvedOwnerId,
  };
}

async function assertShareChannelQuota(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  channel: "sms" | "whatsApp"
) {
  const path =
    channel === "sms"
      ? "provider/account/settings/smsCount"
      : "provider/account/settings/whatsAppCount";

  try {
    const response = await api.get<any>(path);
    const remaining = readShareChannelCount(response?.data);
    if (remaining !== null && remaining <= 0) {
      throw new Error(channel === "sms" ? "SMS credits are not available." : "WhatsApp credits are not available.");
    }
  } catch (error) {
    if (error instanceof Error && /credits are not available/i.test(error.message)) {
      throw error;
    }
    // Allow the share endpoint to enforce final validation if this pre-flight check
    // is unavailable or its response shape is different in a given environment.
  }
}

function readShareChannelCount(payload: unknown): number | null {
  const candidates = [
    payload,
    (payload as any)?.data,
    (payload as any)?.count,
    (payload as any)?.remaining,
    (payload as any)?.available,
    (payload as any)?.smsCount,
    (payload as any)?.whatsAppCount,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

async function shareInvoicePdfAttachment(
  api: ReturnType<typeof useSharedModulesContext>["api"],
  invoiceUid: string,
  options: {
    attachment: OrdersSharedAttachment;
    smsNumber?: string;
    smsCountryCode?: string;
    whatsAppNumber?: string;
    whatsAppCountryCode?: string;
    emailId?: string;
  }
) {
  const resolvedInvoiceUid = String(invoiceUid ?? "").trim();
  if (!resolvedInvoiceUid) {
    throw new Error("Invoice id is required to share the invoice.");
  }

  const payload = {
    uuid: resolvedInvoiceUid,
    phNo: options.smsNumber || null,
    email: options.emailId || null,
    countryCode: options.smsCountryCode || null,
    emailNotification: String(Boolean(options.emailId)),
    smsNotification: String(Boolean(options.smsNumber)),
    whatsappNotification: String(Boolean(options.whatsAppNumber)),
    whatsappPhNo: options.whatsAppNumber || null,
    whatsappCountryCode: options.whatsAppCountryCode || null,
    invoiceAttachments: [{ ...options.attachment, order: 1 }],
  };

  await api.put(`provider/so/invoice/${encodeURIComponent(resolvedInvoiceUid)}/sharePdfAttachment`, payload);
}

function resolveUploadFileType(file: File) {
  if (file.type.includes("/")) {
    return file.type.split("/")[1];
  }

  const segments = file.name.split(".");
  return segments.length > 1 ? segments.pop() ?? "file" : "file";
}

function formatCurrencyNumber(value: number) {
  const resolved = Number.isFinite(value) ? value : 0;
  return resolved.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTaxPercent(value: number) {
  const resolved = Number.isFinite(value) ? value : 0;
  return Number.isInteger(resolved) ? String(resolved) : resolved.toFixed(2);
}

function resolveLineTaxPercent(item: InvoiceLineItem) {
  if (!item.netTotal || !item.gst) return 0;
  return (item.gst / item.netTotal) * 100;
}

function resolveLineHsn(invoiceRaw: unknown, index: number) {
  const payload: any = invoiceRaw as any;
  const candidates =
    (Array.isArray(payload?.invoiceItems) ? payload.invoiceItems : null) ||
    (Array.isArray(payload?.items) ? payload.items : null) ||
    (Array.isArray(payload?.itemList) ? payload.itemList : null) ||
    (Array.isArray(payload?.lines) ? payload.lines : null) ||
    [];

  const item = candidates[index];
  const hsn = String(item?.hsnCode ?? item?.hsn ?? item?.hsnNumber ?? item?.code ?? "-").trim();
  return hsn || "-";
}

function convertAmountToWords(value: number) {
  const rounded = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100);
  const integerWords = convertIntegerToIndianWords(integerPart);
  const decimalWords = decimalPart > 0 ? ` and ${convertIntegerToIndianWords(decimalPart)} Paise` : "";
  return `${integerWords}${decimalWords} only`;
}

function convertIntegerToIndianWords(value: number): string {
  if (value === 0) return "Zero Rupees";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (num: number) => {
    if (num < 20) return ones[num];
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return [tens[ten], ones[one]].filter(Boolean).join(" ");
  };

  const threeDigits = (num: number) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    const head = hundred ? `${ones[hundred]} Hundred` : "";
    const tail = rest ? twoDigits(rest) : "";
    return [head, tail].filter(Boolean).join(" ");
  };

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const remainder = value % 1000;

  const parts = [
    crore ? `${twoDigits(crore)} Crore` : "",
    lakh ? `${twoDigits(lakh)} Lakh` : "",
    thousand ? `${twoDigits(thousand)} Thousand` : "",
    remainder ? threeDigits(remainder) : "",
  ].filter(Boolean);

  return `${parts.join(" ")} Rupees`;
}

function allocateProportionalAmounts(lineValues: number[], total: number) {
  const safeLineValues = lineValues.map((value) => (Number.isFinite(value) ? value : 0));
  const safeTotal = Number.isFinite(total) ? total : 0;
  const sum = safeLineValues.reduce((acc, value) => acc + value, 0);

  if (safeTotal === 0 || sum === 0 || safeLineValues.length === 0) {
    return safeLineValues.map(() => 0);
  }

  const round2 = (value: number) => Math.round(value * 100) / 100;
  const provisional = safeLineValues.map((value) => round2((value / sum) * safeTotal));
  const provisionalSum = provisional.reduce((acc, value) => acc + value, 0);
  const delta = round2(safeTotal - provisionalSum);

  if (delta !== 0) {
    const lastIndex = provisional.length - 1;
    provisional[lastIndex] = round2(provisional[lastIndex] + delta);
  }

  return provisional;
}

function readOutletDetails(
  invoiceRaw: unknown,
  account: { name?: string } | null | undefined,
  location: { name?: string } | null | undefined,
  orderDetail: { businessName?: string; store?: string } | null | undefined
) {
  const payload = (invoiceRaw && typeof invoiceRaw === "object" ? (invoiceRaw as any) : null) ?? null;

  const storeDetails =
    payload?.store?.details ??
    payload?.storeDetails ??
    payload?.store_details ??
    payload?.store?.storeDetails ??
    payload?.storeDto?.details ??
    payload?.storeDTO?.details ??
    null;

  const storeName = String(
    storeDetails?.name ??
      storeDetails?.storeName ??
      payload?.storeName ??
      payload?.store?.name ??
      payload?.outletName ??
      orderDetail?.store ??
      ""
  ).trim();

  const name = (storeName || String(account?.name ?? payload?.departmentName ?? payload?.branchName ?? "").trim() || "Business").trim();

  const place =
    String(
      storeDetails?.locationName ??
        storeDetails?.place ??
        storeDetails?.location?.place ??
        storeDetails?.location?.name ??
        payload?.place ??
        payload?.locationName ??
        payload?.branchName ??
        payload?.location?.name ??
        location?.name ??
        ""
    ).trim() || "";

  const phone =
    String(
      formatStorePhones(storeDetails?.phoneNumbers ?? storeDetails?.phones ?? storeDetails?.phoneNumberList) ??
      payload?.storePhone ??
        payload?.store?.phone ??
        payload?.store?.phoneNo ??
      payload?.businessPhone ??
        payload?.phone ??
        payload?.phoneNo ??
        payload?.contactNumber ??
        payload?.contactNo ??
        payload?.business?.phone ??
        payload?.business?.phoneNo ??
        payload?.provider?.phone ??
        ""
    ).trim() || "";

  const email =
    String(
      formatStoreEmails(storeDetails?.emails ?? storeDetails?.emailList) ??
      payload?.storeEmail ??
        payload?.store?.email ??
        payload?.store?.emailId ??
      payload?.businessEmail ??
        payload?.email ??
        payload?.emailId ??
        payload?.business?.email ??
        payload?.business?.emailId ??
        payload?.provider?.email ??
        ""
    ).trim() || "";

  return { name, place, phone, email };
}

function formatStorePhones(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const formatted = value
    .map((entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry.trim();

      const rawCc = String((entry as any).countryCode ?? (entry as any).cc ?? "").trim();
      const rawNum = String((entry as any).number ?? (entry as any).phoneNumber ?? (entry as any).instance ?? "").trim();
      if (!rawCc && !rawNum) return "";

      const cc = rawCc ? (rawCc.startsWith("+") ? rawCc : `+${rawCc}`) : "";
      return [cc, rawNum].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);

  return formatted.length ? formatted.join(", ") : null;
}

function formatStoreEmails(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const formatted = value
    .map((entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry.trim();
      return String((entry as any).instance ?? (entry as any).email ?? (entry as any).emailId ?? "").trim();
    })
    .filter(Boolean);

  return formatted.length ? formatted.join(", ") : null;
}

function readCompanyName(
  invoiceRaw: unknown,
  account: { name?: string } | null | undefined,
  orderDetail: { businessName?: string } | null | undefined
) {
  const payload = (invoiceRaw && typeof invoiceRaw === "object" ? (invoiceRaw as any) : null) ?? null;
  const name = String(payload?.businessName ?? payload?.business?.name ?? payload?.provider?.businessName ?? orderDetail?.businessName ?? account?.name ?? "")
    .trim();
  return name || "Business";
}
