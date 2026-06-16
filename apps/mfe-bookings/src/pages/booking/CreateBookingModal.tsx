import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useSlots } from "../../services/useSlots";
import { useCreateBooking } from "../../services/useCreateBooking";
import { mockUsers } from "../../mockData";
import { mockCalendars, mockSchedules } from "../../data/mockEntities";
import type { BookingChannel, Slot } from "../../types";
import BookingSuccess, { type BookingSummary } from "./BookingSuccess";

const CHANNELS: BookingChannel[] = ["Online", "Walk-in", "Phone-in"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtSlot(t: string): string {
  return t.split(":").slice(0, 2).join(":");
}

export default function CreateBookingModal() {
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { calendars } = useCalendars();
  const { services } = useServices();
  const { slots, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { createBooking, submitting } = useCreateBooking();

  const calendarOptions = calendars.length ? calendars : mockCalendars;
  const providerOptions = mockUsers;
  const scheduleOptions = mockSchedules;

  const [calendarUid, setCalendarUid] = useState("");
  const [serviceUid, setServiceUid] = useState("");
  const [providerUid, setProviderUid] = useState("");
  const [scheduleUid, setScheduleUid] = useState("");
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState<Slot | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<BookingChannel>("Online");
  const [notes, setNotes] = useState("");

  // Fetch slots once service + schedule + date are chosen.
  useEffect(() => {
    setSlot(null);
    if (serviceUid && scheduleUid && date) {
      fetchSlots({ serviceUid, scheduleUid, providerUid, date });
    } else {
      clearSlots();
    }
  }, [serviceUid, scheduleUid, providerUid, date, fetchSlots, clearSlots]);

  const selectClass =
    "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all";

  const canSubmit = useMemo(
    () =>
      calendarUid && serviceUid && providerUid && scheduleUid && date && slot && patientName && phone,
    [calendarUid, serviceUid, providerUid, scheduleUid, date, slot, patientName, phone]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) {
      showToast("Please select a time slot", "error");
      return;
    }
    if (!canSubmit) {
      showToast("Please complete all required fields", "error");
      return;
    }
    const ok = await createBooking({
      calendarUid,
      serviceUid,
      providerUid,
      scheduleUid,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      patientName,
      phone,
      email,
      channel,
      notes,
    });
    if (!ok) {
      showToast("Booking failed", "error");
      return;
    }
    const serviceName = services.find((s) => s.id === serviceUid)?.name ?? "Service";
    const providerName = providerOptions.find((p) => p.id === providerUid)?.name ?? "Provider";
    const dateLabel = new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const summary: BookingSummary = {
      patientName,
      serviceName,
      providerName,
      dateLabel,
      timeLabel: `${fmtSlot(slot.startTime)} – ${fmtSlot(slot.endTime)}`,
    };
    openModal(<BookingSuccess summary={summary} />);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
        <h3 className="text-lg font-bold text-slate-800">New Booking</h3>
        <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Appointment */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appointment</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Calendar</label>
              <select value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} className={selectClass}>
                <option value="">Select Calendar</option>
                {calendarOptions.map((c) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Service</label>
              <select value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} className={selectClass}>
                <option value="">Select Service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Provider</label>
              <select value={providerUid} onChange={(e) => setProviderUid(e.target.value)} className={selectClass}>
                <option value="">Select Provider</option>
                {providerOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Schedule</label>
              <select value={scheduleUid} onChange={(e) => setScheduleUid(e.target.value)} className={selectClass}>
                <option value="">Select Schedule</option>
                {scheduleOptions.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Date & Slots */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date & Time</h4>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClass} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Available Slots</label>
            {!serviceUid || !scheduleUid ? (
              <p className="text-sm text-slate-400 py-3">Select a service and schedule to view slots.</p>
            ) : slotsLoading ? (
              <p className="text-sm text-slate-400 py-3">Loading slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-400 py-3">No slots available for this selection.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => {
                  const available = s.isAvailable !== false && (s.availableCount ?? 1) > 0;
                  const selected = slot?.startTime === s.startTime;
                  return (
                    <button
                      key={s.startTime}
                      type="button"
                      disabled={!available}
                      onClick={() => setSlot(s)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-semibold border transition-all",
                        !available && "opacity-40 cursor-not-allowed line-through",
                        selected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
                      )}
                    >
                      {fmtSlot(s.startTime)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Patient */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient</h4>
          
          {/* Find existing patient block ported from Vanilla JS */}
          <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
            <label className="font-semibold mb-2 block text-sm text-slate-800">Find an existing patient</label>
            <div className="flex border border-slate-200 rounded-md overflow-hidden bg-white">
              <select className="border-none bg-slate-50 py-2 px-3 border-r border-slate-200 outline-none cursor-pointer text-slate-800 text-sm">
                <option value="all">All</option>
                <option value="name">Name</option>
                <option value="phone">Phone</option>
              </select>
              <input type="text" placeholder="Enter name or phone" className="flex-1 border-none py-2 px-3 outline-none w-full text-sm" />
              <button type="button" className="border-none bg-transparent py-2 px-3 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" x2="16.65" y1="21" y2="16.65" />
                </svg>
              </button>
            </div>
            <div className="mt-3">
              <button type="button" className="border border-blue-600 text-blue-600 bg-transparent py-1.5 px-4 rounded-md font-semibold text-xs hover:bg-blue-50 transition-colors">
                + Create New Patient
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg relative">
            <div className="col-span-full mb-1">
              <h4 className="text-sm font-bold text-slate-800 m-0">Patient Details</h4>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" className={selectClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Phone <span className="text-red-500">*</span></label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={selectClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={selectClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as BookingChannel)} className={selectClass}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-full mt-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className={cn(selectClass, "resize-none")} />
            </div>
          </div>
        </section>

        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
          <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mt-4">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !canSubmit} className="px-6 py-2 mt-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Confirm Booking
          </button>
        </div>
      </form>
    </div>
  );
}
