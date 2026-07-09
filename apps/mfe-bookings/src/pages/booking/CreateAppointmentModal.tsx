import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Combobox,
  EmptyState,
  DialogFooter,
  FormSection,
  Input,
  Select,
  Textarea,
  Checkbox,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useProviders } from "../../services/useProviders";
import { useSlots } from "../../services/useSlots";
import { useCreateBooking } from "../../services/useCreateBooking";
import { useCustomerSearch } from "../../services/useCustomerSearch";
import { addCreatedBooking } from "../../data/sessionStore";
import type { BookingChannel, CustomerSearchResult, Slot } from "../../types";

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtSlot(t: string): string {
  return t.split(":").slice(0, 2).join(":");
}

function buildCustomerLabel(customer: CustomerSearchResult): string {
  const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return fullName || customer.phone || customer.email || "Customer";
}

function buildCustomerDescription(customer: CustomerSearchResult): string {
  return [
    customer.phone,
    customer.email,
    customer.gender,
    customer.dateOfBirth,
  ].filter(Boolean).join(" · ");
}

function mapCustomerDetails(customer: CustomerSearchResult) {
  return {
    uid: customer.uid,
    firstName: customer.firstName,
    lastName: customer.lastName,
    primaryNumber: customer.phone,
    email: customer.email,
    gender: customer.gender,
    dob: customer.dateOfBirth,
  };
}

interface CreateAppointmentModalProps {
  initialDate?: Date;
  initialTime?: string;
  initialProviderUid?: string;
  initialCalendarUid?: string;
}

/** Create Appointment Booking modal. */
export default function CreateAppointmentModal({
  initialDate,
  initialTime,
  initialProviderUid,
  initialCalendarUid,
}: CreateAppointmentModalProps = {}) {
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const { calendars, searchSchedules } = useCalendars();
  const { services } = useServices();
  const { providers } = useProviders();
  const { slots, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { createBooking, submitting } = useCreateBooking();
  const { results: customerResults, loading: customerSearchLoading, error: customerSearchError, searchCustomers, clearResults } = useCustomerSearch();

  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerUid, setSelectedCustomerUid] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [calendarUid, setCalendarUid] = useState(initialCalendarUid || "");
  const [serviceUid, setServiceUid] = useState("");
  const [doctorUid, setDoctorUid] = useState(initialProviderUid || "");
  const [channel, setChannel] = useState<BookingChannel>("Online");
  const [scheduleUid, setScheduleUid] = useState("");
  const [notes, setNotes] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState<{ value: string; label: string }[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [interval, setIntervalVal] = useState(1);
  const [until, setUntil] = useState("");

  const [month, setMonth] = useState(() => initialDate ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1) : new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [slot, setSlot] = useState<Slot | null>(initialTime ? { startTime: initialTime, endTime: "23:59", availableCount: 1, isAvailable: true } : null);

  const dateStr = selectedDate ? iso(selectedDate) : "";
  const resolvedPatientName = patientName.trim() || (selectedCustomer ? buildCustomerLabel(selectedCustomer) : "");
  const resolvedPhone = phone.trim() || selectedCustomer?.phone || "";
  const resolvedEmail = email.trim() || selectedCustomer?.email || "";
  const selectedCalendar = useMemo(
    () => calendars.find((calendar) => calendar.uid === calendarUid),
    [calendarUid, calendars],
  );
  const selectedProviderUid = useMemo(() => {
    const matchedProvider = providers.find((provider) =>
      provider.uid === doctorUid || provider.id === doctorUid || provider.name === doctorUid,
    );
    const resolved = matchedProvider?.uid ?? matchedProvider?.id ?? doctorUid;
    return UUID_PATTERN.test(resolved) ? resolved : "";
  }, [doctorUid, providers]);
  const availableServices = useMemo(() => {
    const assignedServices = new Set(selectedCalendar?.services ?? []);
    if (assignedServices.size === 0) {
      return calendarUid ? [] : services;
    }

    return services.filter((service) =>
      assignedServices.has(service.uid ?? service.id) || assignedServices.has(service.id),
    );
  }, [calendarUid, selectedCalendar?.services, services]);
  const serviceOptions = useMemo(
    () => availableServices.map((service) => ({ value: service.uid ?? service.id, label: service.name })),
    [availableServices],
  );
  const customerOptions = useMemo(
    () =>
      customerResults.map((customer) => ({
        value: customer.uid,
        label: buildCustomerLabel(customer),
        description: buildCustomerDescription(customer),
      })),
    [customerResults],
  );

  useEffect(() => {
    const trimmedQuery = customerQuery.trim();
    if (!trimmedQuery || selectedCustomer) {
      if (!trimmedQuery) {
        clearResults();
      }
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void searchCustomers(trimmedQuery, controller.signal);
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [clearResults, customerQuery, searchCustomers, selectedCustomer]);

  const applySelectedCustomer = (customer: CustomerSearchResult | null) => {
    setSelectedCustomer(customer);
    setSelectedCustomerUid(customer?.uid ?? "");
    setCustomerQuery(customer ? buildCustomerLabel(customer) : "");
    setPatientName(customer ? buildCustomerLabel(customer) : "");
    setPhone(customer?.phone ?? "");
    setEmail(customer?.email ?? "");
  };

  // Fetch slots when service + schedule + date are chosen.
  useEffect(() => {
    setSlot(null);
    if (serviceUid && scheduleUid && dateStr) {
      fetchSlots({ serviceUid, scheduleUid, date: dateStr });
    } else {
      clearSlots();
    }
  }, [serviceUid, scheduleUid, dateStr, fetchSlots, clearSlots]);

  // Handle Walk-in logic
  useEffect(() => {
    if (channel === "Walk-in") {
      const today = new Date();
      if (!selectedDate || iso(selectedDate) !== iso(today)) {
        setSelectedDate(today);
        setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      }
    }
  }, [channel, selectedDate]);

  useEffect(() => {
    setServiceUid("");
    setScheduleUid("");
    setSlot(null);
    clearSlots();

    if (!calendarUid) {
      setScheduleOptions([]);
      setSchedulesLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSchedules() {
      setSchedulesLoading(true);
      try {
        const schedules = await searchSchedules(calendarUid);
        if (cancelled) return;
        setScheduleOptions(
          schedules.map((schedule) => ({ value: schedule.uid, label: schedule.name })),
        );
      } catch {
        if (cancelled) return;
        setScheduleOptions([]);
      } finally {
        if (!cancelled) {
          setSchedulesLoading(false);
        }
      }
    }

    loadSchedules();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, clearSlots, searchSchedules]);

  useEffect(() => {
    if (serviceUid && !serviceOptions.some((service) => service.value === serviceUid)) {
      setServiceUid("");
      setSlot(null);
      clearSlots();
    }
  }, [clearSlots, serviceOptions, serviceUid]);

  // Build the month grid (Monday-first).
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedPatientName) { showToast("Patient name is required", "error"); return; }
    if (!calendarUid || !serviceUid || !selectedProviderUid || !scheduleUid || !selectedDate || !slot) {
      showToast("Please complete calendar, service, professional, date and slot", "error");
      return;
    }
    await createBooking({
      calendarUid, serviceUid, providerUid: selectedProviderUid, scheduleUid,
      date: dateStr, startTime: slot.startTime, endTime: slot.endTime,
      patientName: resolvedPatientName, phone: resolvedPhone, email: resolvedEmail, channel, notes,
      customerDetails: selectedCustomer ? mapCustomerDetails(selectedCustomer) : undefined,
      ...(isRecurring && until ? { recurringRule: { frequency, interval, until } } : {}),
    });
    // Show it on the calendar immediately.
    addCreatedBooking({
      id: `bk-${Date.now()}`, uid: `bk-${Date.now()}`,
      calendarId: calendarUid, calendarUid,
      serviceId: serviceUid, serviceUid,
      userId: selectedProviderUid, userUid: selectedProviderUid, providerId: selectedProviderUid,
      patientName: resolvedPatientName, customerName: resolvedPatientName,
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
            <div className="col-span-full">
              <Combobox
                id="bk-customer-search"
                data-testid="bookings-create-appointment-customer-search"
                label="Search existing customer"
                placeholder="Search customer"
                searchPlaceholder="Search by name, phone, or email"
                emptyMessage={customerSearchError ? customerSearchError : "No customers found"}
                options={customerOptions}
                value={selectedCustomerUid}
                searchValue={customerQuery}
                loading={customerSearchLoading}
                onSearchChange={(value) => {
                  setCustomerQuery(value);
                  if (!value.trim()) {
                    applySelectedCustomer(null);
                    clearResults();
                  }
                }}
                onValueChange={(value) => {
                  const customer = customerResults.find((item) => item.uid === value) ?? null;
                  applySelectedCustomer(customer);
                }}
                hint={selectedCustomer ? "Existing customer selected. Details are locked from the record." : "Search by customer name, phone number, or email."}
              />
            </div>
            <Input id="bk-patient-name" data-testid="bookings-create-appointment-patient-name-input" label="Patient name" required value={patientName} readOnly={Boolean(selectedCustomer)} onChange={(e) => setPatientName(e.target.value)} />
            <Input id="bk-phone" data-testid="bookings-create-appointment-phone-input" label="Phone number" value={phone} readOnly={Boolean(selectedCustomer)} onChange={(e) => setPhone(e.target.value)} />
            <Input id="bk-email" data-testid="bookings-create-appointment-email-input" type="email" label="Email address" value={email} readOnly={Boolean(selectedCustomer)} onChange={(e) => setEmail(e.target.value)} />
          </FormSection>
          {customerQuery.trim() && !selectedCustomer && !customerSearchLoading && customerOptions.length === 0 ? (
            <EmptyState title="No customers found" description="Try another name, phone number, or email address." />
          ) : null}

          {/* Booking details */}
          <FormSection title="Booking details">
            <Select id="bk-calendar" testId="bookings-create-appointment-calendar-select" label="Calendar" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={calendars.map((c) => ({ value: c.uid, label: c.name }))} />
            <Select id="bk-service" testId="bookings-create-appointment-service-select" label="Service" required placeholder={calendarUid ? "Select service" : "Select calendar first"} value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} options={serviceOptions} />
            <Select id="bk-doctor" testId="bookings-create-appointment-doctor-select" label="Assigned professional" required placeholder="Select professional" value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)} options={providers.map((p) => ({ value: p.uid ?? p.id, label: p.name, disabled: !UUID_PATTERN.test(p.uid ?? p.id ?? "") }))} />
            <Select id="bk-channel" testId="bookings-create-appointment-channel-select" label="Booking channel" value={channel} onChange={(e) => setChannel(e.target.value as BookingChannel)} options={["Online", "Walk-in", "Phone-in", "IVR"].map((value) => ({ value, label: value }))} />
          </FormSection>

          {selectedDate && (
            <div className="info-banner mb-4" data-testid="bookings-create-appointment-selected-date" style={{ background: "#F8FAFC", border: "1px solid var(--border-color)", padding: 12, borderRadius: 8, textAlign: "center", fontWeight: 500, color: "var(--dark-text)" }}>
              Selected Date : {selectedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          )}

          <div className="booking-grid" style={{ display: "grid", gridTemplateColumns: channel === "Walk-in" ? "1fr" : "300px 1fr", gap: 24 }}>
            {/* Date picker */}
            {channel !== "Walk-in" && (
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
            )}

            {/* Schedule + slots */}
            <div className="slots-section">
              <Select id="bk-schedule" testId="bookings-create-appointment-schedule-select" label="Select schedule" required placeholder={calendarUid ? (schedulesLoading ? "Loading schedules..." : "Select schedule") : "Select calendar first"} value={scheduleUid} onChange={(e) => setScheduleUid(e.target.value)} options={scheduleOptions} />

              <label>Select Slots <span className="required">*</span></label>
              <div className="slots-grid mt-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 8 }}>
                {!calendarUid ? (
                  <div className="text-sm text-gray" style={{ gridColumn: "span 4" }}>Please select a calendar to load services and schedules.</div>
                ) : !serviceUid || !scheduleUid || !selectedDate ? (
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

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
            <Checkbox 
              label="Repeat Appointment" 
              checked={isRecurring} 
              onChange={e => setIsRecurring(e.target.checked)} 
              id="bk-recurring-toggle" 
              data-testid="bk-recurring-toggle"
            />
            {isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Select label="Frequency" value={frequency} onChange={e => setFrequency(e.target.value as any)} options={[
                  { value: "DAILY", label: "Daily" },
                  { value: "WEEKLY", label: "Weekly" },
                  { value: "MONTHLY", label: "Monthly" }
                ]} />
                <Input type="number" min={1} label="Interval" value={interval} onChange={e => setIntervalVal(Number(e.target.value))} />
                <Input type="date" label="Repeat Until" required value={until} onChange={e => setUntil(e.target.value)} />
              </div>
            )}
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
