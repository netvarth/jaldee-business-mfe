import { useEffect, useState } from "react";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useProviders } from "../../services/useProviders";
import { useSlots } from "../../services/useSlots";
import { useCreateBooking } from "../../services/useCreateBooking";
import { addCreatedBooking } from "../../data/sessionStore";
import type { BookingChannel, Slot } from "../../types";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtSlot(t: string): string {
  return t.split(":").slice(0, 2).join(":");
}

/** Faithful port of the vanilla #modal-create-booking ("Create Appointment Booking"). */
export default function CreateAppointmentModal() {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { calendars } = useCalendars();
  const { services } = useServices();
  const { providers } = useProviders();
  const { slots, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { createBooking, submitting } = useCreateBooking();

  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [calendarUid, setCalendarUid] = useState("");
  const [serviceUid, setServiceUid] = useState("");
  const [doctorUid, setDoctorUid] = useState("");
  const [channel, setChannel] = useState<BookingChannel>("Online");
  const [scheduleUid, setScheduleUid] = useState("sch-1");
  const [notes, setNotes] = useState("");

  const [month, setMonth] = useState(() => new Date(2026, 4, 1)); // May 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const dateStr = selectedDate ? iso(selectedDate) : "";

  // Fetch slots when service + schedule + date are chosen.
  useEffect(() => {
    setSlot(null);
    if (serviceUid && scheduleUid && dateStr) {
      fetchSlots({ serviceUid, scheduleUid, providerUid: doctorUid, date: dateStr });
    } else {
      clearSlots();
    }
  }, [serviceUid, scheduleUid, doctorUid, dateStr, fetchSlots, clearSlots]);

  // Build the month grid (Monday-first).
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !phone) { showToast("Patient name and phone are required", "error"); return; }
    if (!calendarUid || !serviceUid || !doctorUid || !scheduleUid || !selectedDate || !slot) {
      showToast("Please complete calendar, service, professional, date and slot", "error");
      return;
    }
    await createBooking({
      calendarUid, serviceUid, providerUid: doctorUid, scheduleUid,
      date: dateStr, startTime: slot.startTime, endTime: slot.endTime,
      patientName, phone, email, channel, notes,
    });
    // Show it on the calendar immediately.
    addCreatedBooking({
      id: `bk-${Date.now()}`, uid: `bk-${Date.now()}`,
      calendarId: calendarUid, calendarUid,
      serviceId: serviceUid, serviceUid,
      userId: doctorUid, userUid: doctorUid, providerId: doctorUid,
      patientName, customerName: patientName,
      startTime: fmtSlot(slot.startTime), endTime: fmtSlot(slot.endTime), time: fmtSlot(slot.startTime),
      status: channel === "Walk-in" ? "Checked-in" : "Confirmed",
      bookingDate: dateStr,
    });
    showToast("Appointment booked", "success");
    closeModal();
  };

  return (
    <div className="modal-card modal-lg" data-testid="bookings-create-appointment-modal" data-state={submitting ? "submitting" : "idle"} style={{ maxWidth: 900, width: "95%" }}>
      <div className="modal-header" data-testid="bookings-create-appointment-modal-header">
        <div>
          <h3 className="modal-title">Create Appointment Booking</h3>
          <p className="modal-subtitle">Add a new booking details manually</p>
        </div>
        <button id="bookings-create-appointment-close" data-testid="bookings-create-appointment-close" className="modal-close-btn" onClick={closeModal} aria-label="Close appointment booking">&times;</button>
      </div>

      <form data-testid="bookings-create-appointment-form" onSubmit={handleConfirm}>
        <div className="modal-body bg-light" data-testid="bookings-create-appointment-body" style={{ padding: 24, maxHeight: "80vh", overflowY: "auto" }}>
          {/* Patient details */}
          <div style={{ marginBottom: 24, padding: 16, background: "#F8FAFC", borderRadius: 8, border: "1px solid var(--border-color)" }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: 14, color: "var(--dark-text)" }}>Patient Details</h4>
            <div className="form-group mb-2">
              <label htmlFor="bk-patient-name">Patient Name <span className="required">*</span></label>
              <input type="text" id="bk-patient-name" data-testid="bookings-create-appointment-patient-name-input" placeholder="Patient full name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bk-phone">Phone Number <span className="required">*</span></label>
                <input type="text" id="bk-phone" data-testid="bookings-create-appointment-phone-input" placeholder="+91 98765 43210" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="bk-email">Email Address</label>
                <input type="email" id="bk-email" data-testid="bookings-create-appointment-email-input" placeholder="patient@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Booking details */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bk-calendar">Calendar <span className="required">*</span></label>
              <select id="bk-calendar" data-testid="bookings-create-appointment-calendar-select" className="custom-select" required value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)}>
                <option value="">Select Calendar</option>
                {calendars.map((c) => <option key={c.uid} value={c.uid}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="bk-service">Service <span className="required">*</span></label>
              <select id="bk-service" data-testid="bookings-create-appointment-service-select" className="custom-select" required value={serviceUid} onChange={(e) => setServiceUid(e.target.value)}>
                <option value="">Select Service</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row mb-4">
            <div className="form-group">
              <label htmlFor="bk-doctor">Assigned Professional <span className="required">*</span></label>
              <select id="bk-doctor" data-testid="bookings-create-appointment-doctor-select" className="custom-select" required value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)}>
                <option value="">Select Professional</option>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="bk-channel">Booking Channel</label>
              <select id="bk-channel" data-testid="bookings-create-appointment-channel-select" className="custom-select" value={channel} onChange={(e) => setChannel(e.target.value as BookingChannel)}>
                <option value="Online">Online</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Phone-in">Phone-in</option>
              </select>
            </div>
          </div>

          {selectedDate && (
            <div className="info-banner mb-4" data-testid="bookings-create-appointment-selected-date" style={{ background: "#F8FAFC", border: "1px solid var(--border-color)", padding: 12, borderRadius: 8, textAlign: "center", fontWeight: 500, color: "var(--dark-text)" }}>
              Selected Date : {selectedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          )}

          <div className="booking-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
            {/* Date picker */}
            <div className="date-picker-section">
              <label>Appointment Date <span className="required">*</span></label>
              <div className="calendar-picker mt-2" style={{ background: "white", border: "1px solid var(--border-color)", borderRadius: 8, padding: 16 }}>
                <div className="calendar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: "var(--primary-color)" }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</div>
                  <div className="calendar-nav">
                    <button type="button" id="bookings-create-appointment-prev-month" data-testid="bookings-create-appointment-prev-month" className="btn-icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">&lt;</button>
                    <button type="button" id="bookings-create-appointment-next-month" data-testid="bookings-create-appointment-next-month" className="btn-icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">&gt;</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: 12, color: "var(--light-text)", marginBottom: 8 }}>
                  {WEEK.map((w) => <div key={w}>{w}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
                  {cells.map((d, i) => d === null ? <div key={`empty-${month.getFullYear()}-${month.getMonth()}-${i}`} /> : (
                    <button
                      key={iso(d)}
                      type="button"
                      id={`bookings-create-appointment-date-${iso(d)}`}
                      data-testid={`bookings-create-appointment-date-${iso(d)}`}
                      data-active={selectedDate && iso(selectedDate) === iso(d) ? "true" : "false"}
                      onClick={() => setSelectedDate(d)}
                      style={{
                        padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                        background: selectedDate && iso(selectedDate) === iso(d) ? "var(--primary-color)" : "transparent",
                        color: selectedDate && iso(selectedDate) === iso(d) ? "white" : "var(--dark-text)",
                        fontWeight: selectedDate && iso(selectedDate) === iso(d) ? 700 : 400,
                      }}
                    >
                      {d.getDate()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule + slots */}
            <div className="slots-section">
              <div className="form-group mb-4">
                <label htmlFor="bk-schedule">Select Schedule <span className="required">*</span></label>
                <select id="bk-schedule" data-testid="bookings-create-appointment-schedule-select" className="custom-select" required value={scheduleUid} onChange={(e) => setScheduleUid(e.target.value)}>
                  <option value="sch-1">Morning Clinic</option>
                  <option value="sch-2">Evening Clinic</option>
                </select>
              </div>

              <label>Select Slots <span className="required">*</span></label>
              <div className="slots-grid mt-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 8 }}>
                {!serviceUid || !selectedDate ? (
                  <div className="text-sm text-gray" style={{ gridColumn: "span 4" }}>Please select a date, service, and schedule to view slots.</div>
                ) : slotsLoading ? (
                  <div className="text-sm text-gray" style={{ gridColumn: "span 4" }}>Loading slots…</div>
                ) : slots.length === 0 ? (
                  <div className="text-sm text-gray" style={{ gridColumn: "span 4" }}>No slots available for this selection.</div>
                ) : (
                  slots.map((s) => {
                    const available = s.isAvailable !== false && (s.availableCount ?? 1) > 0;
                    const active = slot?.startTime === s.startTime;
                    return (
                      <button
                        key={s.startTime}
                        type="button"
                        id={`bookings-create-appointment-slot-${s.startTime.replace(/[^0-9]/g, "")}`}
                        data-testid={`bookings-create-appointment-slot-${s.startTime.replace(/[^0-9]/g, "")}`}
                        data-active={active ? "true" : "false"}
                        data-state={available ? "available" : "unavailable"}
                        className={`slot-btn${active ? " selected" : ""}`}
                        disabled={!available}
                        onClick={() => setSlot(s)}
                      >
                        {fmtSlot(s.startTime)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="form-group mt-4">
            <label htmlFor="bk-notes">Staff Notes</label>
            <textarea id="bk-notes" data-testid="bookings-create-appointment-notes-textarea" rows={3} placeholder="Enter notes here..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end", gap: 16 }}>
          <button type="button" id="bookings-create-appointment-cancel" data-testid="bookings-create-appointment-cancel" className="btn btn-secondary" style={{ width: 120 }} onClick={closeModal}>CANCEL</button>
          <button type="submit" id="bookings-create-appointment-confirm" data-testid="bookings-create-appointment-confirm" className="btn btn-primary" style={{ width: 120, background: "#3B0764", borderColor: "#3B0764" }} disabled={submitting} data-state={submitting ? "submitting" : "idle"}>
            {submitting ? "…" : "CONFIRM"}
          </button>
        </div>
      </form>
    </div>
  );
}
