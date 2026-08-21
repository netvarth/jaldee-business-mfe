import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Input, Textarea, TimePicker, cn } from "@jaldee/design-system";
import {
  X, Calendar, Clock, User, CheckCircle, RotateCw, Ban, CreditCard, Play, FileText, Trash, ArrowLeft, ChevronDown
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

export default function BookingDetailsPage() {
  const { uid: bookingId } = useParams<{ uid: string }>();
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
  const [payMode, setPayMode] = useState<PaymentMode>("Cash");
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
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Appointment Details</h1>
        </div>
        <div>
          <Button variant="outline" size="sm" className="font-bold border-slate-300 text-slate-700 bg-white shadow-sm flex items-center gap-2">Actions <ChevronDown size={14} /></Button>
        </div>
      </div>

      {loading || !details ? (
          <div className="flex-1 flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C32FF]" />
          </div>
      ) : (
          <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
              {/* Summary Card */}
              <div className="rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6">
                 {/* Left: Date */}
                 <div className="flex-shrink-0">
                    <div className="flex flex-col items-center justify-center rounded-[12px] bg-purple-50 text-purple-700 w-[100px] h-[100px] border border-purple-100">
                        <span className="text-[12px] font-bold uppercase">{fmtDate(details.bookingDate).split(" ")[0]}</span>
                        <span className="text-[32px] font-black leading-none my-1">{fmtDate(details.bookingDate).split(" ")[1]}</span>
                        <span className="text-[12px] font-bold uppercase">{fmtDate(details.bookingDate).split(" ")[2]}</span>
                    </div>
                 </div>

                 {/* Middle: Details */}
                 <div className="flex-1 border-r border-slate-100 pr-6">
                    <div className="grid grid-cols-2 gap-4 h-full">
                       <div className="flex flex-col justify-center gap-2">
                           <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">APPOINTMENT</p>
                               <p className="text-[14px] font-bold text-[#5b3df5]"># {details.encId ? String(details.encId).substring(0,8) : "1"}</p>
                           </div>
                           <div>
                               <p className="text-[14px] font-bold text-slate-800">{details.serviceName || "—"}</p>
                           </div>
                           <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-green-500"></div>
                               <span className="text-[12px] font-bold text-slate-600">{formatIsoTime(details.startTime, preference?.timezone, "—")} - {details.status}</span>
                           </div>
                       </div>
                       
                       <div className="flex flex-col justify-center gap-4">
                           <div className="flex items-center gap-3">
                               <div className="text-purple-600"><Clock size={16} /></div>
                               <div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TIMEZONE</p>
                                   <p className="text-[12px] font-bold text-slate-700">{preference?.timezone || '—'}</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-3">
                               <div className="text-purple-600"><FileText size={16} /></div>
                               <div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LOCATION</p>
                                   <p className="text-[12px] font-bold text-slate-700">{details.locationName || '—'}</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-3">
                               <div className="text-purple-600"><FileText size={16} /></div>
                               <div>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BOOKING ID</p>
                                   <p className="text-[12px] font-bold text-slate-700">{details.uid || '—'}</p>
                               </div>
                           </div>
                       </div>
                    </div>
                 </div>

                 {/* Right: Patient */}
                 <div className="flex-1 flex gap-4 pl-2 items-center">
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-2xl relative">
                        {initials(details.customerName)}
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-slate-800">{details.customerName || "—"}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Patient ID: {details.customerReferenceNumber || "—"}</span>
                        </div>
                        <p className="text-[12px] text-slate-500 font-medium mb-2">Male • 44 Years • B+</p>
                        <div className="flex gap-4 text-[12px] font-medium text-slate-600">
                            <span className="flex items-center gap-1"><FileText size={12}/> {details.consumerPhone || "—"}</span>
                            <span className="flex items-center gap-1"><FileText size={12}/> {details.consumerEmail || "—"}</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                           <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded flex items-center gap-1">ACTIVE <ChevronDown size={12}/></span>
                           <span className="px-2 py-1 bg-purple-900 text-white text-[10px] font-bold rounded">FAM</span>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-[16px] border border-slate-200 bg-white shadow-sm relative">
                 {(() => {
                    const invoiceAction = actionsToShow.find(a => a === "CREATE_INVOICE" || a === "VIEW_INVOICE");
                    const statusActions = actionsToShow.filter(a => a !== "CREATE_INVOICE" && a !== "VIEW_INVOICE");
                    
                    return (
                      <>
                        <div className="relative">
                          {statusActions.length > 0 && (
                            <Button variant="outline" onClick={() => setShowMobileActions(!showMobileActions)} disabled={!!acting} className="border-[#5b3df5] text-[#5b3df5] font-bold hover:bg-slate-50 h-10 rounded-lg flex items-center gap-2 shadow-sm">
                                Status change <ChevronDown size={14}/>
                            </Button>
                          )}
                          
                          {showMobileActions && statusActions.length > 0 && (
                              <div className="absolute top-[100%] left-0 mt-2 w-48 bg-white border border-slate-200 rounded-[14px] shadow-lg flex flex-col overflow-hidden z-50">
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
                        
                        {invoiceAction && (
                            <Button variant="outline" onClick={() => handleAction(invoiceAction)} disabled={!!acting} className="border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 h-10 rounded-lg flex items-center gap-2 shadow-sm">
                                {acting === invoiceAction ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div> : <FileText size={14}/>}
                                {ACTION_META[invoiceAction]?.label || invoiceAction}
                            </Button>
                        )}
                      </>
                    );
                 })()}
              </div>

              {/* Inline Action Containers (Cancel/Reschedule) */}
              {cancelOpen && (
                 <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3 shadow-sm">
                    <label className="block text-xs font-bold text-red-700">Cancellation reason</label>
                    <Textarea
                       value={cancelReason}
                       onChange={(e) => setCancelReason(e.target.value)}
                       rows={2}
                       className="border-red-200 focus:border-red-300 w-full"
                       placeholder="Why is this booking being cancelled?"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                       <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>Back</Button>
                       <Button variant="danger" size="sm" onClick={submitCancel}>Confirm Cancel</Button>
                    </div>
                 </div>
              )}
              {reschedOpen && (
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                    <label className="block text-xs font-bold text-slate-700">Reschedule to</label>
                    <div className="flex gap-2 mb-2">
                       <Input autoFocus type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setNewStart(""); setNewEnd(""); }} containerClassName="max-w-[250px]" />
                    </div>
                    {newDate && (
                       <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-700 mb-2">Available Slots</label>
                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                             {slotsLoading ? (
                                <div className="text-xs font-medium text-[#6C32FF] col-span-full p-4 text-center bg-[#f5f3ff] rounded-lg border border-[#eaddff]">Loading slots…</div>
                             ) : slots.length === 0 ? (
                                isHoliday ? (
                                   <div className="text-xs font-medium text-amber-700 col-span-full p-4 text-center bg-amber-50 rounded-lg border border-amber-100">Closed — {holidayMessage || "Holiday"}</div>
                                ) : (
                                   <div className="text-xs font-medium text-amber-700 col-span-full p-4 text-center bg-amber-50 rounded-lg border border-amber-100">No slots available for this date.</div>
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
                                           
                                           // We use global api variable here
                                           const res = await api.get(`/bookings/availability/validate-slot?${params.toString()}`) as any;
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
                       <Button variant="ghost" size="sm" onClick={() => setReschedOpen(false)}>Cancel</Button>
                       <Button size="sm" onClick={submitReschedule} disabled={!newDate || !newStart} style={{ backgroundColor: '#6C32FF', color: 'white' }}>Confirm</Button>
                    </div>
                 </div>
              )}

              {/* Content underneath */}
              <div className="mt-4">
                  <BookingHistoryTimeline bookingUid={bookingId} />
              </div>
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
