import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Badge, Button, Dialog, DialogFooter, EmptyState, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { formatCurrency, getStatusVariant } from "../../lib/financeData";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { PageShell } from "../../components/FinancePageLayout";
import MasterInvoiceDialogs from "./MasterInvoiceDialogs";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { generateInvoicePdfFile, shareInvoicePdfAttachment, triggerInvoicePdfPrint, uploadInvoicePdfAttachment } from "./invoicePdf";

function MasterInvoiceViewPage() {
  const { eventBus, account, user } = useMFEProps();
  const { uid = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Link Invoices Dialog State
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedToLink, setSelectedToLink] = useState<string[]>([]);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Unlink Invoice Dialog State
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [unlinkInvoiceUid, setUnlinkInvoiceUid] = useState<string | null>(null);
  const [unlinkSubmitting, setUnlinkSubmitting] = useState(false);
  const [unlinkError, setUnlinkError] = useState("");
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [sharePdfDialogOpen, setSharePdfDialogOpen] = useState(false);
  const [sharePdfSubmitting, setSharePdfSubmitting] = useState(false);
  const [sharePdfError, setSharePdfError] = useState("");
  const [invoicePdfBusy, setInvoicePdfBusy] = useState(false);

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

  function extractInvoiceRecords(payload: any) {
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data?.content)) return payload.data.content;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  async function loadInvoiceDetail(invoiceUid: string) {
    const res = await financeApi.invoices.detailGeneral<any>(invoiceUid);
    if (!res.data) {
      return null;
    }

    const detailList = Array.isArray(res.data.detailList) ? res.data.detailList : [];
    const appliedDiscounts = Array.isArray(res.data.discounts) ? res.data.discounts : [];
    const appliedCoupons = Array.isArray(res.data.coupons) ? res.data.coupons : [];
    const discountFallbackTotal = appliedDiscounts.reduce((sum: number, item: any) => (
      sum + Number(item?.discountedAmount ?? item?.discountValue ?? item?.amount ?? 0)
    ), 0);
    const couponFallbackTotal = appliedCoupons.reduce((sum: number, item: any) => (
      sum + Number(item?.discountedAmount ?? item?.discountValue ?? item?.amount ?? 0)
    ), 0);
    const linkedRaw = Array.isArray(res.data.linkedInvoices) ? res.data.linkedInvoices : [];

    // If the linked invoices only contain uid (references), we populate their full details
    let populatedLinked: any[] = [];
    if (linkedRaw.length > 0) {
      const needsFetch = linkedRaw.some((item: any) => !item.invoiceNum && !item.netTotal);
      if (needsFetch) {
        try {
          const promises = linkedRaw.map((item: any) =>
            financeApi.invoices.detailGeneral<any>(item.uid || item.id)
              .then((r) => r.data)
              .catch(() => null)
          );
          const results = await Promise.all(promises);
          populatedLinked = results.filter(Boolean);
        } catch (e) {
          console.error("Failed to populate linked invoices details", e);
          populatedLinked = linkedRaw;
        }
      } else {
        populatedLinked = linkedRaw;
      }
    }

    const mappedLinked = populatedLinked.map((item: any) => ({
      uid: String(item.uid || item.id || ""),
      invoiceNum: String(item.invoiceNum || item.invoiceId || item.id || ""),
      invoiceDate: item.invoiceDate
        ? new Date(item.invoiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : (item.createdDate ? new Date(item.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"),
      netTotal: Number(item.netTotal ?? item.totalAmount ?? item.amount ?? 0),
      amountDue: Number(item.amountDue ?? 0),
      status: String(item.status ?? item.invoiceStatus ?? "Pending"),
    }));

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
      consumerUid: String(res.data.consumerUid || res.data.consumerId || ""),
      invoiceDate: res.data.invoiceDate
        ? new Date(res.data.invoiceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : (res.data.createdDate ? new Date(res.data.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"),
      createdOn: res.data.createdDate || res.data.createdAt
        ? new Date(res.data.createdDate || res.data.createdAt).toLocaleString()
        : "-",
      createdBy: String(res.data.createdByName || res.data.createdBy || res.data.providerName || "-"),
      product: String(res.data.product || res.data.productName || "BOOKING"),
      accountId: String(res.data.accountId || res.data.providerAccountId || res.data.accountUid || ""),
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
      amountPaid: Number(res.data.amountPaid || 0),
      totalTax: Number(res.data.totalTax ?? res.data.taxTotal ?? 0),
      totalDiscount: Number(res.data.totalDiscount || res.data.discountTotal || discountFallbackTotal || 0),
      totalCoupon: Number(res.data.totalCoupon || res.data.couponTotal || res.data.sharedCouponTotal || couponFallbackTotal || 0),
      linkedInvoices: mappedLinked,
      detailList: detailList.map((item: any, index: number) => {
        const qty = Number(item.quantity || 1);
        const rate = Number(item.price || item.netRate || 0);
        const totalRate = Number(item.netTotal || rate * qty);
        const afterDiscount = Number(item.netTotalAfterDiscount || totalRate);
        const tax = Number(item.taxAmount ?? item.taxTotal ?? item.totalTax ?? 0);
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

  async function fetchDetail() {
    if (!uid) return;
    setLoading(true);
    try {
      const detail = await loadInvoiceDetail(uid);
      setInvoice(detail);
    } catch (err) {
      console.error("Failed to load invoice detail", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
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
      await fetchDetail();
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
      await fetchDetail();
      closeEditPaymentDialog();
    } catch (error) {
      console.error("Failed to update invoice payment entry", error);
      setEditPaymentError(error instanceof Error ? error.message : "Could not update paid entry.");
    } finally {
      setEditPaymentSubmitting(false);
    }
  }

  function closeSharePdfDialog() {
    if (sharePdfSubmitting) {
      return;
    }
    setSharePdfDialogOpen(false);
    setSharePdfError("");
  }

  async function handlePrintInvoice() {
    if (invoicePdfBusy) {
      return;
    }
    setInvoicePdfBusy(true);
    try {
      const invoiceContent = document.getElementById("finance-invoice-print");
      const pdfFile = await generateInvoicePdfFile(invoiceContent, { invoiceNumber: `invoice-${invoice?.invoiceNum || "invoice"}` });
      if (!pdfFile) {
        throw new Error("Could not generate invoice PDF.");
      }
      triggerInvoicePdfPrint(pdfFile);
    } catch (error) {
      console.error("Failed to print invoice PDF", error);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Print Invoice",
        message: error instanceof Error ? error.message : "Could not print invoice PDF.",
      });
    } finally {
      setInvoicePdfBusy(false);
    }
  }

  async function submitSharePdf() {
    if (!invoice?.uid || sharePdfSubmitting || invoicePdfBusy) {
      return;
    }

    setSharePdfError("");
    setSharePdfSubmitting(true);
    setInvoicePdfBusy(true);
    try {
      const invoiceContent = document.getElementById("finance-invoice-print");
      const pdfFile = await generateInvoicePdfFile(invoiceContent, { invoiceNumber: `invoice-${invoice?.invoiceNum || "invoice"}` });
      if (!pdfFile) {
        throw new Error("Could not generate invoice PDF.");
      }
      const attachment = await uploadInvoicePdfAttachment({
        tenantUid: String(account?.tenantUid || account?.id || invoice.accountId || invoice.uid),
        userId: String(user?.id || ""),
        userName: String(user?.name || "").trim() || undefined,
      }, pdfFile);
      await shareInvoicePdfAttachment(invoice.uid, attachment, {
        email: shareEmail,
        mobile: shareMobile,
        smsCountryCode: "91",
        whatsappCountryCode: "91",
      });
      setSharePdfDialogOpen(false);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Share Invoice PDF",
        message: "Invoice PDF shared successfully.",
      });
    } catch (error) {
      console.error("Failed to share invoice PDF", error);
      setSharePdfError(error instanceof Error ? error.message : "Could not share invoice PDF.");
    } finally {
      setSharePdfSubmitting(false);
      setInvoicePdfBusy(false);
    }
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

      await fetchDetail();
      await loadPaymentEntries(false);
      closePaymentDialog();
    } catch (error) {
      console.error("Failed to process invoice payment action", error);
      setPaymentError(error instanceof Error ? error.message : "Could not process payment action.");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  // Handle Link / Unlink Invoices
  async function openLinkInvoiceDialog() {
    const consumerUid = invoice?.consumerUid || invoice?.patientId;
    if (!consumerUid) return;

    setLinkDialogOpen(true);
    setLoadingAvailable(true);
    setLinkError("");
    setSelectedToLink([]);

    try {
      const res = await financeApi.invoices.listGeneral<any>({
        from: 0,
        count: 200,
        consumerUid,
      });
      const records = extractInvoiceRecords(res.data);
      
      const linkedUids = new Set((invoice.linkedInvoices || []).map((li: any) => li.uid));
      const filtered = records.filter((item: any) => {
        const itemUid = item.uid || item.detailUid || item.id;
        return (
          itemUid !== invoice.uid &&
          !linkedUids.has(itemUid) &&
          item.internalInvoiceType !== "MASTER_INVOICE"
        );
      });
      setAvailableInvoices(filtered);
    } catch (err) {
      console.error("Failed to load customer invoices for linking", err);
      setLinkError("Failed to load invoices.");
    } finally {
      setLoadingAvailable(false);
    }
  }

  async function handleLinkInvoicesSubmit() {
    if (selectedToLink.length === 0 || linkSubmitting) return;
    setLinkSubmitting(true);
    setLinkError("");
    try {
      await financeApi.invoices.linkInvoices(invoice.uid, selectedToLink.map((uid) => ({ uid })));
      await fetchDetail();
      setLinkDialogOpen(false);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Link Invoices",
        message: "Invoices linked successfully.",
      });
    } catch (err) {
      console.error("Failed to link invoices", err);
      setLinkError(err instanceof Error ? err.message : "Failed to link invoices.");
    } finally {
      setLinkSubmitting(false);
    }
  }

  async function submitUnlinkInvoice() {
    if (!unlinkInvoiceUid || unlinkSubmitting) return;
    setUnlinkSubmitting(true);
    setUnlinkError("");
    try {
      await financeApi.invoices.unlinkInvoices(invoice.uid, { uid: unlinkInvoiceUid });
      await fetchDetail();
      setUnlinkDialogOpen(false);
      setUnlinkInvoiceUid(null);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Unlink Invoice",
        message: "Invoice unlinked successfully.",
      });
    } catch (err) {
      console.error("Failed to unlink invoice", err);
      setUnlinkError(err instanceof Error ? err.message : "Failed to unlink invoice.");
    } finally {
      setUnlinkSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Invoice Details" subtitle="Loading invoice detail...">
        <div className="p-8 text-center text-slate-500">Loading...</div>
      </PageShell>
    );
  }

  if (!invoice) {
    return (
      <PageShell title="Invoice Details" subtitle="No invoice found">
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
  const amountPaid = Math.max(Number(invoice.amountPaid || 0), 0);
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

  // Extract GSTIN from billing address or fallback to default
  const matchGstin = String(invoice.billedToAddress || "").match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i);
  const displayGstin = matchGstin ? matchGstin[0].toUpperCase() : "32AAAAA0000A1ZS";

  const backHref = location.state?.from || "/invoice";

  return (
    <PageShell
      title="Invoice Details"
      subtitle=""
      back={{ label: "Back to Invoices", href: backHref }}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSharePdfDialogOpen(true)} disabled={sharePdfSubmitting || invoicePdfBusy}>Share PDF</Button>
          <Button variant="outline" onClick={() => void handlePrintInvoice()} disabled={invoicePdfBusy}>{invoicePdfBusy ? "Generating PDF..." : "Print"}</Button>
          <Button variant="outline" onClick={() => navigate(`/invoice/edit/${invoice.uid}`)}>Edit</Button>
        </div>
      }
    >
      <div id="finance-invoice-print" className="space-y-6">
        {/* Customer Profile & Info Card */}
        <div className="border border-slate-100 bg-white rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-800">{invoice.customer}</div>
              <div className="text-sm font-medium text-slate-500">Patient Id : {invoice.patientId}</div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-sm space-y-1.5 md:text-right">
            <div>
              <span className="font-semibold text-slate-400">Inv.Date :</span>{" "}
              <span className="font-bold text-slate-800">{invoice.invoiceDate}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400">Inv.No :</span>{" "}
              <span className="font-bold text-slate-800">{invoice.invoiceNum}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-400">GSTIN :</span>{" "}
              <span className="font-bold text-slate-800">{displayGstin}</span>
            </div>
          </div>
        </div>

        {/* Linked Invoices Section */}
        <div className="border border-slate-100 bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              Linked Invoices
            </div>
            <Button
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={openLinkInvoiceDialog}
            >
              + Link Invoice
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-400 font-bold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Invoice Amount (₹)</th>
                  <th className="px-4 py-3">Total Due Amount (₹)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoice.linkedInvoices && invoice.linkedInvoices.length > 0 ? (
                  invoice.linkedInvoices.map((li: any) => (
                    <tr key={li.uid} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4">{li.invoiceDate}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">#{li.invoiceNum}</td>
                      <td className="px-4 py-4">{formatCurrency(li.netTotal)}</td>
                      <td className="px-4 py-4">{formatCurrency(li.amountDue)}</td>
                      <td className="px-4 py-4 text-right">
                        <Popover
                          portal
                          placement="bottom"
                          align="end"
                          open={activePopoverId === li.uid}
                          onOpenChange={(isOpen) => setActivePopoverId(isOpen ? li.uid : null)}
                          trigger={
                            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                              </svg>
                            </button>
                          }
                        >
                          <div className="p-1 bg-white border border-slate-100 rounded-md shadow-lg min-w-[130px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-left justify-start font-medium text-rose-600 hover:bg-rose-50 border-none"
                              onClick={() => {
                                setActivePopoverId(null);
                                setUnlinkError("");
                                setUnlinkInvoiceUid(li.uid);
                                setUnlinkDialogOpen(true);
                              }}
                            >
                              Unlink Invoice
                            </Button>
                          </div>
                        </Popover>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No linked invoices.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Breakups Section */}
        <div className="border border-slate-100 bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-[#7c7575] text-white text-center py-3 font-bold text-base tracking-wide">
            Detailed Breakups
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-700 font-bold bg-slate-50/50">
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Quantity</th>
                  <th className="px-4 py-3.5">Rate(₹)</th>
                  <th className="px-4 py-3.5">Discount(₹)</th>
                  <th className="px-4 py-3.5">Tax(₹)</th>
                  <th className="px-4 py-3.5">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {invoice.detailList && invoice.detailList.length > 0 ? (
                  invoice.detailList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4 font-semibold text-slate-900">{item.itemName}</td>
                      <td className="px-4 py-4 text-slate-400">{item.processedDate}</td>
                      <td className="px-4 py-4 text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-4 text-slate-600">{formatCurrency(item.rate)}</td>
                      <td className="px-4 py-4 text-slate-600">{formatCurrency(item.discount)}</td>
                      <td className="px-4 py-4 text-slate-600">{formatCurrency(item.tax)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No procedure items or detail breakups available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Detailed Summary */}
          <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end">
            <div className="w-80 space-y-2.5 text-sm text-slate-600">
              <div className="flex items-center justify-between font-medium">
                <span>Total:</span>
                <span className="font-bold text-slate-900">₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span>Tax:</span>
                <span className="font-bold text-slate-900">₹{invoice.totalTax.toFixed(2)}</span>
              </div>
              {amountPaid > 0 ? (
                <div className="flex items-center justify-between font-medium">
                  <button
                    type="button"
                    className="font-medium text-slate-500 hover:text-slate-800 underline decoration-slate-300 underline-offset-4 transition text-left border-none bg-transparent p-0 cursor-pointer"
                    onClick={() => void loadPaymentEntries(true)}
                  >
                    Amount Paid:
                  </button>
                  <span className="font-bold text-slate-900">₹{amountPaid.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between font-medium pt-2 border-t border-slate-100">
                <span>Amount Due:</span>
                <span className="text-lg font-bold text-indigo-700">₹{invoice.amountDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Reason Notification */}
      {String(invoice.status).toLowerCase().includes("cancel") && invoice.reasonForCancel ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span className="font-bold">Cancellation Reason:</span> {invoice.reasonForCancel}
        </div>
      ) : null}

      {statusError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {statusError}
        </div>
      ) : null}

      {/* Footer Payment Actions */}
      {!isInvoiceSettled && !isInvoiceCancelled ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-slate-100 pt-5">
          {canShowGetPayment ? (
            <Popover
              portal
              placement="top"
              align="start"
              trigger={
                <Button className="w-full sm:w-auto bg-purple-950 text-white hover:bg-purple-900 flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-semibold border-none">
                  Get Payment
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </Button>
              }
            >
              <div className="grid min-w-[220px] p-1 bg-white border border-slate-100 rounded-md shadow-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal border-none"
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
                  className="justify-start font-normal border-none"
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
                  className="justify-start font-normal border-none"
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
            className="w-full sm:w-auto bg-[#1e3a8a] text-white hover:bg-[#172554] border-none font-semibold"
            onClick={() => void handleInvoiceStatusUpdate("Settled")}
            disabled={statusUpdating}
          >
            {statusUpdating ? "Updating..." : "Settle Invoice"}
          </Button>
          <Button
            className="w-full sm:w-auto bg-rose-100 text-rose-700 hover:bg-rose-200 border-none font-semibold"
            onClick={() => void handleInvoiceStatusUpdate("Cancel")}
            disabled={statusUpdating}
          >
            {statusUpdating ? "Updating..." : "Cancel Invoice"}
          </Button>
        </div>
      ) : null}

      {/* Link Invoices Dialog */}
      <Dialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        title="Link Invoices"
        size="lg"
      >
        <div className="space-y-4 pt-2">
          {linkError ? (
            <div className="rounded-[var(--radius-control)] bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {linkError}
            </div>
          ) : null}

          <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-lg">
            {loadingAvailable ? (
              <div className="p-8 text-center text-slate-500">Loading invoices...</div>
            ) : availableInvoices.length > 0 ? (
              <table className="w-full border-collapse text-sm text-slate-700">
                <thead className="bg-slate-50 text-left text-slate-600 font-bold sticky top-0">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 w-10">Select</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Invoice ID</th>
                    <th className="px-4 py-3">Invoice Amount (₹)</th>
                    <th className="px-4 py-3">Due Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableInvoices.map((inv: any) => {
                    const invUid = inv.uid || inv.detailUid || inv.id;
                    const isChecked = selectedToLink.includes(invUid);
                    return (
                      <tr key={invUid} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedToLink([...selectedToLink, invUid]);
                              } else {
                                setSelectedToLink(selectedToLink.filter((id) => id !== invUid));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : (inv.createdDate ? new Date(inv.createdDate).toLocaleDateString() : "-")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          #{inv.invoiceNum || inv.id}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(inv.netTotal ?? inv.totalAmount ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(inv.amountDue ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400">No other unlinked invoices found for this customer.</div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={linkSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none font-medium"
              onClick={() => void handleLinkInvoicesSubmit()}
              disabled={linkSubmitting || selectedToLink.length === 0}
            >
              {linkSubmitting ? "Linking..." : `Link Selected (${selectedToLink.length})`}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Unlink Invoice Dialog */}
      <Dialog
        open={unlinkDialogOpen}
        onClose={() => {
          if (!unlinkSubmitting) {
            setUnlinkDialogOpen(false);
            setUnlinkError("");
          }
        }}
        title="Unlink Invoice"
        size="md"
      >
        <div className="space-y-4 pt-2">
          {unlinkError ? (
            <div className="rounded-[var(--radius-control)] bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {unlinkError}
            </div>
          ) : null}

          <p className="text-slate-600 text-sm">
            Are you sure you want to unlink this invoice from the master invoice?
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUnlinkDialogOpen(false);
                setUnlinkError("");
              }}
              disabled={unlinkSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white border-none font-medium"
              onClick={() => void submitUnlinkInvoice()}
              disabled={unlinkSubmitting}
            >
              {unlinkSubmitting ? "Unlinking..." : "Unlink"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Reusable Payment/Adjustment Dialogs */}
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
        sharePdfDialogOpen={sharePdfDialogOpen}
        closeSharePdfDialog={closeSharePdfDialog}
        sharePdfError={sharePdfError}
        sharePdfSubmitting={sharePdfSubmitting}
        submitSharePdf={submitSharePdf}
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
    </PageShell>
  );
}

export default MasterInvoiceViewPage;
