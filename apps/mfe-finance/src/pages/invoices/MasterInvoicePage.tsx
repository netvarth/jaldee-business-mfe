import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Dialog, DialogFooter, EmptyState, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { formatCurrency, getStatusVariant } from "../../lib/financeData";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { PageShell } from "../../components/FinancePageLayout";
import MasterInvoiceDialogs from "./MasterInvoiceDialogs";

function MasterInvoicePage() {
  const { uid = "" } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [paymentAction, setPaymentAction] = useState<"" | "paylink" | "paycash" | "payothers">("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareMobile, setShareMobile] = useState("");
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");
  const [paymentEntries, setPaymentEntries] = useState<any[]>([]);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaymentMode, setEditPaymentMode] = useState("Cash");
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [editPaymentTransactionId, setEditPaymentTransactionId] = useState("");
  const [editPaymentError, setEditPaymentError] = useState("");
  const [editPaymentSubmitting, setEditPaymentSubmitting] = useState(false);

  function normalizePaymentEntries(payload: any) {
    const rawEntries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.payments)
            ? payload.payments
            : [];

    return rawEntries.map((item: any, index: number) => {
      const amount = Number(
        item?.amount
        ?? item?.paymentAmount
        ?? item?.receivedAmount
        ?? item?.paidAmount
        ?? 0
      );
      const paymentDateValue = item?.paymentDate ?? item?.paymentOn ?? item?.createdAt ?? item?.updatedAt ?? "";
      const parsedDate = paymentDateValue ? new Date(paymentDateValue) : null;
      const mode = String(item?.mode ?? item?.paymentMode ?? item?.acceptedBy ?? "-");
      const acceptedBy = String(item?.acceptedBy ?? "");
      const gateway = String(item?.gateway ?? item?.gatewayName ?? item?.paymentGateway ?? "Nil");
      const status = String(item?.gatewayStatus ?? item?.status ?? item?.paymentStatus ?? "SUCCESS");
      const note = String(item?.note ?? item?.paymentNote ?? item?.description ?? "");
      const transactionId = String(item?.transactionId ?? item?.paymentRefId ?? item?.referenceNo ?? "");

      return {
        uid: String(item?.uid ?? item?.id ?? item?.paymentUid ?? `payment-${index}`),
        amount: Number.isFinite(amount) ? amount : 0,
        mode,
        acceptedBy,
        gateway,
        status,
        note,
        transactionId,
        paymentDateRaw: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "",
        paymentDateLabel: parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "-",
        paymentTimeLabel: parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
          : "",
      };
    });
  }

  async function loadInvoiceDetail(invoiceUid: string) {
    const res = await financeApi.invoices.detailGeneral<any>(invoiceUid);
    if (!res.data) {
      return null;
    }

    const detailList = Array.isArray(res.data.detailList) ? res.data.detailList : [];
    return {
      uid: String(res.data.uid || invoiceUid),
      id: String(res.data.uid || res.data.invoiceNum || res.data.invoiceId || invoiceUid),
      invoiceNum: String(res.data.invoiceNum || res.data.invoiceId || invoiceUid),
      customer: String(res.data.consumerName || res.data.customerName || res.data.invoiceFor || res.data.userName || "Unknown"),
      category: String(res.data.categoryName || res.data.invoiceCategoryName || "General"),
      amount: Number(res.data.netTotal || res.data.totalAmount || res.data.amountDue || 0),
      dueDate: res.data.dueDate ? new Date(res.data.dueDate).toLocaleDateString() : "-",
      status: String(res.data.invoiceStatus || res.data.invoicePaymentStatus || res.data.billStatus || res.data.status || "Pending"),
      location: String(res.data.locationName || res.data.location || res.data.locationPlace || "-"),
      referenceNo: String(res.data.referenceNo || res.data.bookingReference || "-"),
      patientId: String(res.data.consumerId || res.data.patientId || "-"),
      invoiceDate: res.data.invoiceDate ? new Date(res.data.invoiceDate).toLocaleDateString() : "-",
      createdOn: res.data.createdDate || res.data.createdAt
        ? new Date(res.data.createdDate || res.data.createdAt).toLocaleString()
        : "-",
      createdBy: String(res.data.createdByName || res.data.createdBy || res.data.providerName || "-"),
      product: String(res.data.product || res.data.productName || "BOOKING"),
      consumerPhone: String(res.data.consumerPhone || ""),
      consumerEmail: String(res.data.consumerEmail || ""),
      paymentLink: String(res.data.paymentLink || ""),
      billedToAddress: String(res.data.billedToAddress || res.data.consumerGstAddress || "-"),
      notesForCustomer: String(res.data.notesForCustomer || res.data.description || ""),
      notesForProvider: String(res.data.notesForProvider || ""),
      reasonForCancel: String(res.data.reasonForCancel || res.data.billStatusNote || ""),
      netTotal: Number(res.data.netTotal || res.data.totalAmount || 0),
      totalAmount: Number(res.data.totalAmount || res.data.netTotal || 0),
      amountDue: Number(res.data.amountDue || res.data.netTotal || 0),
      totalTax: Number(res.data.totalTax || 0),
      totalDiscount: Number(res.data.totalDiscount || 0),
      detailList: detailList.map((item: any, index: number) => {
        const qty = Number(item.quantity || 1);
        const rate = Number(item.price || item.netRate || 0);
        const totalRate = Number(item.netTotal || rate * qty);
        const afterDiscount = Number(item.netTotalAfterDiscount || totalRate);
        const tax = Number(item.taxAmount || item.totalTax || 0);
        const total = Number(item.total || afterDiscount + tax);
        const appliedDiscount =
          item.discount ??
          item.appliedDiscount ??
          item.discountDetail ??
          item.discountDto ??
          item.discounts?.[0] ??
          item.discountList?.[0];
        return {
          id: String(item.uid || item.itemUid || `invoice-line-${index}`),
          itemName: String(item.itemName || item.name || "Procedure/Item"),
          processedDate: item.processedDate ? new Date(item.processedDate).toLocaleDateString("en-GB") : "-",
          quantity: qty,
          rate,
          totalRate,
          discount: Number(
            item.discountAmount ??
            item.discountTotal ??
            appliedDiscount?.discountAmount ??
            appliedDiscount?.discountedAmount ??
            appliedDiscount?.discountValue ??
            0,
          ),
          afterDiscount,
          tax,
          total,
        };
      }),
    };
  }

  useEffect(() => {
    let active = true;
    async function fetchDetail() {
      try {
        const detail = await loadInvoiceDetail(uid);
        if (active) {
          setInvoice(detail);
        }
      } catch (err) {
        console.error("Failed to load invoice detail", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    if (uid) fetchDetail();
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    if (!invoice) {
      return;
    }
    setPaymentAmount(String(invoice.amountDue || ""));
    setShareEmail(String(invoice.consumerEmail || ""));
    setShareMobile(String(invoice.consumerPhone || ""));
  }, [invoice]);

  async function handleInvoiceStatusUpdate(nextStatus: "Settled" | "Cancel") {
    if (!invoice?.uid || statusUpdating) {
      return;
    }

    let payload: Record<string, unknown> = {};

    if (nextStatus === "Cancel") {
      const reason = window.prompt("Enter the reason for cancelling this invoice:", invoice.reasonForCancel || "");
      if (reason === null) {
        return;
      }
      if (!reason.trim()) {
        setStatusError("Cancellation reason is required.");
        return;
      }
      payload = {
        reasonForCancel: reason.trim(),
      };
    }

    const confirmMessage =
      nextStatus === "Settled"
        ? `Settle invoice #${invoice.invoiceNum}?`
        : `Cancel invoice #${invoice.invoiceNum}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setStatusError("");
    setStatusUpdating(true);
    try {
      await financeApi.invoices.updateInvoiceStatus(invoice.uid, nextStatus, payload);
      const detail = await loadInvoiceDetail(invoice.uid);
      setInvoice(detail);
    } catch (error) {
      console.error("Failed to update invoice status", error);
      setStatusError(error instanceof Error ? error.message : "Could not update invoice status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  function closePaymentDialog() {
    setPaymentDialogOpen(false);
    setPaymentAction("");
    setPaymentError("");
    setPaymentNote("");
    setPaymentDate("");
    setPaymentMode("UPI");
    setPaymentTransactionId("");
    setPaymentAmount(String(invoice?.amountDue || ""));
  }

  async function loadPaymentEntries(openDialog = false) {
    if (!invoice?.uid) {
      return;
    }

    if (openDialog) {
      setPaymentHistoryOpen(true);
    }
    setPaymentHistoryLoading(true);
    setPaymentHistoryError("");
    try {
      const response = await financeApi.invoices.paymentByInvoice<any>(invoice.uid);
      setPaymentEntries(normalizePaymentEntries(response.data));
    } catch (error) {
      console.error("Failed to load invoice payment history", error);
      setPaymentHistoryError(error instanceof Error ? error.message : "Could not load paid entries.");
    } finally {
      setPaymentHistoryLoading(false);
    }
  }

  function openEditPaymentDialog(entry: any) {
    setEditingPayment(entry);
    setEditPaymentError("");
    setEditPaymentAmount(String(entry.amount || ""));
    setEditPaymentDate(entry.paymentDateRaw ? entry.paymentDateRaw.slice(0, 10) : "");
    setEditPaymentMode(entry.mode || "Cash");
    setEditPaymentNote(entry.note || "");
    setEditPaymentTransactionId(entry.transactionId || "");
  }

  function closeEditPaymentDialog() {
    setEditingPayment(null);
    setEditPaymentError("");
    setEditPaymentSubmitting(false);
    setEditPaymentAmount("");
    setEditPaymentDate("");
    setEditPaymentMode("Cash");
    setEditPaymentNote("");
    setEditPaymentTransactionId("");
  }

  async function submitEditedPayment() {
    if (!invoice?.uid || !editingPayment?.uid) {
      return;
    }

    const parsedAmount = Number(editPaymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditPaymentError("Payment amount must be greater than zero.");
      return;
    }

    setEditPaymentError("");
    setEditPaymentSubmitting(true);

    try {
      const normalizedPaymentDate = editPaymentDate
        ? new Date(`${editPaymentDate}T00:00:00`).toISOString()
        : editingPayment.paymentDateRaw || new Date().toISOString();
      const isCashMode = String(editPaymentMode).toLowerCase() === "cash";
      const trimmedTransactionId = editPaymentTransactionId.trim();

      await financeApi.invoices.updateOfflinePayment(editingPayment.uid, {
        amount: parsedAmount,
        mode: editPaymentMode,
        paymentDate: normalizedPaymentDate,
        note: editPaymentNote.trim() || undefined,
        acceptedBy: isCashMode ? "CASH" : "Other",
        paymentForUid: invoice.uid,
        transactionId: isCashMode ? undefined : trimmedTransactionId || undefined,
        isUpdate: true,
      });

      await loadPaymentEntries(false);
      const detail = await loadInvoiceDetail(invoice.uid);
      setInvoice(detail);
      closeEditPaymentDialog();
    } catch (error) {
      console.error("Failed to update invoice payment entry", error);
      setEditPaymentError(error instanceof Error ? error.message : "Could not update paid entry.");
    } finally {
      setEditPaymentSubmitting(false);
    }
  }

  function handlePrintInvoice() {
    const invoiceContent = document.getElementById("finance-invoice-print");
    if (!invoiceContent) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) {
      window.print();
      return;
    }

    const invoiceTitle = `Invoice-${invoice.invoiceNum}`;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${invoiceTitle}</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, sans-serif;
            }
            * {
              box-sizing: border-box;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 12px 16px;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
              vertical-align: top;
            }
            th.text-right, td.text-right {
              text-align: right;
            }
            .rounded-xl, .rounded-lg {
              border-radius: 0;
            }
            .shadow-sm, .shadow, .drop-shadow, .border-slate-200 {
              box-shadow: none !important;
            }
            .bg-slate-50, .bg-slate-100, .bg-slate-100\\/70 {
              background: #ffffff !important;
            }
            button {
              display: none !important;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${invoiceContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  async function submitPaymentAction() {
    if (!invoice?.uid || !paymentAction) {
      return;
    }

    setPaymentError("");
    setPaymentSubmitting(true);
    try {
      if (paymentAction === "paylink") {
        const trimmedEmail = shareEmail.trim();
        const trimmedMobile = shareMobile.trim();
        const mobileNumber = trimmedMobile.replace(/^\+/, "");
        await financeApi.invoices.sharePaymentLink(invoice.uid, {
          sendEmail: Boolean(trimmedEmail),
          emails: trimmedEmail ? [trimmedEmail] : [],
          sendSms: Boolean(mobileNumber),
          phoneNumbers: mobileNumber
            ? [
              {
                countryCode: "91",
                number: mobileNumber,
              },
            ]
            : [],
          sendWhatsapp: Boolean(mobileNumber),
          whatsappNumbers: mobileNumber
            ? [
              {
                countryCode: "91",
                number: mobileNumber,
              },
            ]
            : [],
          html: "",
          driveId: 0,
        });
      } else {
        const parsedAmount = Number(paymentAmount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          setPaymentError("Payment amount must be greater than zero.");
          setPaymentSubmitting(false);
          return;
        }

        const trimmedTransactionId = paymentTransactionId.trim();
        const normalizedPaymentDate = paymentDate
          ? new Date(`${paymentDate}T00:00:00`).toISOString()
          : new Date().toISOString();

        await financeApi.invoices.createOfflinePayment({
          amount: parsedAmount,
          mode: paymentAction === "paycash" ? "Cash" : paymentMode,
          paymentDate: normalizedPaymentDate,
          note: paymentNote.trim() || undefined,
          acceptedBy: paymentAction === "paycash" ? "CASH" : "Other",
          paymentForUid: invoice.uid,
          transactionId: trimmedTransactionId || undefined,
          isUpdate: false,
        });
      }

      const detail = await loadInvoiceDetail(invoice.uid);
      setInvoice(detail);
      await loadPaymentEntries(false);
      closePaymentDialog();
    } catch (error) {
      console.error("Failed to process invoice payment action", error);
      setPaymentError(error instanceof Error ? error.message : "Could not process payment action.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Master Invoice" subtitle="Loading invoice detail...">
        <div className="p-8 text-center text-slate-500">Loading...</div>
      </PageShell>
    );
  }

  if (!invoice) {
    return (
      <PageShell
        title="Master Invoice"
        subtitle="Invoice detail shell aligned with the legacy finance route structure."
      >
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="No invoice found"
            description="This invoice is not available in the current finance dataset."
          />
        </SectionCard>
      </PageShell>
    );
  }

  const normalizedInvoiceStatus = String(invoice.status || "").toLowerCase();
  const isInvoiceSettled = normalizedInvoiceStatus.includes("settled") || normalizedInvoiceStatus.includes("paid");
  const isInvoiceCancelled = normalizedInvoiceStatus.includes("cancel");
  const amountPaid = Math.max(Number(invoice.netTotal || invoice.totalAmount || 0) - Number(invoice.amountDue || 0), 0);
  const canShowGetPayment =
    !isInvoiceSettled &&
    !isInvoiceCancelled &&
    Number(invoice.amountDue || 0) > 0;
  const invoiceBadgeVariant =
    isInvoiceSettled
      ? "success"
      : isInvoiceCancelled
        ? "danger"
        : getStatusVariant(invoice.status);

  return (
    <div className="min-h-screen bg-slate-100/70 py-4">
      <div className="mx-auto flex max-w-[1840px] flex-col gap-4">
        <button
          type="button"
          onClick={() => navigate("/invoice")}
          className="w-fit px-2 text-lg font-medium text-slate-800"
        >
          ← Back
        </button>

        <SectionCard className="border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[20px] font-semibold text-slate-800">Invoice :#{invoice.invoiceNum}</div>
                <div className="mt-1 text-sm text-slate-500">
                  <Badge variant={invoiceBadgeVariant}>{invoice.status}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()}>Share PDF</Button>
                <Button variant="outline" onClick={handlePrintInvoice}>Print</Button>
                <Button variant="outline" onClick={() => navigate(`/invoice/edit/${uid}`)}>Edit</Button>
                <Button variant="outline" disabled>Log</Button>
              </div>
            </div>

            <div id="finance-invoice-print" className="rounded-xl border border-slate-200 bg-white p-4 lg:p-6">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="pb-2 text-[18px] font-semibold text-slate-800">Oasis Hospital's</div>
                  <div>{invoice.billedToAddress}</div>
                  <div><span className="font-semibold text-slate-700">{invoice.location}</span></div>
                  <div>Invoice To : <span className="font-semibold text-slate-700">{invoice.customer}</span></div>
                </div>

                <div className="space-y-1 text-sm text-slate-600 lg:justify-self-end">
                  <div className="pb-2 text-right text-[18px] font-semibold text-slate-800">Invoice : #{invoice.invoiceNum}</div>
                  {/* <div className="flex justify-between gap-6"><span>Booking Reference :</span><span className="font-semibold text-slate-700">{invoice.referenceNo}</span></div> */}
                  {/* <div className="flex justify-between gap-6"><span>Patient Id :</span><span className="font-semibold text-slate-700">{invoice.patientId}</span></div> */}
                  {/* <div className="flex justify-between gap-6"><span>Created On :</span><span className="font-semibold text-slate-700">{invoice.createdOn}</span></div> */}
                  <div className="pb-2 text-right text-[18px] font-semibold text-slate-800"><span>Invoice Date :</span><span className="font-semibold text-slate-700">{invoice.invoiceDate}</span></div>
                  {/* <div className="flex justify-between gap-6"><span>Created By :</span><span className="font-semibold text-slate-700">{invoice.createdBy}</span></div> */}
                  <div className="pb-2 text-right text-[18px] font-semibold text-slate-800"><span>Category :</span><span className="font-semibold text-slate-700">{invoice.category}</span></div>
                  {/* <div className="flex justify-between gap-6"><span>Product :</span><span className="font-semibold text-slate-700">{invoice.product}</span></div> */}
                </div>
              </div>

              <div className="mt-8 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                      <th className="px-4 py-3 font-semibold">Procedure/Item</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Rate</th>
                      <th className="px-4 py-3 font-semibold text-right">Qty</th>
                      <th className="px-4 py-3 font-semibold text-right">Total Rate</th>
                      <th className="px-4 py-3 font-semibold text-right">Discount</th>
                      <th className="px-4 py-3 font-semibold text-right">After Discount</th>
                      <th className="px-4 py-3 font-semibold text-right">Tax</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.detailList.length ? (
                      invoice.detailList.map((item: any) => (
                        <tr key={item.id} className="text-slate-700">
                          <td className="px-4 py-4 font-semibold text-slate-800">{item.itemName}</td>
                          <td className="px-4 py-4">{item.processedDate}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.rate)}</td>
                          <td className="px-4 py-4 text-right">{item.quantity}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.totalRate)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.discount)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.afterDiscount)}</td>
                          <td className="px-4 py-4 text-right">{formatCurrency(item.tax)}</td>
                          <td className="px-4 py-4 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No invoice items available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-md space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Total Amount :</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Net Total :</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.netTotal)}</span>
                  </div>
                  {amountPaid > 0 ? (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4"
                        onClick={() => void loadPaymentEntries(true)}
                      >
                        Amount Paid :
                      </button>
                      <button
                        type="button"
                        className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4"
                        onClick={() => void loadPaymentEntries(true)}
                      >
                        {formatCurrency(amountPaid)}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-slate-100 px-4 py-4">
                <div className="flex items-center justify-end gap-6 text-[18px] font-semibold text-slate-800">
                  <span>Amount Due</span>
                  <span>{formatCurrency(invoice.amountDue)}</span>
                </div>
              </div>

              {String(invoice.status).toLowerCase().includes("cancel") && invoice.reasonForCancel ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span className="font-semibold">Cancellation Reason:</span> {invoice.reasonForCancel}
                </div>
              ) : null}

              {statusError ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {statusError}
                </div>
              ) : null}

              {!isInvoiceSettled && !isInvoiceCancelled ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {canShowGetPayment ? (
                    <Popover
                      portal
                      placement="top"
                      align="start"
                      trigger={<Button>Get Payment</Button>}
                    >
                      <div className="grid min-w-[220px] p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            setPaymentAction("paylink");
                            setPaymentDialogOpen(true);
                            setPaymentError("");
                          }}
                        >
                          Share Payment Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            setPaymentAction("paycash");
                            setPaymentDialogOpen(true);
                            setPaymentError("");
                          }}
                        >
                          Pay by Cash
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start font-normal"
                          onClick={() => {
                            setPaymentAction("payothers");
                            setPaymentDialogOpen(true);
                            setPaymentError("");
                          }}
                        >
                          Pay by Others
                        </Button>
                      </div>
                    </Popover>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => void handleInvoiceStatusUpdate("Settled")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating..." : "Settle Invoice"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-rose-500"
                    onClick={() => void handleInvoiceStatusUpdate("Cancel")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating..." : "Cancel Invoice"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>

      <MasterInvoiceDialogs
        paymentDialogOpen={paymentDialogOpen}
        closePaymentDialog={closePaymentDialog}
        paymentAction={paymentAction}
        shareEmail={shareEmail}
        setShareEmail={setShareEmail}
        shareMobile={shareMobile}
        setShareMobile={setShareMobile}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        paymentTransactionId={paymentTransactionId}
        setPaymentTransactionId={setPaymentTransactionId}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        paymentError={paymentError}
        paymentSubmitting={paymentSubmitting}
        submitPaymentAction={submitPaymentAction}
        paymentHistoryOpen={paymentHistoryOpen}
        setPaymentHistoryOpen={setPaymentHistoryOpen}
        paymentHistoryError={paymentHistoryError}
        paymentHistoryLoading={paymentHistoryLoading}
        paymentEntries={paymentEntries}
        openEditPaymentDialog={openEditPaymentDialog}
        editingPayment={editingPayment}
        closeEditPaymentDialog={closeEditPaymentDialog}
        editPaymentAmount={editPaymentAmount}
        setEditPaymentAmount={setEditPaymentAmount}
        editPaymentMode={editPaymentMode}
        setEditPaymentMode={setEditPaymentMode}
        editPaymentDate={editPaymentDate}
        setEditPaymentDate={setEditPaymentDate}
        editPaymentTransactionId={editPaymentTransactionId}
        setEditPaymentTransactionId={setEditPaymentTransactionId}
        editPaymentNote={editPaymentNote}
        setEditPaymentNote={setEditPaymentNote}
        editPaymentError={editPaymentError}
        editPaymentSubmitting={editPaymentSubmitting}
        submitEditedPayment={submitEditedPayment}
      />
    </div>
  );
}

export default MasterInvoicePage;
