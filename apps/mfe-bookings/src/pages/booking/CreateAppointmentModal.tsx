import { useEffect, useState } from "react";
import {
  Button,
  DialogFooter,
  FormSection,
  Input,
  Select,
  Textarea,
} from "@jaldee/design-system";
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

/** Create Appointment Booking modal. */
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
    <form data-testid="bookings-create-appointment-form" onSubmit={handleConfirm} className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Create Appointment Booking</h2>
        <p className="mt-1 text-sm text-slate-500">Add booking details manually.</p>
      </header>
        <div className="max-h-[72vh] space-y-6 overflow-y-auto pr-1" data-testid="bookings-create-appointment-body">
          {/* Patient details */}
          <FormSection title="Patient details">
            <Input id="bk-patient-name" data-testid="bookings-create-appointment-patient-name-input" label="Patient name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            <Input id="bk-phone" data-testid="bookings-create-appointment-phone-input" label="Phone number" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input id="bk-email" data-testid="bookings-create-appointment-email-input" type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormSection>

          {/* Booking details */}
          <FormSection title="Booking details">
            <Select id="bk-calendar" testId="bookings-create-appointment-calendar-select" label="Calendar" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={calendars.map((c) => ({ value: c.uid, label: c.name }))} />
            <Select id="bk-service" testId="bookings-create-appointment-service-select" label="Service" required placeholder="Select service" value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} options={services.map((s) => ({ value: s.id, label: s.name }))} />
            <Select id="bk-doctor" testId="bookings-create-appointment-doctor-select" label="Assigned professional" required placeholder="Select professional" value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)} options={providers.map((p) => ({ value: p.id, label: p.name }))} />
            <Select id="bk-channel" testId="bookings-create-appointment-channel-select" label="Booking channel" value={channel} onChange={(e) => setChannel(e.target.value as BookingChannel)} options={["Online", "Walk-in", "Phone-in"].map((value) => ({ value, label: value }))} />
          </FormSection>

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
                    <Button variant="ghost" size="sm" id="bookings-create-appointment-prev-month" data-testid="bookings-create-appointment-prev-month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">&lt;</Button>
                    <Button variant="ghost" size="sm" id="bookings-create-appointment-next-month" data-testid="bookings-create-appointment-next-month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">&gt;</Button>
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
              <Select id="bk-schedule" testId="bookings-create-appointment-schedule-select" label="Select schedule" required value={scheduleUid} onChange={(e) => setScheduleUid(e.target.value)} options={[{ value: "sch-1", label: "Morning Clinic" }, { value: "sch-2", label: "Evening Clinic" }]} />

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

          <Textarea id="bk-notes" data-testid="bookings-create-appointment-notes-textarea" label="Staff notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="secondary" id="bookings-create-appointment-cancel" data-testid="bookings-create-appointment-cancel" onClick={closeModal}>Cancel</Button>
          <Button type="submit" id="bookings-create-appointment-confirm" data-testid="bookings-create-appointment-confirm" loading={submitting}>Confirm</Button>
        </DialogFooter>
      </form>
  );
}
