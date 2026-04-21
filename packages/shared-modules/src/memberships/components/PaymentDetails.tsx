import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DatePicker,
  Dialog,
  DialogFooter,
  EmptyState,
  PhoneInput,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
  Input,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useMakeCashPayment,
  useMemberDetailsByUid,
  usePaymentlink,
  useMemberSubscriptionByUid,
} from "../queries/memberships";

interface PaymentDetailsProps {
  memberId: string;
}

type PaymentMode = "cash" | "other";
type SharePhoneValue = { countryCode: string; number: string; e164Number?: string };

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toInputDate(value: unknown) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function getPaymentStatusLabel(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "NOTPAID") return "Not Paid";
  if (normalized === "PARTIALLYPAID") return "Partially Paid";
  if (normalized === "FULLYPAID") return "Fully Paid";

  return status || "Unknown";
}

function getPaymentStatusVariant(status: string): "success" | "danger" | "warning" | "neutral" {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "FULLYPAID") return "success";
  if (normalized === "PARTIALLYPAID") return "warning";
  if (normalized === "NOTPAID") return "danger";

  return "neutral";
}

function parseNoteHistory(value: unknown) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizePhoneValue(countryCode: unknown, number: unknown): SharePhoneValue {
  return {
    countryCode: String(countryCode ?? "+91"),
    number: String(number ?? ""),
  };
}

function isValidEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildPaymentLinkPayload(
  subscriptionUid: string,
  phoneNumber: SharePhoneValue,
  whatsAppNumber: SharePhoneValue,
  emailId: string
) {
  const phone = phoneNumber.number.trim();
  const whatsApp = whatsAppNumber.number.trim();
  const email = emailId.trim();

  return {
    uuid: subscriptionUid,
    countryCode: phone ? phoneNumber.countryCode : undefined,
    phNo: phone || undefined,
    email: email || undefined,
    emailNotification: email ? "true" : "false",
    smsNotification: phone ? "true" : "false",
    whatsappNotification: whatsApp ? "true" : "false",
    whatsappPhNo: whatsApp || undefined,
    whatsappCountryCode: whatsApp ? whatsAppNumber.countryCode : undefined,
  };
}

function buildPrintableMarkup(memberDetails: any, paymentDetails: any, isRenewed: boolean) {
  const memberName = [memberDetails?.salutation, memberDetails?.firstName, memberDetails?.lastName]
    .filter(Boolean)
    .join(" ") || "Member";
  const memberId = memberDetails?.memberCustomId || "-";
  const subscriptionName = paymentDetails?.memberSubscriptionType?.name ?? "Subscription";
  const status = getPaymentStatusLabel(String(paymentDetails?.paymentStatus ?? ""));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Fee Info</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
      h1 { font-size: 24px; margin: 0 0 24px; }
      h2 { font-size: 16px; margin: 0 0 12px; }
      .section { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
      .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      .value { font-size: 14px; font-weight: 600; margin-top: 4px; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
      .row:last-child { border-bottom: none; }
      .muted { color: #64748b; font-size: 13px; }
    </style>
  </head>
  <body>
    <h1>Fee Info</h1>
    <div class="section">
      <div class="grid">
        <div>
          <div class="label">Member</div>
          <div class="value">${memberName}</div>
        </div>
        <div>
          <div class="label">Member ID</div>
          <div class="value">${memberId}</div>
        </div>
        <div>
          <div class="label">Payment Status</div>
          <div class="value">${status}</div>
        </div>
        <div>
          <div class="label">Created Date</div>
          <div class="value">${formatDate(paymentDetails?.createdDate)}</div>
        </div>
      </div>
    </div>
    <div class="section">
      <h2>Subscription</h2>
      <div class="row"><span>${subscriptionName}${isRenewed ? " (Renewal)" : ""}</span><strong>${formatCurrency(paymentDetails?.subscriptionAmountToPay)}</strong></div>
      <div class="muted">Validity: ${formatDate(paymentDetails?.validityPeriodFrom)} - ${formatDate(paymentDetails?.validityPeriodTo)}</div>
    </div>
    <div class="section">
      <h2>Amount Summary</h2>
      <div class="row"><span>Amount</span><strong>${formatCurrency(paymentDetails?.subscriptionAmountToPay)}</strong></div>
      <div class="row"><span>Amount Paid</span><strong>${formatCurrency(paymentDetails?.subscriptionAmountPaid)}</strong></div>
      <div class="row"><span>Total Amount Due</span><strong>${formatCurrency(paymentDetails?.subscriptionAmountDue)}</strong></div>
    </div>
  </body>
</html>`;
}

export function PaymentDetails({ memberId }: PaymentDetailsProps) {
  const { basePath } = useSharedModulesContext();
  const [paymentDialogMode, setPaymentDialogMode] = useState<PaymentMode | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [amountToPay, setAmountToPay] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [otherMode, setOtherMode] = useState("UPI");
  const [showNoteHistory, setShowNoteHistory] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<SharePhoneValue>({ countryCode: "+91", number: "" });
  const [whatsAppNumber, setWhatsAppNumber] = useState<SharePhoneValue>({ countryCode: "+91", number: "" });
  const [emailId, setEmailId] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const subscriptionUid = searchParams.get("subUid") ?? "";
  const isRenewed = searchParams.get("renew") === "true";

  const memberQuery = useMemberDetailsByUid(memberId);
  const paymentQuery = useMemberSubscriptionByUid(subscriptionUid);
  const makeCashPaymentMutation = useMakeCashPayment();
  const paymentLinkMutation = usePaymentlink();

  const memberDetails = useMemo(() => unwrapPayload(memberQuery.data), [memberQuery.data]);
  const paymentDetails = useMemo(() => unwrapPayload(paymentQuery.data), [paymentQuery.data]);
  const noteHistory = useMemo(
    () => parseNoteHistory(paymentDetails?.note).length ? parseNoteHistory(paymentDetails?.note) : (paymentDetails?.noteList ?? []),
    [paymentDetails]
  );

  const amountDue = Number(paymentDetails?.subscriptionAmountDue ?? 0);
  const amountPaid = Number(paymentDetails?.subscriptionAmountPaid ?? 0);
  const amountTotal = Number(paymentDetails?.subscriptionAmountToPay ?? 0);
  const canCollectPayment = amountDue > 0 && getPaymentStatusLabel(String(paymentDetails?.paymentStatus ?? "")) !== "Fully Paid";
  const shareDisabled = (
    (!phoneNumber.number.trim() && !whatsAppNumber.number.trim() && !emailId.trim()) ||
    !isValidEmail(emailId)
  );

  useEffect(() => {
    if (!memberDetails) return;

    setPhoneNumber(normalizePhoneValue(memberDetails.countryCode, memberDetails.phoneNo));
    setWhatsAppNumber(
      normalizePhoneValue(
        memberDetails?.whatsAppNum?.countryCode ?? memberDetails.countryCode,
        memberDetails?.whatsAppNum?.number
      )
    );
    setEmailId(String(memberDetails.email ?? ""));
  }, [memberDetails]);

  function openPaymentDialog(mode: PaymentMode) {
    setPaymentDialogMode(mode);
    setDialogError(null);
    setAmountToPay(amountDue.toFixed(2));
    setPaymentDate(toInputDate(new Date()));
    setPaymentNote("");
    setOtherMode("UPI");
  }

  function closePaymentDialog() {
    setPaymentDialogMode(null);
    setDialogError(null);
    setConfirmOpen(false);
  }

  function openShareDialog() {
    setShareError(null);
    setShareSuccess(null);
    setShareDialogOpen(true);
  }

  function closeShareDialog() {
    setShareDialogOpen(false);
    setShareError(null);
  }

  function validatePayment() {
    const amount = Number(amountToPay);

    if (!amountToPay || Number.isNaN(amount) || amount <= 0) {
      setDialogError("Amount should be greater than zero.");
      return false;
    }

    if (amount > amountDue) {
      setDialogError("Amount to pay should be less than or equal to total payable amount.");
      return false;
    }

    if (!paymentDate) {
      setDialogError("Payment date is required.");
      return false;
    }

    if (paymentDialogMode === "other" && !otherMode) {
      setDialogError("Please select a payment mode.");
      return false;
    }

    setDialogError(null);
    return true;
  }

  async function submitPayment() {
    if (!paymentDialogMode || !validatePayment()) {
      setConfirmOpen(false);
      return;
    }

    try {
      await makeCashPaymentMutation.mutateAsync({
        uuid: subscriptionUid,
        acceptPaymentBy: paymentDialogMode,
        amount: Number(amountToPay),
        paymentNote: paymentNote.trim() || undefined,
        paymentOndate: paymentDate,
        ...(paymentDialogMode === "other" ? { paymentMode: otherMode } : {}),
      });

      closePaymentDialog();
      await paymentQuery.refetch();
    } catch (error: any) {
      setDialogError(
        typeof error?.message === "string"
          ? error.message
          : "Unable to record payment right now."
      );
      setConfirmOpen(false);
    }
  }

  async function submitPaymentLink() {
    if (shareDisabled) {
      setShareError("Enter at least one valid contact to share the payment link.");
      return;
    }

    try {
      await paymentLinkMutation.mutateAsync(
        buildPaymentLinkPayload(subscriptionUid, phoneNumber, whatsAppNumber, emailId)
      );
      setShareSuccess("Payment link sent successfully.");
      setShareDialogOpen(false);
    } catch (error: any) {
      setShareError(
        typeof error?.message === "string"
          ? error.message
          : "Unable to share the payment link right now."
      );
    }
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableMarkup(memberDetails, paymentDetails, isRenewed));
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
    setPrintDialogOpen(false);
  }

  const paymentModeOptions = [
    { value: "UPI", label: "UPI" },
    { value: "CC", label: "Credit Card" },
    { value: "DC", label: "Debit Card" },
    { value: "NB", label: "Net Banking" },
    { value: "Other", label: "Other" },
  ];

  if (!subscriptionUid) {
    return (
      <EmptyState
        title="No payment selected"
        description="Open fee information from a member subscription or the fee-management list."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Info"
        subtitle="Review subscription charges, paid amount, and record payment updates."
        back={{ label: "Back", href: `${basePath}/paymentInfo` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPrintDialogOpen(true)}>
              Print
            </Button>
            <Button variant="outline" onClick={openShareDialog}>
              Share Payment Link
            </Button>
            {canCollectPayment ? (
              <>
              <Button variant="outline" onClick={() => openPaymentDialog("cash")}>
                Pay by Cash
              </Button>
              <Button onClick={() => openPaymentDialog("other")}>
                Pay by Others
              </Button>
              </>
            ) : null}
          </div>
        )}
      />

      {shareSuccess ? <Alert variant="success">{shareSuccess}</Alert> : null}

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={`${memberDetails?.firstName ?? ""} ${memberDetails?.lastName ?? ""}`.trim() || "Member"}
              src={Array.isArray(memberDetails?.photos) && memberDetails.photos.length > 0
                ? memberDetails.photos[memberDetails.photos.length - 1]?.s3path
                : undefined}
              size="lg"
            />
            <div className="space-y-1">
              <div className="text-xl font-semibold text-slate-900">
                {[memberDetails?.salutation, memberDetails?.firstName, memberDetails?.lastName].filter(Boolean).join(" ") || "Member"}
              </div>
              <div className="text-sm text-slate-500">
                {memberDetails?.memberCustomId ? `ID: ${memberDetails.memberCustomId}` : "Membership record"}
              </div>
              <div className="text-sm text-slate-500">
                Date: {formatDate(paymentDetails?.createdDate)}
              </div>
            </div>
          </div>

          <Badge variant={getPaymentStatusVariant(String(paymentDetails?.paymentStatus ?? ""))}>
            {getPaymentStatusLabel(String(paymentDetails?.paymentStatus ?? ""))}
          </Badge>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <SectionCard title="Subscription" className="border-slate-200 shadow-sm">
          {paymentDetails ? (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1.8fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                <div>Subscription</div>
                <div className="text-right">Rate</div>
                <div className="text-right">Amount</div>
              </div>
              <div className="grid grid-cols-[1.8fr_1fr_1fr] gap-4 px-4 py-4 text-sm text-slate-800">
                <div>
                  <div className="font-semibold text-slate-900">
                    {paymentDetails?.memberSubscriptionType?.name ?? "Subscription"}
                  </div>
                  <div className="mt-1 text-slate-500">
                    {formatDate(paymentDetails?.validityPeriodFrom)} - {formatDate(paymentDetails?.validityPeriodTo)}
                  </div>
                  {isRenewed ? (
                    <div className="mt-2 text-xs font-medium text-amber-700">Renewal payment</div>
                  ) : null}
                </div>
                <div className="text-right">{formatCurrency(paymentDetails?.subscriptionAmountToPay)}</div>
                <div className="text-right">{formatCurrency(paymentDetails?.subscriptionAmountToPay)}</div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No subscription payment found"
              description="The selected payment record could not be loaded."
            />
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Amount Summary" className="border-slate-200 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(amountTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Amount Paid</span>
                <span className="font-semibold text-slate-900">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">Total Amount Due</span>
                  <span className="text-lg font-semibold text-slate-900">{formatCurrency(amountDue)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Payment Notes" className="border-slate-200 shadow-sm">
            {noteHistory.length ? (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  className="px-0 text-sm text-slate-600"
                  onClick={() => setShowNoteHistory((value) => !value)}
                >
                  {showNoteHistory ? "Hide Note History" : "Show Note History"}
                </Button>
                {showNoteHistory ? (
                  <div className="space-y-3">
                    {noteHistory.map((noteInfo: any, index: number) => (
                      <div key={`${noteInfo.updatedDate ?? index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {formatDate(noteInfo.updatedDate)}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">{noteInfo.note || "-"}</div>
                        {noteInfo.providerNoteForPaymentDate ? (
                          <div className="mt-2 text-xs text-slate-500">
                            {noteInfo.providerNoteForPaymentDate}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No payment notes"
                description="Notes added during payment updates will appear here."
              />
            )}
          </SectionCard>
        </div>
      </div>

      <Dialog
        open={Boolean(paymentDialogMode)}
        onClose={closePaymentDialog}
        title={paymentDialogMode === "cash" ? "Pay by Cash" : "Pay by Others"}
        description={paymentDialogMode === "cash" ? "Record the amount received in cash." : "Record the amount received using another payment mode."}
        size="md"
      >
        <div className="space-y-4">
          {dialogError ? <Alert variant="danger">{dialogError}</Alert> : null}

          <div className="text-sm font-medium text-slate-700">
            Payable Amount: <span className="text-slate-900">{formatCurrency(amountDue)}</span>
          </div>

          <Input
            label="Amount To Pay Now (₹)"
            type="number"
            min="0.01"
            max={amountDue.toFixed(2)}
            step="0.01"
            value={amountToPay}
            onChange={(event) => {
              setAmountToPay(event.target.value);
              setDialogError(null);
            }}
          />

          {paymentDialogMode === "other" ? (
            <Select
              label="Select Mode"
              value={otherMode}
              onChange={(event) => {
                setOtherMode(event.target.value);
                setDialogError(null);
              }}
              options={paymentModeOptions}
            />
          ) : null}

          <DatePicker
            label="Payment Date"
            value={paymentDate}
            onChange={(event) => {
              setPaymentDate(event.target.value);
              setDialogError(null);
            }}
          />

          <Textarea
            label="Leave a Payment Note"
            rows={3}
            value={paymentNote}
            onChange={(event) => {
              setPaymentNote(event.target.value);
              setDialogError(null);
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={closePaymentDialog}>
            Cancel
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>
            Pay
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={shareDialogOpen}
        onClose={closeShareDialog}
        title="Share Payment Link"
        description="Send the payment link using mobile, WhatsApp, or email."
        size="md"
      >
        <div className="space-y-4">
          {shareError ? <Alert variant="danger">{shareError}</Alert> : null}

          <PhoneInput
            label="Mobile Number"
            value={phoneNumber}
            onChange={(value) => {
              setPhoneNumber(value);
              setShareError(null);
            }}
          />

          <PhoneInput
            label="WhatsApp Number"
            value={whatsAppNumber}
            onChange={(value) => {
              setWhatsAppNumber(value);
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
          <Button onClick={submitPaymentLink} loading={paymentLinkMutation.isPending} disabled={shareDisabled}>
            Send
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        title="Print Fee Info"
        description="Preview the fee summary and continue to browser print."
        size="sm"
      >
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Member</div>
            <div className="font-medium text-slate-900">
              {[memberDetails?.salutation, memberDetails?.firstName, memberDetails?.lastName].filter(Boolean).join(" ") || "Member"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Member ID</div>
            <div className="font-medium text-slate-900">{memberDetails?.memberCustomId || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Subscription</div>
            <div className="font-medium text-slate-900">
              {paymentDetails?.memberSubscriptionType?.name ?? "Subscription"}
              {isRenewed ? " (Renewal)" : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Created Date</div>
            <div className="font-medium text-slate-900">{formatDate(paymentDetails?.createdDate)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Payment Status</div>
            <div className="font-medium text-slate-900">{getPaymentStatusLabel(String(paymentDetails?.paymentStatus ?? ""))}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Amount Due</div>
            <div className="font-medium text-slate-900">{formatCurrency(amountDue)}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setPrintDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint}>
            Print
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitPayment}
        title="Confirm Payment"
        description="Proceed with payment?"
        confirmLabel={paymentDialogMode === "cash" ? "Pay" : "Confirm"}
        loading={makeCashPaymentMutation.isPending}
      />
    </div>
  );
}
