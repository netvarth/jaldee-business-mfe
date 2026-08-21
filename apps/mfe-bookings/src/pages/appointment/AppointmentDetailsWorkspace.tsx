import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Textarea, TimePicker, cn } from "@jaldee/design-system";
import {
  ChevronDown, X, Calendar, Clock, User, CheckCircle, RotateCw, Ban, CreditCard, Play, FileText, Trash,
} from "../../components/icons";
import {
  useBookingDetails,
  paymentNoteText,
  PAYMENT_MODES,
  type ActionExtra,
  type PaymentMode,
} from "../../services/useBookingDetails";
import { useBookingPreferences } from "../../services/useBookingPreferences";
import { useBlockSlot } from "../../services/useBlockSlot";
import { useSlots } from "../../services/useSlots";
import type { AllowedAction, BookingStatus, Slot, BookingDetails } from "../../types";
import InvoiceModal from "./InvoiceModal";
import { buildOffsetDateTime, formatIsoTime } from "../../utils/dateTime";
import { useToast } from "../../contexts/ToastContext";
import { useBookingApi } from "../../services/useBookingApi";
import AttachmentsPanel from "./AttachmentsPanel";
import ShareInfoModal from "./ShareInfoModal";
import ManageLabelsModal from "./ManageLabelsModal";
import BookingHistoryTimeline from "./BookingHistoryTimeline";
interface Props {
  bookingId: string | null;
  onClose: () => void;
}

const STATUS_STYLE: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  REQUESTED:   { bg: "bg-slate-50 border-slate-200",   text: "text-slate-700",   label: "Requested" },
  CONFIRMED:   { bg: "bg-blue-50 border-blue-100",     text: "text-blue-700",    label: "Confirmed" },
  CHECKED_IN:  { bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700", label: "Checked In" },
  WAITING:     { bg: "bg-amber-50 border-amber-100",   text: "text-amber-700",   label: "Waiting" },
  IN_PROGRESS: { bg: "bg-indigo-50 border-indigo-100", text: "text-indigo-700",  label: "In Progress" },
  COMPLETED:   { bg: "bg-green-50 border-green-100",   text: "text-green-700",   label: "Completed" },
  CANCELLED:   { bg: "bg-red-50 border-red-100",       text: "text-red-700",     label: "Cancelled" },
  NO_SHOW:     { bg: "bg-slate-100 border-slate-200",  text: "text-slate-600",   label: "No Show" },
  RESCHEDULED: { bg: "bg-purple-50 border-purple-100", text: "text-purple-700",  label: "Rescheduled" },
  UNBLOCKED:   { bg: "bg-cyan-50 border-cyan-100",     text: "text-cyan-700",    label: "Unblocked" },
  BLOCKED:     { bg: "bg-slate-100 border-slate-300",  text: "text-slate-700",   label: "Blocked" },
};

const ACTION_META: Record<AllowedAction, { label: string; icon: typeof Play; tone: string }> = {
  CONFIRM:         { label: "Confirm",        icon: CheckCircle, tone: "emerald" },
  CHECK_IN:        { label: "Check In",       icon: CheckCircle, tone: "emerald" },
  MOVE_TO_WAITING: { label: "Move to Waiting",icon: Clock,       tone: "amber" },
  START:           { label: "Start",          icon: Play,        tone: "indigo" },
  COMPLETE:        { label: "Complete",       icon: CheckCircle, tone: "green" },
  CANCEL:          { label: "Cancel Booking", icon: Trash,       tone: "red" },
  NO_SHOW:         { label: "No Show",        icon: X,           tone: "slate" },
  RESCHEDULE:      { label: "Reschedule",     icon: Calendar,    tone: "blue" },
  REBOOK:          { label: "Rebook",         icon: RotateCw,    tone: "blue" },
  CREATE_INVOICE:  { label: "Invoice",        icon: FileText,    tone: "purple" },
  EDIT:            { label: "Edit",           icon: FileText,    tone: "slate" },
  VIEW_SUMMARY:    { label: "Summary",        icon: FileText,    tone: "slate" },
  VIEW_INVOICE:    { label: "Invoice",        icon: FileText,    tone: "slate" },
  CREATE_FOLLOWUP: { label: "Follow-up",      icon: RotateCw,    tone: "emerald" },
  UNBLOCK:         { label: "Unblock",        icon: RotateCw,    tone: "cyan" },
  SHARE_INFO:      { label: "Share Info",     icon: FileText,    tone: "blue" },
  MANAGE_LABELS:   { label: "Manage Labels",  icon: FileText,    tone: "slate" },
  VIEW_HISTORY:    { label: "Timeline",       icon: Clock,       tone: "slate" },
};

const TONE: Record<string, string> = {
  emerald: "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700",
  amber:   "hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700",
  indigo:  "hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700",
  green:   "hover:bg-green-50 hover:border-green-200 hover:text-green-700",
  red:     "hover:bg-red-50 hover:border-red-200 hover:text-red-700",
  blue:    "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
  purple:  "hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700",
  cyan:    "hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700",
  slate:   "hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700",
};

function fmtDate(d?: string): string {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(v?: number, currency?: string): string {
  if (v == null || isNaN(v)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(v);
  } catch {
    return `${currency || "INR"} ${v.toFixed(2)}`;
  }
}

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function testToken(value?: string): string {
  const token = (value || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return token || "item";
}

function formatChannel(c?: string): string {
  if (!c) return '—';
  if (c.toUpperCase() === 'WALK_IN' || c.toUpperCase() === 'WALKIN') return 'Walk-in';
  if (c.toUpperCase() === 'ONLINE') return 'Online';
  return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase().replace(/_/g, ' ');
}

export default function AppointmentDetailsWorkspace({ bookingId, onClose }: Props) {
  const {
    details, timeline, loading, acting, load, act,
    finance, payments, paying, createInvoice, recordPayment, viewInvoice,
  } = useBookingDetails();
  const { showToast } = useToast();
  const api = useBookingApi();
  const navigate = useNavigate();
  const { preference } = useBookingPreferences();
  const { slots, isHoliday, holidayMessage, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { unblockSlot, submitting: unblocking } = useBlockSlot();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("cash");
  const [payNote, setPayNote] = useState("");
  const [payTxn, setPayTxn] = useState("");
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [shareInfoOpen, setShareInfoOpen] = useState(false);
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSeries, setCancelSeries] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [rescheduleSeries, setRescheduleSeries] = useState(false);
  const [viewFullDetails, setViewFullDetails] = useState(false);

  useEffect(() => {
    if (bookingId) {
      setCancelOpen(false);
      setReschedOpen(false);
      setCancelSeries(false);
      setRescheduleSeries(false);
      setPayOpen(false);
      setPayAmount("");
      setPayMode("Cash");
      setPayNote("");
      setPayTxn("");
      setShowMobileActions(false);
      load(bookingId);
    }
  }, [bookingId, load]);

  if (!bookingId) return null;

  useEffect(() => {
    if (reschedOpen && newDate && details) {
      fetchSlots({
        scheduleUid: details.calendarUid || "",
        calendarUid: details.calendarUid,
        serviceUid: details.serviceUid || "",
        providerUid: details.userUid,
        date: newDate,
      });
    } else {
      clearSlots();
    }
  }, [reschedOpen, newDate, details, fetchSlots, clearSlots]);

  useEffect(() => {
    if (reschedOpen) {
      setTimeout(() => {
        const displayInput = document.querySelector(`[data-testid="bookings-appointment-details-${bookingId}-reschedule-date-display"]`) as HTMLInputElement | null;
        if (displayInput) {
          displayInput.focus();
        }
      }, 50);
    }
  }, [reschedOpen, bookingId]);

  const handleAction = (action: AllowedAction) => {
    if (action === "CANCEL") { setCancelOpen((v) => !v); return; }
    if (action === "RESCHEDULE") { setReschedOpen((v) => !v); return; }
    if (action === "CREATE_INVOICE") { createInvoice().then(() => setInvoiceModalOpen(true)); return; }
    if (action === "VIEW_INVOICE") { viewInvoice().then(() => setInvoiceModalOpen(true)); return; }
    if (action === "SHARE_INFO") { setShareInfoOpen(true); return; }
    if (action === "MANAGE_LABELS") { setManageLabelsOpen(true); return; }
    if (action === "UNBLOCK") { doUnblock(); return; }
    if (action === "VIEW_SUMMARY" || action === "EDIT" || action === "CREATE_FOLLOWUP" || action === "VIEW_HISTORY") return;
    act(action);
  };

  const doUnblock = async () => {
    if (!bookingId) return;
    try {
      await unblockSlot(bookingId);
      load(bookingId);
    } catch { /* surfaced via reload state */ }
  };

  const submitPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    await recordPayment({
      amount,
      mode: payMode,
      note: payNote || undefined,
      transactionId: payTxn || undefined,
    });
    setPayOpen(false);
    setPayAmount("");
    setPayNote("");
    setPayTxn("");
  };

  const submitCancel = () => {
    act("CANCEL", { reason: cancelReason, cancelSeries });
    setCancelOpen(false);
    setCancelReason("");
    setCancelSeries(false);
  };

  const submitReschedule = () => {
    if (!newDate || !newStart) return;
    const start = buildOffsetDateTime(newDate, newStart, preference?.timezone);
    
    let end: string;
    if (newEnd) {
      end = buildOffsetDateTime(newDate, newEnd, preference?.timezone);
    } else {
      const [h, m] = newStart.split(":").map(Number);
      const endHour = h + Math.floor((m + 30) / 60);
      const endMinute = (m + 30) % 60;
      end = buildOffsetDateTime(
        newDate,
        `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`,
        preference?.timezone,
      );
    }
    
    const extra: ActionExtra = { newDate, newStartTime: start, newEndTime: end, rescheduleSeries };
    act("RESCHEDULE", extra);
    setReschedOpen(false);
    setRescheduleSeries(false);
  };

  const getDerivedActions = (status: string, allowed: AllowedAction[], isInvoiceCreated: boolean = false): AllowedAction[] => {
    let actions = [...allowed].filter(a => a !== "VIEW_HISTORY");
    
    // Always provide an invoice action if they are checked-in or beyond
    if (!actions.includes("CREATE_INVOICE") && !actions.includes("VIEW_INVOICE")) {
       if (["ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
           actions.push("CREATE_INVOICE");
       }
    }

    actions.push("SHARE_INFO", "MANAGE_LABELS");

    const invoiceAction = isInvoiceCreated ? "VIEW_INVOICE" : "CREATE_INVOICE";
    return actions
      .filter(a => a !== "NO_SHOW" && a !== "EDIT")
      .filter(a => !(status === "COMPLETED" && (a === "CREATE_FOLLOWUP" || a === "VIEW_SUMMARY")))
      .map(a => (a === "CREATE_INVOICE" || a === "VIEW_INVOICE") ? invoiceAction : a);
  };

  const st = details ? STATUS_STYLE[details.status] : null;
  const actionsToShow = details ? getDerivedActions(details.status, details.allowedActions, details.isInvoiceCreated) : [];

  if (invoiceModalOpen && details) {
    return (
      <div className="relative z-40 mx-4 flex w-full max-w-[700px] flex-col items-center justify-center">
        <InvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          details={details}
          finance={finance}
          payments={payments}
          onPay={recordPayment}
        />
      </div>
    );
  }

  return (
    <div data-testid={`bookings-appointment-details-${bookingId}`} data-state={loading || !details ? "loading" : details.status} className="relative z-40 mx-4 flex max-h-[88vh] w-full max-w-[700px] flex-col overflow-hidden rounded-[28px] border border-[#dfe6f4] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e7edf7] px-6 pb-4 pt-5">
            <div>
                <h3 className="text-[17px] font-extrabold leading-tight text-[#1f2a44]">Booking Details</h3>
                <p className="mt-1 text-[11px] font-medium text-[#8ca0bf]">View and manage booking details.</p>
            </div>
            <Button variant="ghost" size="sm" iconOnly icon={<X size={18} />} onClick={onClose} className="rounded-full p-1 text-[#91a4c2] hover:bg-slate-100 -mr-1" aria-label="Close booking details" />
        </div>

        {loading || !details ? (
            <div className="flex-1 flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C32FF]" />
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {/* PARTICIPANT DETAILS */}
                <div className="rounded-[16px] border border-slate-200 bg-white overflow-hidden">
                    <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-200">
                        <h4 className="text-[12px] font-bold tracking-[0.05em] text-[#1e293b]">PARTICIPANT DETAILS</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row">
                        <div className="flex-1 p-4 sm:border-r border-slate-200">
                            <h5 className="hidden sm:block text-[12px] font-bold tracking-[0.05em] text-[#0f172a] mb-4">CUSTOMER INFORMATION</h5>
                            <div className="space-y-4 sm:space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">CUSTOMER NAME</p>
                                        <p className="text-[14px] font-bold text-slate-900">{details.customerName || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">CUSTOMER ID</p>
                                        <p className="text-[14px] font-bold text-slate-900">{details.customerReferenceNumber || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-4 pt-1 sm:pt-4">
                            <h5 className="hidden sm:block text-[12px] font-bold tracking-[0.05em] text-[#0f172a] mb-4">STAFF INFORMATION</h5>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5b3df5] text-white font-bold text-[14px]">
                                    {initials(details.userName)}
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">STAFF NAME</p>
                                    <p className="text-[14px] font-bold text-slate-900">{details.userName || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOOKING DETAILS */}
                <div className="rounded-[16px] border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between bg-[#f8fafc] px-4 py-3 border-b border-slate-200">
                        <h4 className="text-[12px] font-bold tracking-[0.05em] text-[#1e293b]">BOOKING DETAILS</h4>
                        <div className="flex gap-2">
                            {details?.rescheduleRequired && (
                                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                    Reschedule Needed
                                </span>
                            )}
                            {st && (
                                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", st.bg, st.text)}>
                                    {st.label || details?.status}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">BOOKING ID</p>
                                    <p className="text-[14px] font-bold text-[#4c37b6]">{details?.encId ? `#${String(details.encId).substring(0,6)}` : "#1"}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">DATE</p>
                                    <p className="text-[14px] font-bold text-slate-900">{fmtDate(details?.bookingDate)}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">TIME</p>
                                    <p className="text-[14px] font-bold text-slate-900">{formatIsoTime(details?.startTime, preference?.timezone, "—")}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">SERVICE TYPE</p>
                                    <p className="text-[14px] font-bold text-slate-900">{details?.serviceName || '—'}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">CALENDAR</p>
                                    <p className="flex items-center gap-1.5 text-[14px] font-bold text-slate-900">
                                        <span className="block h-3 w-3 rounded-[4px] bg-[#12bce2]"></span>
                                        {details?.calendarName || '—'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold tracking-[0.05em] text-slate-500 mb-0.5">BOOKING CHANNEL</p>
                                    <p className="text-[14px] font-bold text-slate-900">{formatChannel(details?.bookingChannel)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* NOTES & ATTACHMENTS */}
                <div className="rounded-[16px] border border-slate-200 bg-white p-4 flex flex-col gap-6">
                    {Array.isArray(details?.consumerNotes) && details.consumerNotes.filter(n => n && n.trim()).length > 0 && (
                        <div>
                            <h4 className="mb-3 text-[12px] font-bold tracking-[0.05em] text-[#1e293b]">NOTES</h4>
                            <div className="space-y-2 text-[13px] text-slate-600">
                                {details.consumerNotes.filter(n => n && n.trim()).map((note, idx) => (
                                    <p key={idx}>{note}</p>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <AttachmentsPanel bookingUid={bookingId} />
                    </div>
                </div>

                <div className="mt-4 mb-4">
                  <BookingHistoryTimeline bookingUid={bookingId} />
                </div>
                
                {reschedOpen && (
                  <div className="px-6 mb-4">
                    <div data-testid={`bookings-appointment-details-${bookingId}-reschedule-panel`} data-state="open" className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <label className="block text-xs font-bold text-slate-700">Reschedule to</label>
                      <div className="flex gap-2 mb-2">
                        <Input autoFocus id={`bookings-appointment-details-${bookingId}-reschedule-date`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-date`} type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setNewStart(""); setNewEnd(""); }} containerClassName="flex-1" />
                      </div>
                      
                      {newDate && (
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-700 mb-2">Available Slots</label>
                          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {slotsLoading ? (
                              <div className="text-xs font-medium text-[#6C32FF] col-span-4 p-4 text-center bg-[#f5f3ff] rounded-lg border border-[#eaddff]">Loading slots…</div>
                            ) : slots.length === 0 ? (
                              isHoliday ? (
                                <div className="text-xs font-medium text-amber-700 col-span-4 p-4 text-center bg-amber-50 rounded-lg border border-amber-100">Closed — {holidayMessage || "Holiday"}</div>
                              ) : (
                                <div className="text-xs font-medium text-amber-700 col-span-4 p-4 text-center bg-amber-50 rounded-lg border border-amber-100">No slots available for this date.</div>
                              )
                            ) : (
                                slots.map((s) => {
                                  const available = s.isAvailable !== false && (s.availableCount ?? 1) > 0;
                                  const active = newStart && newEnd && s.startTime >= newStart && s.startTime < newEnd;
                                  const fmtSlot = (t: string) => {
                                    const [hStr, mStr] = t.split(":");
                                    let h = parseInt(hStr, 10);
                                    const ampm = h >= 12 ? 'PM' : 'AM';
                                    h = h % 12;
                                    if (h === 0) h = 12;
                                    return `${h}:${mStr} ${ampm}`;
                                  };
                                  return (
                                    <button
                                      key={s.startTime}
                                      type="button"
                                      disabled={!available}
                                      onClick={async () => {
                                        if (!details?.calendarUid || !details?.serviceUid || !newDate) {
                                          setNewStart(s.startTime);
                                          setNewEnd(s.endTime);
                                          return;
                                        }
                                        
                                        try {
                                          const params = new URLSearchParams({
                                            calendarUid: details.calendarUid,
                                            serviceUid: details.serviceUid,
                                            date: newDate,
                                            beginningSlot: s.startTime
                                          });
                                          if (details.userUid) {
                                            params.append("tenantUserUid", details.userUid);
                                          }
                                          
                                          const url = `/bookings/availability/validate-slot?${params.toString()}`;
                                          const res = await api.get(url) as any;
                                          
                                          if (res.isAvailable === false) {
                                            showToast(res.message || "Slot is not available.", "error");
                                            setNewStart("");
                                            setNewEnd("");
                                          } else if (res.slots && res.slots.length > 0) {
                                            setNewStart(res.slots[0].startTime);
                                            setNewEnd(res.slots[res.slots.length - 1].endTime);
                                          } else {
                                            setNewStart(s.startTime);
                                            setNewEnd(s.endTime);
                                          }
                                        } catch (e: any) {
                                          showToast(e.message || "Failed to validate slot.", "error");
                                          setNewStart("");
                                          setNewEnd("");
                                        }
                                      }}
                                      className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all shadow-sm ${active ? 'border-[#6C32FF] bg-[#6C32FF] text-white shadow-md' : available ? 'border-slate-200 bg-white text-slate-700 hover:border-[#6C32FF] hover:text-[#6C32FF]' : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed shadow-none'}`}
                                    >
                                      {fmtSlot(s.startTime)}
                                    </button>
                                  );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" id={`bookings-appointment-details-${bookingId}-reschedule-back`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-back`} onClick={() => setReschedOpen(false)}>Cancel</Button>
                        <Button size="sm" id={`bookings-appointment-details-${bookingId}-reschedule-confirm`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-confirm`} onClick={submitReschedule} disabled={!newDate || !newStart} style={{ backgroundColor: '#6C32FF', color: 'white' }}>Confirm</Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {cancelOpen && (
                  <div className="px-6 mb-4">
                    <div data-testid={`bookings-appointment-details-${bookingId}-cancel-panel`} data-state="open" className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                      <label className="block text-xs font-bold text-red-700">Cancellation reason</label>
                      <Textarea
                        id={`bookings-appointment-details-${bookingId}-cancel-reason`}
                        data-testid={`bookings-appointment-details-${bookingId}-cancel-reason`}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={2}
                        className="border-red-200 focus:border-red-300 w-full"
                        placeholder="Why is this booking being cancelled?"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" id={`bookings-appointment-details-${bookingId}-cancel-back`} data-testid={`bookings-appointment-details-${bookingId}-cancel-back`} onClick={() => setCancelOpen(false)}>Back</Button>
                        <Button variant="danger" size="sm" id={`bookings-appointment-details-${bookingId}-cancel-confirm`} data-testid={`bookings-appointment-details-${bookingId}-cancel-confirm`} onClick={submitCancel}>Confirm Cancel</Button>
                      </div>
                    </div>
                  </div>
                )}

            </div>
        )}

        {/* Footer Actions */}
        {!loading && details && (
            <div className="shrink-0 px-6 pb-6 pt-4">
                <div className="relative">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {(() => {
                      const invoiceAction = actionsToShow.find(a => a === "CREATE_INVOICE" || a === "VIEW_INVOICE");
                      const statusActions = actionsToShow.filter(a => a !== "CREATE_INVOICE" && a !== "VIEW_INVOICE");
                      
                      return (
                        <>
                          <div className="relative">
                            {statusActions.length > 0 ? (
                              <Button 
                                variant="outline" 
                                className="w-full flex items-center justify-center gap-2 border-[#5b3df5] text-[#5b3df5] font-bold h-11 rounded-[14px]"
                                onClick={() => setShowMobileActions(!showMobileActions)}
                              >
                                Status change <ChevronDown size={16} />
                              </Button>
                            ) : <div />}
                            
                            {showMobileActions && statusActions.length > 0 && (
                              <div className="absolute bottom-[100%] left-0 w-full mb-2 bg-white border border-slate-200 rounded-[14px] shadow-lg flex flex-col overflow-hidden z-50">
                                {statusActions.map((action) => {
                                    const meta = ACTION_META[action];
                                    const Icon = meta?.icon || Play;
                                    const isBusy = acting === action;
                                    let disabled = !!acting;
                                    
                                    if (action === "COMPLETE" && details.startTime) {
                                        if (details.status !== "IN_PROGRESS") {
                                            const now = new Date();
                                            const start = new Date(details.startTime);
                                            if (start > now) disabled = true;
                                        }
                                    }
                                    
                                    return (
                                        <button
                                            key={action}
                                            onClick={() => { handleAction(action); setShowMobileActions(false); }}
                                            disabled={disabled}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-left border-b border-slate-100 last:border-0 hover:bg-slate-50",
                                                action === "CANCEL" ? "text-red-600" : "text-slate-700",
                                                disabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isBusy ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : <Icon size={16} />}
                                            {meta?.label || action}
                                        </button>
                                    );
                                })}
                              </div>
                            )}
                          </div>
                          
                          {invoiceAction ? (
                            <Button
                                variant="outline"
                                className="w-full h-11 rounded-[14px] border-[#d8e0ee] bg-white text-[#334155] font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
                                onClick={() => handleAction(invoiceAction)}
                                disabled={!!acting}
                            >
                                {acting === invoiceAction ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : <FileText size={16} />}
                                {ACTION_META[invoiceAction]?.label || invoiceAction}
                            </Button>
                          ) : <div />}
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-5 mb-2 flex justify-center">
                    <button
                      className="text-[13px] font-bold text-[#8ca0bf] hover:text-[#5b3df5] transition-colors"
                      onClick={() => {
                        if (onClose) onClose();
                        navigate(`/bookings/${bookingId}`);
                      }}
                    >
                      View Booking Details & Timeline →
                    </button>
                  </div>
                  </div>
                {details.status === "BLOCKED" && !details.allowedActions.includes("UNBLOCK") && (
                    <Button variant="secondary" size="sm" className="mt-3 font-bold text-[12px] flex items-center gap-2 rounded-lg px-3 shadow-sm text-cyan-700 hover:bg-cyan-50" onClick={doUnblock} disabled={unblocking}>
                        Unblock slot
                    </Button>
                )}
            </div>
        )}

        <ShareInfoModal
          isOpen={shareInfoOpen}
          onClose={() => setShareInfoOpen(false)}
          bookingUid={bookingId || ""}
        />

        <ManageLabelsModal
          isOpen={manageLabelsOpen}
          onClose={() => setManageLabelsOpen(false)}
          bookingUids={[bookingId || ""]}
          initialLabels={[]}
        />
    </div>
  );
}
