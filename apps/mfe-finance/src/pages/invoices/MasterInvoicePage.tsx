import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Badge, Button, Dialog, DialogFooter, EmptyState, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { formatCurrency, getStatusVariant } from "../../lib/financeData";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { PageShell } from "../../components/FinancePageLayout";
import MasterInvoiceDialogs from "./MasterInvoiceDialogs";
import { generateInvoicePdfFile, shareInvoicePdfAttachment, triggerInvoicePdfPrint, uploadInvoicePdfAttachment } from "./invoicePdf";

function MasterInvoicePage() {
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
  const [sharePdfDialogOpen, setSharePdfDialogOpen] = useState(false);
  const [sharePdfSubmitting, setSharePdfSubmitting] = useState(false);
  const [sharePdfError, setSharePdfError] = useState("");
  const [invoicePdfBusy, setInvoicePdfBusy] = useState(false);
  const [auditLogEntries, setAuditLogEntries] = useState<any[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogError, setAuditLogError] = useState("");
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [auditLogPage, setAuditLogPage] = useState(0);
  const [auditLogPageSize, setAuditLogPageSize] = useState(10);
  const [auditLogTotal, setAuditLogTotal] = useState(0);

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

  function normalizeAuditEntries(payload: any) {
    const rawEntries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.data?.content)
          ? payload.data.content
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

    return rawEntries.map((item: any, index: number) => {
      const createdAtValue = item?.createdAt ?? item?.createdDate ?? item?.updatedAt ?? "";
      const parsedDate = createdAtValue ? new Date(createdAtValue) : null;
      const actor = String(
        item?.createdByName
        ?? item?.createdBy
        ?? item?.userName
        ?? item?.actorName
        ?? item?.actor
        ?? "System",
      );
      const action = String(
        item?.action
        ?? item?.auditAction
        ?? item?.eventName
        ?? item?.activityType
        ?? "Updated",
      );
      const description = String(
        item?.remarks
        ?? item?.description
        ?? item?.message
        ?? item?.details
        ?? "",
      ).trim();

      return {
        id: String(item?.uid ?? item?.id ?? `audit-log-${index}`),
        actor,
        action,
        description,
        type: String(item?.auditLogContext ?? item?.auditlogContext ?? item?.context ?? "Invoice"),
        timestampLabel: parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
          : "-",
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
      consumerUid: String(res.data.consumerUid || res.data.consumerId || ""),
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
      totalTax: Number(res.data.totalTax ?? res.data.taxTotal ?? 0),
      totalDiscount: Number(res.data.totalDiscount || 0),
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

  useEffect(() => {
    let active = true;

    async function loadAuditLogs() {
      if (!uid || !auditLogDialogOpen) {
        return;
      }

      setAuditLogLoading(true);
      setAuditLogError("");
      try {
        const response = await financeApi.activity.list<any>({
          filters: [
            { field: "auditLogContext", operator: "EQ", values: ["INVOICE"] },
            { field: "entityUid", operator: "EQ", values: [uid] },
          ],
          sort: [{ field: "createdAt", direction: "DESC" }],
          page: auditLogPage,
          size: auditLogPageSize,
        });

        if (!active) {
          return;
        }

        const payload = response.data;
        setAuditLogEntries(normalizeAuditEntries(payload));
        setAuditLogTotal(
          Number(
            payload?.totalElements
            ?? payload?.data?.totalElements
            ?? payload?.page?.totalElements
            ?? normalizeAuditEntries(payload).length,
          ) || 0,
        );
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("Failed to load invoice audit logs", error);
        setAuditLogError(error instanceof Error ? error.message : "Could not load invoice audit logs.");
      } finally {
        if (active) {
          setAuditLogLoading(false);
        }
      }
    }

    void loadAuditLogs();

    return () => {
      active = false;
    };
  }, [uid, auditLogDialogOpen, auditLogPage, auditLogPageSize]);

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
    if (invoicePdfBusy) {
      return;
    }

    setInvoicePdfBusy(true);
    void (async () => {
      try {
        const invoiceContent = document.getElementById("finance-invoice-print");
        const pdfFile = await generateInvoicePdfFile(invoiceContent, { invoiceNumber: `invoice-${invoice?.invoiceNum || "invoice"}` });
        if (!pdfFile) {
          throw new Error("Could not generate invoice PDF.");
        }
        triggerInvoicePdfPrint(pdfFile);
      } catch (error) {
        console.error("Failed to print invoice", error);
        eventBus?.emit(SHELL_TOAST_EVENT, {
          intent: "error",
          title: "Print Invoice",
          message: error instanceof Error ? error.message : "Could not print invoice PDF.",
        });
      } finally {
        setInvoicePdfBusy(false);
      }
    })();
  }

  function closeSharePdfDialog() {
    if (sharePdfSubmitting) {
      return;
    }
    setSharePdfDialogOpen(false);
    setSharePdfError("");
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

  const backHref = location.state?.from || "/invoice";
  const auditLogTotalPages = Math.max(1, Math.ceil(auditLogTotal / auditLogPageSize));
  const auditLogStart = auditLogTotal === 0 ? 0 : auditLogPage * auditLogPageSize + 1;
  const auditLogEnd = Math.min((auditLogPage + 1) * auditLogPageSize, auditLogTotal);

  return (
    <PageShell
      title={`Invoice: #${invoice.invoiceNum}`}
      subtitle="Set up and view your transaction itemizations, payments, and balances."
      back={{ label: "Back to Invoices", href: backHref }}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSharePdfDialogOpen(true)} disabled={sharePdfSubmitting || invoicePdfBusy}>Share PDF</Button>
          <Button variant="outline" onClick={handlePrintInvoice} disabled={invoicePdfBusy}>{invoicePdfBusy ? "Generating PDF..." : "Print"}</Button>
          <Button variant="outline" onClick={() => navigate(`/invoice/edit/${uid}`)}>Edit</Button>
          <Button
            variant="outline"
            onClick={() => {
              setAuditLogPage(0);
              setAuditLogDialogOpen(true);
            }}
          >
            Log
          </Button>
        </div>
      }
    >
      <SectionCard className="border-slate-200 bg-white shadow-sm p-0 overflow-hidden">
        <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-6">
          <div id="finance-invoice-print" className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-6 shadow-sm">
            {/* Header Info */}
            <div className="grid gap-6 border-b border-slate-100 pb-6 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Billed From</div>
                <div className="text-lg font-extrabold text-slate-900">Oasis Hospital's</div>
                <div className="text-sm font-medium text-slate-500">{invoice.location || "Thrissur"}</div>
                <div className="text-sm text-slate-500">{invoice.billedToAddress || "-"}</div>
              </div>

              <div className="space-y-1 md:text-right">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Billed To</div>
                <div className="text-lg font-extrabold text-slate-900">{invoice.customer || "Customer"}</div>
                <div className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Invoice Information</div>
                <div className="text-sm font-semibold text-slate-700">Date: <span className="font-normal text-slate-500">{invoice.invoiceDate}</span></div>
                <div className="text-sm font-semibold text-slate-700">Category: <span className="font-normal text-slate-500">{invoice.category}</span></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-8 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-600">
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Procedure/Item</th>
                    <th className="px-4 py-3.5 font-bold whitespace-nowrap">Date</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Rate</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Qty</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Total Rate</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Discount</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">After Discount</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Tax</th>
                    <th className="px-4 py-3.5 font-bold text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoice.detailList.length ? (
                    invoice.detailList.map((item: any) => (
                      <tr key={item.id} className="text-slate-700 hover:bg-slate-50/50 transition">
                        <td className="px-4 py-4 font-semibold text-slate-900 whitespace-nowrap">{item.itemName}</td>
                        <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{item.processedDate}</td>
                        <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">{item.quantity}</td>
                        <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(item.totalRate)}</td>
                        <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(item.discount)}</td>
                        <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(item.afterDiscount)}</td>
                        <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">{formatCurrency(item.tax)}</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.total)}</td>
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

            {/* Totals & Summary */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2 items-start justify-start">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400 mb-1">Invoice Status</div>
                <Badge variant={invoiceBadgeVariant} className="text-sm font-bold uppercase tracking-wider px-3 py-1">
                  {invoice.status}
                </Badge>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-medium">Total Amount :</span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-medium">Net Total :</span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.netTotal)}</span>
                </div>
                {amountPaid > 0 ? (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      className="font-medium text-slate-500 hover:text-slate-800 underline decoration-slate-300 underline-offset-4 transition"
                      onClick={() => void loadPaymentEntries(true)}
                    >
                      Amount Paid :
                    </button>
                    <button
                      type="button"
                      className="font-bold text-slate-900 hover:text-slate-800 underline decoration-slate-300 underline-offset-4 transition"
                      onClick={() => void loadPaymentEntries(true)}
                    >
                      {formatCurrency(amountPaid)}
                    </button>
                  </div>
                ) : null}

                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center justify-between text-base font-bold text-slate-900">
                    <span>Amount Due</span>
                    <span className="text-lg font-extrabold text-[var(--color-primary)]">{formatCurrency(invoice.amountDue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

          {!isInvoiceSettled && !isInvoiceCancelled ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t border-slate-100 pt-5">
              {canShowGetPayment ? (
                <Popover
                  portal
                  placement="top"
                  align="start"
                  trigger={
                    <Button className="w-full sm:w-auto border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)]">
                      Get Payment
                    </Button>
                  }
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
                className="w-full sm:w-auto"
                onClick={() => void handleInvoiceStatusUpdate("Settled")}
                disabled={statusUpdating}
              >
                {statusUpdating ? "Updating..." : "Settle Invoice"}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50/50"
                onClick={() => void handleInvoiceStatusUpdate("Cancel")}
                disabled={statusUpdating}
              >
                {statusUpdating ? "Updating..." : "Cancel Invoice"}
              </Button>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <Dialog
        open={auditLogDialogOpen}
        onClose={() => setAuditLogDialogOpen(false)}
        title="Logs"
        size="fullscreen"
        contentClassName="w-[92vw] max-w-[1536px] max-sm:w-screen max-sm:max-w-none"
      >
        <div className="space-y-4">
          {auditLogError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {auditLogError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[2.4fr_1fr_1fr_2.2fr_1.5fr] gap-4 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <div>Date</div>
              <div>Action</div>
              <div>Type</div>
              <div>Description</div>
              <div>User</div>
            </div>

            {auditLogLoading ? (
              <div className="px-4 py-8 text-sm text-slate-500">Loading logs...</div>
            ) : auditLogEntries.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500">No logs found.</div>
            ) : (
              auditLogEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[2.4fr_1fr_1fr_2.2fr_1.5fr] gap-4 border-t border-slate-200 px-4 py-4 text-sm text-slate-700"
                >
                  <div>{entry.timestampLabel}</div>
                  <div>{entry.action}</div>
                  <div>{entry.type}</div>
                  <div>{entry.description || "-"}</div>
                  <div>{entry.actor}</div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Showing {auditLogStart} to {auditLogEnd} of {auditLogTotal} Logs
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAuditLogPage(0)} disabled={auditLogPage === 0 || auditLogLoading}>«</Button>
                <Button variant="ghost" size="sm" onClick={() => setAuditLogPage((current) => Math.max(0, current - 1))} disabled={auditLogPage === 0 || auditLogLoading}>‹</Button>
                <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-indigo-100 px-3 text-sm font-semibold text-indigo-700">
                  {auditLogPage + 1}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAuditLogPage((current) => Math.min(auditLogTotalPages - 1, current + 1))} disabled={auditLogPage >= auditLogTotalPages - 1 || auditLogLoading}>›</Button>
                <Button variant="ghost" size="sm" onClick={() => setAuditLogPage(auditLogTotalPages - 1)} disabled={auditLogPage >= auditLogTotalPages - 1 || auditLogLoading}>»</Button>
              </div>
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                value={auditLogPageSize}
                onChange={(event) => {
                  setAuditLogPage(0);
                  setAuditLogPageSize(Number(event.target.value));
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </Dialog>

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
        sharePdfDialogOpen={sharePdfDialogOpen}
        closeSharePdfDialog={closeSharePdfDialog}
        sharePdfError={sharePdfError}
        sharePdfSubmitting={sharePdfSubmitting}
        submitSharePdf={submitSharePdf}
      />
    </PageShell>
  );
}

export default MasterInvoicePage;
