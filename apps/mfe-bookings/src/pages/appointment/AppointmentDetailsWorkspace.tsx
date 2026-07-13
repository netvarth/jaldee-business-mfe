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
import type { AllowedAction, BookingStatus } from "../../types";
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
  const [newStart, setNewStart] = useState("09:00");
  const [rescheduleSeries, setRescheduleSeries] = useState(false);

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
    if (!newDate) return;
    const start = buildOffsetDateTime(newDate, newStart, preference?.timezone);
    const [h, m] = newStart.split(":").map(Number);
    const endHour = h + Math.floor((m + 30) / 60);
    const endMinute = (m + 30) % 60;
    const end = buildOffsetDateTime(
      newDate,
      `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`,
      preference?.timezone,
    );
    const extra: ActionExtra = { newDate, newStartTime: start, newEndTime: end, rescheduleSeries };
    act("RESCHEDULE", extra);
    setReschedOpen(false);
    setRescheduleSeries(false);
  };

  const st = details ? STATUS_STYLE[details.status] : null;

  return (
    <div data-testid={`bookings-appointment-details-${bookingId}`} data-state={loading || !details ? "loading" : details.status} className="w-full max-w-[550px] bg-white rounded-[20px] flex flex-col shadow-2xl relative z-40 mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
                <h3 className="font-bold text-[18px] text-slate-900 leading-tight">Booking Details</h3>
                <p className="text-[13px] text-slate-500 font-medium mt-1">View and manage booking details.</p>
                <div className="flex items-center gap-2 mt-3">
                    <span className="inline-flex items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-600 font-bold text-[11px] px-2 py-0.5 rounded-md uppercase">
                        {details?.status === 'CONFIRMED' ? 'Confirmed' : details?.status || 'Unknown'}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-3">
                <Button variant="ghost" size="sm" iconOnly icon={<X size={20} />} onClick={onClose} className="rounded-full text-slate-400 hover:bg-slate-100 p-1 -mr-2 -mt-2" aria-label="Close booking details" />
                <span className="text-[13px] font-bold text-[#6C32FF]">Booking ID: {details?.encId ? `#${details.encId.substring(0,6)}` : '#1'}</span>
            </div>
        </div>

        {loading || !details ? (
            <div className="flex-1 flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C32FF]" />
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Patient Information */}
                <div className="px-6 py-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Patient Information</h4>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Patient Name</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.customerName || '—'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Phone Number</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.customerPhone || '+1 (555) 123-4567'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Email</p>
                                <p className="font-bold text-[13px] text-slate-900 truncate max-w-[140px]">{details.customerEmail || 'rohannair01@email.com'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Patient ID</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.customerReferenceNumber || 'PT-9853'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-100 my-2"></div>

                {/* Details Section */}
                <div className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Date</p>
                                <p className="font-bold text-[13px] text-slate-900">{fmtDate(details.bookingDate)}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Time</p>
                                <p className="font-bold text-[13px] text-slate-900">{formatIsoTime(details.startTime, preference?.timezone, "—")} - {formatIsoTime(details.endTime, preference?.timezone, "—")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Service Type</p>
                                <p className="font-bold text-[13px] text-slate-900">{details.serviceName || '—'}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 font-medium mb-0.5">Calendar</p>
                                <p className="font-bold text-[13px] text-slate-900 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-sm bg-[#6C32FF] block"></span>
                                    {details.calendarName || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Section */}
                <div className="px-6 py-2">
                    <h4 className="text-[11px] font-bold text-[#6C32FF] uppercase tracking-widest mb-3">User</h4>
                    <div className="bg-[#F8F5FF] rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#6C32FF] text-white flex items-center justify-center font-bold text-[15px] shrink-0">
                            {initials(details.userName)}
                        </div>
                        <div>
                            <p className="font-bold text-[15px] text-slate-900">{details.userName || '—'}</p>
                            <p className="text-[12px] font-medium text-slate-500">Doctor</p>
                        </div>
                    </div>
                </div>

                {/* Notes Section */}
                {((details.consumerNotes && details.consumerNotes.length > 0) || (details.userNotes && details.userNotes.length > 0)) && (
                    <div className="px-6 py-4 mb-4">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</h4>
                        <div className="space-y-2 text-[13px] text-slate-600 leading-relaxed">
                            {[...(details.consumerNotes ?? []), ...(details.userNotes ?? [])].map((note, idx) => (
                                <p key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2">{note}</p>
                            ))}
                        </div>
                    </div>
                )}
                
                {reschedOpen && (
                  <div className="px-6 mb-4">
                    <div data-testid={`bookings-appointment-details-${bookingId}-reschedule-panel`} data-state="open" className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      <label className="block text-xs font-bold text-slate-700">Reschedule to</label>
                      <div className="flex gap-2">
                        <Input id={`bookings-appointment-details-${bookingId}-reschedule-date`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-date`} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} containerClassName="flex-1" />
                        <TimePicker id={`bookings-appointment-details-${bookingId}-reschedule-time`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-time`} value={newStart} onChange={(e) => setNewStart(e.target.value)} fullWidth={false} />
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" id={`bookings-appointment-details-${bookingId}-reschedule-back`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-back`} onClick={() => setReschedOpen(false)}>Back</Button>
                        <Button size="sm" id={`bookings-appointment-details-${bookingId}-reschedule-confirm`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-confirm`} onClick={submitReschedule} disabled={!newDate} style={{ backgroundColor: '#6C32FF', color: 'white' }}>Confirm</Button>
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

                <div className="w-full h-px bg-slate-100 my-4"></div>

                {/* Payments Section */}
                <div className="px-6 pb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Payment</h4>
                        {finance?.invoiceNumber && <span className="text-[10px] font-mono text-slate-400">#{finance.invoiceNumber}</span>}
                    </div>
                    {finance ? (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due</p>
                                <p className="text-sm font-black text-slate-700">{fmtMoney(finance.amountDue)}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Paid</p>
                                <p className="text-sm font-black text-emerald-700">{fmtMoney(finance.amountPaid)}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                                <p className="text-sm font-black text-slate-700">{finance.paymentStatus ?? "—"}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[12px] text-slate-400 mb-3">No invoice created for this booking yet.</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setPayOpen((o) => !o)} disabled={paying} className="w-full">
                        Record Payment
                    </Button>
                    
                    {payOpen && (
                        <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
                            <div className="flex gap-2">
                                <Input type="number" min="0" step="0.01" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} containerClassName="flex-1" />
                                <select value={payMode} onChange={(e) => setPayMode(e.target.value as PaymentMode)} className="rounded-lg border border-purple-200 bg-white px-2 text-sm text-slate-700 focus:border-purple-300 focus:outline-none">
                                    {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            {payMode !== "Cash" && <Input placeholder="Transaction ID (optional)" value={payTxn} onChange={(e) => setPayTxn(e.target.value)} />}
                            <Textarea value={payNote} onChange={(e) => setPayNote(e.target.value)} rows={2} placeholder="Note (optional)" className="border-purple-200 focus:border-purple-300 w-full" />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setPayOpen(false)} disabled={paying}>Back</Button>
                                <Button size="sm" onClick={submitPayment} loading={paying} disabled={!payAmount || Number(payAmount) <= 0} style={{ backgroundColor: '#6C32FF', color: 'white' }}>Record</Button>
                            </div>
                        </div>
                    )}
                    
                    {payments.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {payments.map((p, idx) => (
                                <div key={p.uid ?? p.paymentRefId ?? idx} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{fmtMoney(p.amount, p.currency)}</p>
                                        <p className="text-xs text-slate-400">
                                            {p.mode ?? "—"}
                                            {p.paymentOn ? ` · ${new Date(p.paymentOn).toLocaleDateString()}` : ""}
                                            {paymentNoteText(p.note) ? ` · ${paymentNoteText(p.note)}` : ""}
                                        </p>
                                    </div>
                                    {(p.receiptNum || p.paymentRefId) && <span className="text-[10px] font-mono text-slate-400">{p.receiptNum ?? p.paymentRefId}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-slate-100 my-2"></div>

                {/* Attachments Section */}
                <div className="px-6 pb-4">
                    <AttachmentsPanel bookingUid={bookingId} />
                </div>

                <div className="w-full h-px bg-slate-100 my-2"></div>

                {/* Timeline Section */}
                <div className="px-6 pb-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Timeline</h4>
                    {timeline.length === 0 ? (
                        <p className="text-[12px] text-slate-400">No events yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {timeline.map((event, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-[#6C32FF] mt-1 shrink-0"></div>
                                        {idx < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1"></div>}
                                    </div>
                                    <div className="pb-2">
                                        <p className="font-bold text-slate-800 text-[13px]">{event.eventLabel}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {event.occurredAt ? new Date(event.occurredAt).toLocaleString() : ""}
                                            {event.actor ? ` · ${event.actor}` : ""}
                                        </p>
                                        {event.remarks && <p className="text-[11px] text-slate-500 mt-1">{event.remarks}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Footer Actions */}
        {!loading && details && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2 shrink-0 justify-end rounded-b-[20px]">
                {details.allowedActions.map((action) => {
                    const meta = ACTION_META[action];
                    const Icon = meta?.icon || Play;
                    const isBusy = acting === action;
                    return (
                        <Button
                            key={action}
                            variant="secondary"
                            size="sm"
                            className={cn("font-bold text-[12px] flex items-center gap-2 rounded-lg px-3 shadow-sm bg-white border-slate-200 text-slate-700", TONE[meta?.tone || "slate"])}
                            onClick={() => handleAction(action)}
                            disabled={!!acting}
                        >
                            {isBusy ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : <Icon size={14} />}
                            {meta?.label || action}
                        </Button>
                    );
                })}
                {details.status === "BLOCKED" && !details.allowedActions.includes("UNBLOCK") && (
                    <Button variant="secondary" size="sm" className="font-bold text-[12px] flex items-center gap-2 rounded-lg px-3 shadow-sm text-cyan-700 hover:bg-cyan-50" onClick={doUnblock} disabled={unblocking}>
                        Unblock slot
                    </Button>
                )}
            </div>
        )}
    </div>
  );
}
