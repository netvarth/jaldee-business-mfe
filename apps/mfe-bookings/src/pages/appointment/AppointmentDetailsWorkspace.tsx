import { useEffect, useState } from "react";
import { cn } from "@jaldee/design-system";
import {
  X, Calendar, Clock, User, CheckCircle, RotateCw, Ban, CreditCard, Play, FileText,
} from "../../components/icons";
import { useBookingDetails, type ActionExtra } from "../../services/useBookingDetails";
import type { AllowedAction, BookingStatus } from "../../types";

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
};

const TONE: Record<string, string> = {
  emerald: "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700",
  amber:   "hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700",
  indigo:  "hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700",
  green:   "hover:bg-green-50 hover:border-green-200 hover:text-green-700",
  red:     "hover:bg-red-50 hover:border-red-200 hover:text-red-700",
  blue:    "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",
  purple:  "hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700",
  slate:   "hover:bg-slate-100 hover:border-slate-300 hover:text-slate-700",
};

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : iso;
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
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
  const { details, timeline, loading, acting, load, act } = useBookingDetails();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reschedOpen, setReschedOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("09:00");

  useEffect(() => {
    if (bookingId) {
      setCancelOpen(false);
      setReschedOpen(false);
      load(bookingId);
    }
  }, [bookingId, load]);

  if (!bookingId) return null;

  const handleAction = (action: AllowedAction) => {
    if (action === "CANCEL") { setCancelOpen((v) => !v); return; }
    if (action === "RESCHEDULE") { setReschedOpen((v) => !v); return; }
    if (action === "VIEW_SUMMARY" || action === "VIEW_INVOICE" || action === "EDIT" || action === "CREATE_FOLLOWUP") return;
    act(action);
  };

  const submitCancel = () => { act("CANCEL", { reason: cancelReason }); setCancelOpen(false); setCancelReason(""); };

  const submitReschedule = () => {
    if (!newDate) return;
    const start = `${newDate}T${newStart}:00+05:30`;
    const [h, m] = newStart.split(":").map(Number);
    const end = `${newDate}T${String(h).padStart(2, "0")}:${String(m + 30 >= 60 ? m + 30 - 60 : m + 30).padStart(2, "0")}:00+05:30`;
    const extra: ActionExtra = { newDate, newStartTime: start, newEndTime: end };
    act("RESCHEDULE", extra);
    setReschedOpen(false);
  };

  const st = details ? STATUS_STYLE[details.status] : null;

  return (
    <div data-testid={`bookings-appointment-details-${bookingId}`} data-state={loading || !details ? "loading" : details.status} className="w-full lg:w-[460px] bg-white lg:border-l border-slate-200 flex flex-col h-full shadow-2xl relative z-40">
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50 shrink-0" data-testid="bookings-appointment-details-header">
        <div>
          <h3 className="font-bold text-lg text-slate-800 leading-none">Booking Details</h3>
          {details?.encId && <p className="text-xs text-slate-400 font-mono mt-1">{details.encId}</p>}
        </div>
        <button id="bookings-appointment-details-close" data-testid="bookings-appointment-details-close" onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close booking details">
          <X size={20} />
        </button>
      </div>

      {loading || !details || !st ? (
        <div className="flex-1 flex items-center justify-center" data-testid="bookings-appointment-details-loading" data-state="loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div data-testid={`bookings-appointment-details-${bookingId}-status`} data-state={details.status} className={cn("border rounded-xl p-4 flex items-center justify-between", st.bg)}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">Status</p>
              <p className={cn("text-lg font-black", st.text)}>{st.label}</p>
            </div>
            {details.isInvoiceCreated && (
              <span className="text-xs font-bold px-2 py-1 bg-white/70 rounded-md text-slate-600">Invoiced</span>
            )}
          </div>

          {/* Patient */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Patient</h4>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                {initials(details.customerName)}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{details.customerName ?? "—"}</p>
                {details.customerReferenceNumber && (
                  <div className="mt-1 text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md inline-block">
                    ID: {details.customerReferenceNumber}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Appointment */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Appointment</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-700">
                <Calendar size={18} className="text-slate-400" />
                <span className="font-medium">{fmtDate(details.bookingDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Clock size={18} className="text-slate-400" />
                <span className="font-medium">{fmtTime(details.startTime)} – {fmtTime(details.endTime)}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <User size={18} className="text-slate-400" />
                <span className="font-medium">{details.userName ?? "—"}{details.serviceName ? ` · ${details.serviceName}` : ""}</span>
              </div>
              {details.calendarName && (
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <FileText size={16} className="text-slate-400" />
                  <span>{details.calendarName}{details.locationName ? ` · ${details.locationName}` : ""}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(details.userNotes?.length || details.consumerNotes?.length) ? (
            <>
              <hr className="border-slate-100" />
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Notes</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  {[...(details.consumerNotes ?? []), ...(details.userNotes ?? [])].map((n) => (
                    <p key={`${bookingId}-note-${n}`} data-testid={`bookings-appointment-details-${bookingId}-note-${testToken(n).slice(0, 40)}`} className="bg-slate-50 border border-slate-100 rounded-lg p-2">{n}</p>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <hr className="border-slate-100" />

          {/* Actions (driven by backend allowedActions) */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Actions</h4>
            {details.allowedActions.length === 0 ? (
              <p className="text-sm text-slate-400">No actions available for this status.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {details.allowedActions.map((a) => {
                  const meta = ACTION_META[a];
                  const Icon = meta.icon;
                  const busy = acting === a;
                  return (
                    <button
                      key={a}
                      id={`bookings-appointment-details-${bookingId}-action-${a.toLowerCase()}`}
                      data-testid={`bookings-appointment-details-${bookingId}-action-${a.toLowerCase()}`}
                      data-state={busy ? "busy" : "idle"}
                      onClick={() => handleAction(a)}
                      disabled={!!acting}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-xl transition-all disabled:opacity-50",
                        TONE[meta.tone]
                      )}
                    >
                      {busy ? (
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                      ) : (
                        <Icon size={22} />
                      )}
                      <span className="text-xs font-bold uppercase">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cancel reason inline */}
            {cancelOpen && (
              <div data-testid={`bookings-appointment-details-${bookingId}-cancel-panel`} data-state="open" className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                <label className="block text-xs font-bold text-red-700 mb-1">Cancellation reason</label>
                <textarea
                  id={`bookings-appointment-details-${bookingId}-cancel-reason`}
                  data-testid={`bookings-appointment-details-${bookingId}-cancel-reason`}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  placeholder="Why is this booking being cancelled?"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button id={`bookings-appointment-details-${bookingId}-cancel-back`} data-testid={`bookings-appointment-details-${bookingId}-cancel-back`} onClick={() => setCancelOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white rounded-lg">Back</button>
                  <button id={`bookings-appointment-details-${bookingId}-cancel-confirm`} data-testid={`bookings-appointment-details-${bookingId}-cancel-confirm`} onClick={submitCancel} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">Confirm Cancel</button>
                </div>
              </div>
            )}

            {/* Reschedule inline */}
            {reschedOpen && (
              <div data-testid={`bookings-appointment-details-${bookingId}-reschedule-panel`} data-state="open" className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-bold text-blue-700">Reschedule to</label>
                <div className="flex gap-2">
                  <input id={`bookings-appointment-details-${bookingId}-reschedule-date`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-date`} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <input id={`bookings-appointment-details-${bookingId}-reschedule-time`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-time`} type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div className="flex justify-end gap-2">
                  <button id={`bookings-appointment-details-${bookingId}-reschedule-back`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-back`} onClick={() => setReschedOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-white rounded-lg">Back</button>
                  <button id={`bookings-appointment-details-${bookingId}-reschedule-confirm`} data-testid={`bookings-appointment-details-${bookingId}-reschedule-confirm`} onClick={submitReschedule} disabled={!newDate} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">Confirm</button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Timeline</h4>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400">No events yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((ev, i) => (
                  <div key={`${ev.eventLabel}-${ev.occurredAt ?? ev.actor ?? ev.remarks ?? "event"}`} data-testid={`bookings-appointment-details-${bookingId}-timeline-${testToken(`${ev.eventLabel}-${ev.occurredAt ?? ev.actor ?? ev.remarks ?? "event"}`)}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="pb-2">
                      <p className="font-bold text-slate-800 text-sm">{ev.eventLabel}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ev.occurredAt ? new Date(ev.occurredAt).toLocaleString() : ""}{ev.actor ? ` · ${ev.actor}` : ""}
                      </p>
                      {ev.remarks && <p className="text-xs text-slate-500 mt-1">{ev.remarks}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
