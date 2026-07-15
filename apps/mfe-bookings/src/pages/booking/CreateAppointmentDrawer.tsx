import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Combobox,
  EmptyState,
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
import { useCreateSeriesBooking } from "../../services/useCreateSeriesBooking";
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

interface CreateAppointmentDrawerProps {
  initialDate?: Date;
  initialTime?: string;
  initialProviderUid?: string;
  initialCalendarUid?: string;
}

export default function CreateAppointmentDrawer({
  initialDate,
  initialTime,
  initialProviderUid,
  initialCalendarUid,
}: CreateAppointmentDrawerProps = {}) {
  const { closeDrawer } = useModal();
  const { showToast } = useToast();
  const { calendars, searchSchedules } = useCalendars();
  const { services } = useServices();
  const { providers } = useProviders();
  const { slots, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { createBooking, submitting } = useCreateBooking();
  const { createSeries, submitting: seriesSubmitting } = useCreateSeriesBooking();
  const { results: customerResults, loading: customerSearchLoading, error: customerSearchError, searchCustomers, clearResults } = useCustomerSearch();

  const [step, setStep] = useState(1);
  const [schedulingMode, setSchedulingMode] = useState<"book" | "block">("book");

  // Step 1: Book Appointment State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerUid, setSelectedCustomerUid] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  
  const [calendarUid, setCalendarUid] = useState(initialCalendarUid || "");
  const [serviceUid, setServiceUid] = useState("");
  const [doctorUid, setDoctorUid] = useState(initialProviderUid || "");
  const [scheduleUid, setScheduleUid] = useState("");
  
  // Step 1: Slot Block State
  const [blockReason, setBlockReason] = useState("");
  const [blockDurationType, setBlockDurationType] = useState<"single" | "full">("single");

  // Step 2 State
  const [month, setMonth] = useState(() => initialDate ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1) : new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [slot, setSlot] = useState<Slot | null>(initialTime ? { startTime: initialTime, endTime: "23:59", availableCount: 1, isAvailable: true } : null);
  const [notes, setNotes] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState<{ value: string; label: string }[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [interval, setIntervalVal] = useState(1);
  const [until, setUntil] = useState("");

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

  const selectedProvider = useMemo(() => providers.find(p => p.uid === selectedProviderUid || p.id === selectedProviderUid), [providers, selectedProviderUid]);
  const selectedService = useMemo(() => services.find(s => s.uid === serviceUid || s.id === serviceUid), [services, serviceUid]);
  
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

  useEffect(() => {
    setSlot(null);
    if (serviceUid && scheduleUid && dateStr) {
      fetchSlots({ serviceUid, scheduleUid, calendarUid, date: dateStr });
    } else {
      clearSlots();
    }
  }, [serviceUid, scheduleUid, dateStr, fetchSlots, clearSlots]);

  useEffect(() => {
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

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7; 
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  const handleNextStep = () => {
    if (schedulingMode === "book") {
      if (!selectedCustomer && !patientName.trim()) {
        showToast("Please select a patient", "error");
        return;
      }
      if (!calendarUid || !serviceUid || !doctorUid) {
        showToast("Please select Calendar, Service and Assigned User", "error");
        return;
      }
    } else {
      if (!blockReason || !calendarUid || !doctorUid) {
        showToast("Please complete all block details", "error");
        return;
      }
    }
    setStep(2);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleNextStep();
      return;
    }

    if (schedulingMode === "book") {
      if (!resolvedPatientName) { showToast("Patient name is required", "error"); return; }
      if (!calendarUid || !serviceUid || !selectedProviderUid || !scheduleUid || !selectedDate || !slot) {
        showToast("Please complete calendar, service, professional, date and slot", "error");
        return;
      }

      if (isRecurring) {
        if (!until) { showToast("Please pick a 'Repeat Until' date", "error"); return; }
        if (!selectedCustomer?.uid) {
          showToast("Recurring bookings require an existing customer. Search and select one first.", "error");
          return;
        }
        try {
          const outcome = await createSeries({
            customerId: selectedCustomer.uid,
            serviceUid,
            scheduleUid,
            providerUid: selectedProviderUid,
            channel: "WALK_IN",
            startTime: slot.startTime,
            endTime: slot.endTime,
            startDate: dateStr,
            frequency,
            interval,
            until,
          });
          const created = outcome.results.filter((r) => r.created);
          const failed = outcome.results.filter((r) => !r.created);
          created.forEach((r, i) => {
            addCreatedBooking({
              id: `bk-${Date.now()}-${i}`, uid: `bk-${Date.now()}-${i}`,
              calendarId: calendarUid, calendarUid,
              serviceId: serviceUid, serviceUid,
              userId: selectedProviderUid, userUid: selectedProviderUid, providerId: selectedProviderUid,
              patientName: resolvedPatientName, customerName: resolvedPatientName,
              startTime: fmtSlot(slot.startTime), endTime: fmtSlot(slot.endTime), time: fmtSlot(slot.startTime),
              status: "Checked-in",
              bookingDate: r.date ?? dateStr,
            });
          });
          if (created.length === 0) {
            showToast(`No occurrences could be booked${failed[0]?.reason ? `: ${failed[0].reason}` : "."}`, "error");
            return;
          }
          showToast(
            failed.length === 0
              ? `Booked ${created.length} recurring appointments`
              : `Booked ${created.length} of ${outcome.results.length} — ${failed.length} slot(s) unavailable`,
            failed.length === 0 ? "success" : "info",
          );
          closeDrawer();
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Could not create the recurring series", "error");
        }
        return;
      }

      await createBooking({
        calendarUid, serviceUid, providerUid: selectedProviderUid, scheduleUid,
        date: dateStr, startTime: slot.startTime, endTime: slot.endTime,
        patientName: resolvedPatientName, phone: resolvedPhone, email: resolvedEmail, channel: "WALK_IN", notes,
        customerDetails: selectedCustomer ? mapCustomerDetails(selectedCustomer) : undefined,
      });
      addCreatedBooking({
        id: `bk-${Date.now()}`, uid: `bk-${Date.now()}`,
        calendarId: calendarUid, calendarUid,
        serviceId: serviceUid, serviceUid,
        userId: selectedProviderUid, userUid: selectedProviderUid, providerId: selectedProviderUid,
        patientName: resolvedPatientName, customerName: resolvedPatientName,
        startTime: fmtSlot(slot.startTime), endTime: fmtSlot(slot.endTime), time: fmtSlot(slot.startTime),
        status: "Checked-in",
        bookingDate: dateStr,
      });
      showToast("Appointment booked", "success");
      closeDrawer();
    } else {
      // Slot Block logic...
      showToast("Slot Block created successfully", "success");
      closeDrawer();
    }
  };

  return (
    <form onSubmit={handleConfirm} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8EAF3] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] text-[#7c3aed] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Configure Booking Flow</h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete the 2-step process to finalize scheduling</p>
          </div>
        </div>
        <button type="button" onClick={closeDrawer} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 space-y-6">
        {/* Stepper */}
        <div className="flex items-center">
          <div className={`flex flex-col ${step === 1 ? 'opacity-100' : 'opacity-50'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-[#31028C] text-white' : 'bg-slate-200 text-slate-600'}`}>1</div>
              <span className="text-sm font-semibold text-slate-900">Step 1: Selection</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">Configure services & profiles</p>
          </div>
          <div className="flex-1 h-px bg-slate-200 mx-4"></div>
          <div className={`flex flex-col ${step === 2 ? 'opacity-100' : 'opacity-50'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-[#31028C] text-white' : 'bg-slate-200 text-slate-600'}`}>2</div>
              <span className="text-sm font-semibold text-slate-900">Step 2: Confirmation</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-8">Choose slots & confirm bill</p>
          </div>
        </div>

        {step === 1 ? (
          <>
            {/* Scheduling Mode */}
            <div>
              <label className="text-xs font-bold text-[#31028C] uppercase tracking-wider mb-2 block">Scheduling Mode</label>
              <div className="flex p-1 bg-white border border-[#E3E5EE] rounded-lg">
                <button
                  type="button"
                  onClick={() => setSchedulingMode("book")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${schedulingMode === "book" ? 'bg-black text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  Book Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setSchedulingMode("block")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${schedulingMode === "block" ? 'bg-black text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  Slot Block
                </button>
              </div>
            </div>

            {schedulingMode === "book" ? (
              <>
                {/* 1. Select Customer */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider">1. Select Customer / Patient</h3>
                    <p className="text-xs text-slate-500 mt-1">Identify who this booking is for</p>
                  </div>
                  
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between border border-[#E3E5EE] bg-[#f7f8fc] rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
                          {selectedCustomer.firstName?.[0] || ""}{selectedCustomer.lastName?.[0] || ""}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {buildCustomerLabel(selectedCustomer)}
                            {(selectedCustomer.gender || selectedCustomer.dateOfBirth) && (
                              <span className="text-slate-500 font-normal ml-1">
                                ({[
                                  selectedCustomer.gender ? (selectedCustomer.gender === 'Male' ? 'M' : selectedCustomer.gender === 'Female' ? 'F' : 'U') : null,
                                  selectedCustomer.dateOfBirth ? (new Date().getFullYear() - new Date(selectedCustomer.dateOfBirth).getFullYear()) + ' yr' : null
                                ].filter(Boolean).join(' / ')})
                              </span>
                            )}
                          </div>
                          {selectedCustomer.phone && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              <span className="font-medium text-slate-600">Mob:</span> {selectedCustomer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => applySelectedCustomer(null)} className="h-8 text-xs font-medium bg-white">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Change Patient
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      </div>
                      <input 
                        type="text" 
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        placeholder="Type to search patients by name or contact..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#31028C]/20 focus:border-[#31028C]"
                      />
                      {customerQuery.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                          {customerSearchLoading ? (
                            <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
                          ) : customerResults.length > 0 ? (
                            customerResults.map(customer => (
                              <div key={customer.uid} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">
                                    {customer.firstName?.[0] || ""}{customer.lastName?.[0] || ""}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{buildCustomerLabel(customer)}</div>
                                    <div className="text-xs text-slate-500">{customer.phone} - {customer.email}</div>
                                  </div>
                                </div>
                                <button type="button" onClick={() => applySelectedCustomer(customer)} className="text-xs font-semibold text-[#31028C] hover:underline px-3 py-1.5 bg-[#f5f3ff] rounded-md">Select</button>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-slate-500">No patients found.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!selectedCustomer && (
                    <div className="flex justify-end pt-2">
                      <Button variant="secondary" size="sm" type="button" className="text-xs h-8">
                        + New Patient
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. Calendar & Services */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider">2. Calendar & Services</h3>
                  </div>
                  <Select id="bk-calendar" label="Calendar Category" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={calendars.map((c) => ({ value: c.uid, label: c.name }))} />
                  <Select id="bk-service" label="Consultation Service" required placeholder={calendarUid ? "-- Choose Service --" : "Select calendar first"} value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} options={serviceOptions} />
                  <Select id="bk-doctor" label="Assigned User" required placeholder="Select professional" value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)} options={providers.map((p) => ({ value: p.uid ?? p.id, label: p.name, disabled: !UUID_PATTERN.test(p.uid ?? p.id ?? "") }))} />
                </div>
              </>
            ) : (
              <>
                {/* 1. Define Block Reason */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider">1. Define Block Reason & Type</h3>
                  </div>
                  <Select 
                    id="bk-block-reason" 
                    label="Reason for Block" 
                    required 
                    placeholder="-- Select Reason --" 
                    value={blockReason} 
                    onChange={(e) => setBlockReason(e.target.value)} 
                    options={[
                      { value: "Lunch Break", label: "Lunch Break" },
                      { value: "Meeting", label: "Meeting" },
                      { value: "Leave", label: "Leave" }
                    ]} 
                  />
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">Block Duration Type</label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={blockDurationType === "single"} onChange={() => setBlockDurationType("single")} className="text-[#31028C] focus:ring-[#31028C]" />
                        <span className="text-sm text-slate-700 font-medium">Single Time Slot</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={blockDurationType === "full"} onChange={() => setBlockDurationType("full")} className="text-[#31028C] focus:ring-[#31028C]" />
                        <span className="text-sm text-slate-700 font-medium">Full Day Block</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Choose Category & Assigned Staff */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider">2. Choose Category & Assigned Staff</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select id="bk-calendar" label="Calendar Category" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={calendars.map((c) => ({ value: c.uid, label: c.name }))} />
                    <Select id="bk-doctor" label="Assign User" required placeholder="Select professional" value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)} options={providers.map((p) => ({ value: p.uid ?? p.id, label: p.name, disabled: !UUID_PATTERN.test(p.uid ?? p.id ?? "") }))} />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* BOOKING SUMMARY */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#31028C] uppercase tracking-wider">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Booking Summary
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-[#7c3aed]"></div>
                    {selectedCalendar?.name || "Calendar"}
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-[#31028C] hover:underline px-3 py-1 bg-[#f5f3ff] rounded-md">
                    Modify
                  </button>
                </div>
              </div>

              {/* Patient Card */}
              {schedulingMode === "book" && (
                <div className="flex items-center gap-3 border border-[#E3E5EE] bg-[#f7f8fc] rounded-lg p-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm uppercase">
                    {resolvedPatientName ? resolvedPatientName.substring(0, 2) : "C"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {resolvedPatientName}
                      {(selectedCustomer?.gender || selectedCustomer?.dateOfBirth) && (
                        <span className="text-slate-500 font-normal ml-1">
                          ({[
                            selectedCustomer.gender ? (selectedCustomer.gender === 'Male' ? 'M' : selectedCustomer.gender === 'Female' ? 'F' : 'U') : null,
                            selectedCustomer.dateOfBirth ? (new Date().getFullYear() - new Date(selectedCustomer.dateOfBirth).getFullYear()) + ' yr' : null
                          ].filter(Boolean).join(' / ')})
                        </span>
                      )}
                    </div>
                    {resolvedPhone && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-600">Mob:</span> {resolvedPhone}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User & Service Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    User
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#31028C] text-white flex items-center justify-center text-[10px] font-bold">
                      {selectedProvider?.name?.[0] || "U"}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{selectedProvider?.name || "Assigned Staff"}</span>
                  </div>
                </div>
                {schedulingMode === "book" && selectedService && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      Service
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{selectedService.name}</span>
                      <div className="flex gap-2">
                        {selectedService.duration && (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {selectedService.duration} min
                          </span>
                        )}
                        {selectedService.price !== undefined && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                            ₹{selectedService.price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 1. CHOOSE DATE */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  1. Choose Date
                </h3>
                {selectedDate && (
                  <span className="text-xs font-bold text-[#31028C] bg-[#f5f3ff] px-3 py-1 rounded-md">
                    {selectedDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
              
              <div className="calendar-picker border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-6">
                  <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </Button>
                  <div className="flex gap-2">
                    <select 
                      className="border border-slate-200 rounded-md text-sm font-semibold text-slate-800 px-2 py-1 outline-none"
                      value={month.getMonth()}
                      onChange={(e) => setMonth(new Date(month.getFullYear(), parseInt(e.target.value), 1))}
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select 
                      className="border border-slate-200 rounded-md text-sm font-semibold text-slate-800 px-2 py-1 outline-none"
                      value={month.getFullYear()}
                      onChange={(e) => setMonth(new Date(parseInt(e.target.value), month.getMonth(), 1))}
                    >
                      {[0,1,2].map(y => {
                        const year = new Date().getFullYear() + y;
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="text-slate-400 hover:text-slate-700 border border-slate-200 bg-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </Button>
                </div>
                
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#31028C] uppercase mb-4 border-b border-slate-100 pb-2">
                  {WEEK.map((w) => <div key={w}>{w}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                  {cells.map((d, i) => d === null ? <div key={`empty-${i}`} /> : (
                    <button
                      key={iso(d)}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`relative flex flex-col items-center py-2 rounded-lg transition-colors border ${selectedDate && iso(selectedDate) === iso(d) ? 'border-[#31028C] bg-[#31028C] text-white shadow-md' : 'border-transparent text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="text-sm font-semibold">{d.getDate()}</span>
                      <span className={`text-[9px] font-bold mt-1 ${selectedDate && iso(selectedDate) === iso(d) ? 'text-white/80' : 'text-emerald-500'}`}>
                        {/* Placeholder availability logic, assumes always available for now */}
                        slots
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={() => {const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today);}} className="text-xs font-semibold text-slate-600 hover:text-[#31028C] border border-slate-200 bg-white px-3 py-1.5 rounded-md shadow-sm">
                    Jump to Today
                  </button>
                </div>
              </div>
            </div>

            {/* 2. CHOOSE SCHEDULE */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-5 shadow-sm">
               <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider flex items-center gap-2 mb-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  2. Choose Schedule
               </h3>
               <Select 
                 id="bk-schedule" 
                 label="" 
                 required 
                 placeholder={calendarUid ? (schedulesLoading ? "Loading schedules..." : "Select schedule") : "Select calendar first"} 
                 value={scheduleUid} 
                 onChange={(e) => setScheduleUid(e.target.value)} 
                 options={scheduleOptions} 
               />
            </div>

            {/* 3. CHOOSE SLOT */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  3. Choose Slot
                </h3>
                {slot && (
                  <span className="text-xs font-bold text-[#31028C] bg-[#f5f3ff] px-3 py-1 rounded-md">
                    {fmtSlot(slot.startTime)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {!calendarUid ? (
                  <div className="text-xs font-medium text-slate-500 col-span-4 p-4 text-center bg-slate-50 rounded-lg border border-slate-100">Please select a calendar in Step 1.</div>
                ) : (!serviceUid && schedulingMode === "book") || !scheduleUid || !selectedDate ? (
                  <div className="text-xs font-medium text-slate-500 col-span-4 p-4 text-center bg-slate-50 rounded-lg border border-slate-100">Please select a schedule (and service) to view available slots.</div>
                ) : slotsLoading ? (
                  <div className="text-xs font-medium text-[#31028C] col-span-4 p-4 text-center bg-[#f5f3ff] rounded-lg border border-[#eaddff]">Loading slots…</div>
                ) : slots.length === 0 ? (
                  <div className="text-xs font-medium text-amber-700 col-span-4 p-4 text-center bg-amber-50 rounded-lg border border-amber-100">No slots available for this selection.</div>
                ) : (
                  slots.map((s) => {
                    const available = s.isAvailable !== false && (s.availableCount ?? 1) > 0;
                    const active = slot?.startTime === s.startTime;
                    return (
                      <button
                        key={s.startTime}
                        type="button"
                        disabled={!available}
                        onClick={() => setSlot(s)}
                        className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all shadow-sm ${active ? 'border-[#31028C] bg-[#31028C] text-white shadow-md' : available ? 'border-slate-200 bg-white text-slate-700 hover:border-[#31028C] hover:text-[#31028C]' : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed shadow-none'}`}
                      >
                        {fmtSlot(s.startTime)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* 4. SPECIAL NOTES / INSTRUCTIONS */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider mb-4">4. Special Notes / Instructions</h3>
              <Textarea 
                id="bk-notes" 
                label="" 
                placeholder="Add any medical symptoms, chief complaints, or booking notes..."
                rows={3} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>

            {/* 5. REFERENCE DOCUMENTS */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider mb-4">5. Reference Documents</h3>
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-8 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors cursor-pointer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#31028C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <p className="text-sm font-bold text-slate-700 mb-1">Drag & drop clinical records here</p>
                <p className="text-xs text-slate-500">Or tap to simulate file selection</p>
              </div>
            </div>


          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={step === 2 ? () => setStep(1) : closeDrawer} 
          className="px-6 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
        >
          {step === 2 ? "< Back to Selection" : "Cancel"}
        </Button>
        <Button 
          type="submit" 
          className="bg-[#31028C] hover:bg-[#230166] text-white px-8 font-semibold shadow-md" 
          loading={submitting || seriesSubmitting}
        >
          {step === 1 ? "Next: Select Date & Time >" : "Confirm Booking"}
        </Button>
      </div>
    </form>
  );
}
