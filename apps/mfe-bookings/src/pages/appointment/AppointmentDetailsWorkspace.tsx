import { useEffect, useState } from "react";
import { Button, Input, Textarea, TimePicker, cn } from "@jaldee/design-system";
import {
  X, Calendar, Clock, User, CheckCircle, RotateCw, Ban, CreditCard, Play, FileText,
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
import type { AllowedAction, BookingStatus, Slot } from "../../types";
import { buildOffsetDateTime, formatIsoTime } from "../../utils/dateTime";
import AttachmentsPanel from "./AttachmentsPanel";

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
  CHECK_IN:        { label: "Check In",       icon: Play,        tone: "emerald" },
  MOVE_TO_WAITING: { label: "Move to Waiting",icon: Clock,       tone: "amber" },
  START:           { label: "Start",          icon: Play,        tone: "indigo" },
  COMPLETE:        { label: "Complete",       icon: CheckCircle, tone: "green" },
  CANCEL:          { label: "Cancel",         icon: Ban,         tone: "red" },
  NO_SHOW:         { label: "No Show",        icon: X,           tone: "slate" },
  RESCHEDULE:      { label: "Reschedule",     icon: RotateCw,    tone: "blue" },
  CREATE_INVOICE:  { label: "Create Invoice", icon: CreditCard,  tone: "purple" },
  EDIT:            { label: "Edit",           icon: FileText,    tone: "slate" },
  VIEW_SUMMARY:    { label: "Summary",        icon: FileText,    tone: "slate" },
  VIEW_INVOICE:    { label: "Invoice",        icon: CreditCard,  tone: "slate" },
  CREATE_FOLLOWUP: { label: "Follow-up",      icon: RotateCw,    tone: "emerald" },
  UNBLOCK:         { label: "Unblock",        icon: RotateCw,    tone: "cyan" },
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

export default function AppointmentDetailsWorkspace({ bookingId, onClose }: Props) {
  const {
    details, timeline, loading, acting, load, act,
    finance, payments, paying, createInvoice, recordPayment,
  } = useBookingDetails();
  const { preference } = useBookingPreferences();
  const { slots, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { unblockSlot, submitting: unblocking } = useBlockSlot();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("Cash");
  const [payNote, setPayNote] = useState("");
  const [payTxn, setPayTxn] = useState("");
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

  const handleAction = (action: AllowedAction) => {
    if (action === "CANCEL") { setCancelOpen((v) => !v); return; }
    if (action === "RESCHEDULE") { setReschedOpen((v) => !v); return; }
    if (action === "CREATE_INVOICE") { createInvoice(); return; }
    if (action === "UNBLOCK") { doUnblock(); return; }
    if (action === "VIEW_SUMMARY" || action === "VIEW_INVOICE" || action === "EDIT" || action === "CREATE_FOLLOWUP") return;
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

  const st = details ? STATUS_STYLE[details.status] : null;

  return (
    <div data-testid={`bookings-appointment-details-${bookingId}`} data-state={loading || !details ? "loading" : details.status} className="relative z-40 mx-4 flex max-h-[88vh] w-full max-w-[452px] flex-col overflow-hidden rounded-[28px] border border-[#dfe6f4] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]" onClick={(e) => e.stopPropagation()}>
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
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between border-b border-[#e7edf7] bg-[#fbfcff] px-6 py-3">
                    <span className={cn("inline-flex min-w-[106px] items-center justify-center rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]", st?.bg, st?.text)}>
                        {st?.label || details.status}
                    </span>
                    <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#4c37b6]">
                        Booking ID : {details.encId ? `#${details.encId.substring(0,6)}` : "#1"}
                    </span>
                </div>
                <div className="space-y-5 px-6 py-4">
                {/* Patient Information */}
                <div className="rounded-[20px] border border-[#dfe6f4] bg-[#fbfcff] p-4">
                    <h4 className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#91a4c2]">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Patient Name</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.customerName || '—'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Phone Number</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.customerPhone || '+1 (555) 123-4567'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Email</p>
                                <p className="font-bold text-[13px] text-slate-900 truncate max-w-[140px]">{details.customerEmail || 'rohannair01@email.com'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Patient ID</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.customerReferenceNumber || 'PT-9853'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Date</p>
                                <p className="font-bold text-[13px] text-slate-900">{fmtDate(details.bookingDate)}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Time</p>
                                <p className="font-bold text-[13px] text-slate-900">{formatIsoTime(details.startTime, preference?.timezone, "—")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Service Type</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.serviceName || '—'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            </div>
                            <div>
                                <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#91a4c2]">Calendar</p>
                                <p className="font-bold text-[13px] text-slate-900 flex items-center gap-1.5">
                                    <span className="block h-3 w-3 rounded-[4px] bg-[#12bce2]"></span>
                                    {details.calendarName || '—'}
                                </p>
                            </div>
                        </div>
                </div>

                {/* User Section */}
                <div className="rounded-[18px] border border-[#e7dcff] bg-[#fbf9ff] p-4">
                    <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#91a4c2]">User</h4>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5b3df5] text-[15px] font-extrabold text-white">
                            {initials(details.userName)}
                        </div>
                        <div>
                            <p className="font-bold text-[15px] text-slate-900">{details.userName || '—'}</p>
                            <p className="text-[12px] font-medium text-[#9aa8bf]">Doctor</p>
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                {((details.consumerNotes && details.consumerNotes.length > 0) || (details.userNotes && details.userNotes.length > 0)) && (
                    <div className="rounded-[18px] border border-[#dfe6f4] bg-[#fbfcff] p-4">
                        <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#91a4c2]">Notes</h4>
                        <div className="space-y-3 text-[13px] leading-7 text-[#42526d]">
                            {[...(details.consumerNotes ?? []), ...(details.userNotes ?? [])].map((note, idx) => (
                                <p key={idx}>{note}</p>
                            ))}
                        </div>
                    </div>
                )}
                
                {reschedOpen && (
                  <div className="px-6 mb-4">
                    <div data-testid={`bookings-appointment-details-${bookingId}-reschedule-panel`} data-state="open" className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <label className="block text-xs font-bold text-slate-700">Reschedule to</label>
                      <div className="flex gap-2 mb-2">
                        <Input id={`bookings-appointment-details-${bookingId}-reschedule-date`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-date`} type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setNewStart(""); setNewEnd(""); }} containerClassName="flex-1" />
                      </div>
                      
                      {newDate && (
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-700 mb-2">Available Slots</label>
                          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {slotsLoading ? (
                              <div className="text-xs font-medium text-[#6C32FF] col-span-4 p-4 text-center bg-[#f5f3ff] rounded-lg border border-[#eaddff]">Loading slots…</div>
                            ) : slots.length === 0 ? (
                              <div className="text-xs font-medium text-amber-700 col-span-4 p-4 text-center bg-amber-50 rounded-lg border border-amber-100">No slots available for this date.</div>
                            ) : (
                              slots.map((s) => {
                                const available = s.isAvailable !== false && (s.availableCount ?? 1) > 0;
                                const active = newStart === s.startTime;
                                const fmtSlot = (t: string) => t.split(":").slice(0, 2).join(":");
                                return (
                                  <button
                                    key={s.startTime}
                                    type="button"
                                    disabled={!available}
                                    onClick={() => { setNewStart(s.startTime); setNewEnd(s.endTime); }}
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
                        <Button variant="ghost" size="sm" id={`bookings-appointment-details-${bookingId}-reschedule-back`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-back`} onClick={() => setReschedOpen(false)}>Back</Button>
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

                {/* Attachments Section */}
                <div className="px-6 pb-4">
                    <AttachmentsPanel bookingUid={bookingId} />
                </div>
                </div>
            </div>
        )}

        {/* Footer Actions */}
        {!loading && details && (
            <div className="shrink-0 px-6 pb-6 pt-4">
                {details.allowedActions.includes("START") && (
                  <Button
                    variant="primary"
                    className="mb-3 h-11 w-full rounded-[14px] border-0 bg-[#5f3aa8] text-[14px] font-extrabold text-white shadow-[0_10px_24px_rgba(95,58,168,0.26)] hover:bg-[#533197]"
                    onClick={() => handleAction("START")}
                    disabled={!!acting}
                  >
                    Start Consultation
                  </Button>
                )}
                <div className="grid grid-cols-3 gap-2">
                {details.allowedActions.filter((action) => action !== "START").slice(0, 3).map((action) => {
                    const meta = ACTION_META[action];
                    const Icon = meta?.icon || Play;
                    const isBusy = acting === action;
                    return (
                        <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-11 rounded-[14px] border px-2 text-[12px] font-bold shadow-none",
                              action === "CANCEL"
                                ? "border-[#fecaca] bg-white text-[#ff2b2b] hover:bg-[#fff5f5]"
                                : "border-[#d8e0ee] bg-white text-[#334155] hover:bg-slate-50",
                            )}
                            onClick={() => handleAction(action)}
                            disabled={!!acting}
                        >
                            {isBusy ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : <Icon size={14} />}
                            {meta?.label || action}
                        </Button>
                    );
                })}
                </div>
                {details.status === "BLOCKED" && !details.allowedActions.includes("UNBLOCK") && (
                    <Button variant="secondary" size="sm" className="mt-3 font-bold text-[12px] flex items-center gap-2 rounded-lg px-3 shadow-sm text-cyan-700 hover:bg-cyan-50" onClick={doUnblock} disabled={unblocking}>
                        Unblock slot
                    </Button>
                )}
                <div className="pt-4 text-center">
                  <button type="button" onClick={() => setViewFullDetails((value) => !value)} className="text-[12px] font-bold text-[#8ca0bf] hover:text-[#5f3aa8]">
                    {viewFullDetails ? "Hide Additional Details" : "View Additional Details →"}
                  </button>
                </div>
            </div>
        )}
    </div>
  );
}
