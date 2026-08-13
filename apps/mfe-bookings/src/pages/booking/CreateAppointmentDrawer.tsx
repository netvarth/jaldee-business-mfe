import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Combobox,
  EmptyState,
  Input,
  Select,
  Textarea,
  Checkbox,
  FileUpload,
} from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import { useCalendars } from "../../services/useCalendars";
import { useServices } from "../../services/useServices";
import { useProviders } from "../../services/useProviders";
import { useSlots } from "../../services/useSlots";
import { useCreateBooking } from "../../services/useCreateBooking";
import { useCreateSeriesBooking } from "../../services/useCreateSeriesBooking";
import { useBlockSlot } from "../../services/useBlockSlot";
import { useCustomerSearch } from "../../services/useCustomerSearch";
import { useBookingApi } from "../../services/useBookingApi";
import { addCreatedBooking } from "../../data/sessionStore";
import { uploadAttachmentsToDrive } from "../../services/useAttachments";
import { useMFEProps } from "@jaldee/auth-context";
import type { BookingChannel, Calendar, CustomerSearchResult, Slot } from "../../types";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import CreatePatientModal from "../customers/CreatePatientModal";

const ACTIVE_CALENDARS_FILTER: SearchFilterClause[] = [{ field: "status", operator: "EQ", values: ["ACTIVE"] }];

const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];


function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtSlot(t: string): string {
  return t.split(":").slice(0, 2).join(":");
}

function parseTimeStr(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

function getSlotDuration(slot: Slot) {
  return parseTimeStr(slot.endTime) - parseTimeStr(slot.startTime);
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

function resolveTextValue(value: unknown, fallbackKeys: string[]) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    for (const key of fallbackKeys) {
      const candidate = (value as Record<string, unknown>)[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
  }
  return "";
}

function normalizeCalendarServiceMappings(services: Calendar["services"] | undefined) {
  if (!Array.isArray(services)) return [];
  return services
    .map((service) => {
      if (!service || typeof service === "string") {
        const serviceUid = typeof service === "string" ? service : "";
        return serviceUid
          ? { serviceUid, serviceName: serviceUid, users: [] as Array<{ userUid: string; userName: string }> }
          : null;
      }

      const serviceUid = resolveTextValue(service, ["serviceUid", "uid", "id"]);
      if (!serviceUid) return null;
      const serviceName = resolveTextValue(service, ["serviceName", "name", "displayName", "uid", "id"]) || serviceUid;
      const rawUsers = "users" in service && Array.isArray(service.users) ? service.users : [];
      const users = rawUsers
        .map((user) => {
          const userUid = resolveTextValue(user, ["userUid", "uid", "id"]);
          if (!userUid) return null;
          const userName = resolveTextValue(user, ["userName", "displayName", "name"]) || userUid;
          return { userUid, userName };
        })
        .filter((item): item is { userUid: string; userName: string } => Boolean(item));

      return { serviceUid, serviceName, users };
    })
    .filter((item): item is { serviceUid: string; serviceName: string; users: Array<{ userUid: string; userName: string }> } => Boolean(item));
}

interface CreateAppointmentDrawerProps {
  initialDate?: Date;
  initialTime?: string;
  initialProviderUid?: string;
  initialCalendarUid?: string;
  isFromCell?: boolean;
}

export default function CreateAppointmentDrawer({
  initialDate,
  initialTime,
  initialProviderUid,
  initialCalendarUid,
  isFromCell,
}: CreateAppointmentDrawerProps = {}) {
  const { closeDrawer, openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { calendars, searchSchedules, getCalendar, getUserCalendarsAvailability } = useCalendars(ACTIVE_CALENDARS_FILTER);
  const { services } = useServices();
  const { providers } = useProviders();
  const { slots, loading: slotsLoading, fetchSlots, clearSlots } = useSlots();
  const { createBooking, validateBooking, submitting } = useCreateBooking();
  const { createSeries, submitting: seriesSubmitting } = useCreateSeriesBooking();
  const { blockSlot, submitting: blockSubmitting } = useBlockSlot();
  const { results: customerResults, loading: customerSearchLoading, error: customerSearchError, searchCustomers, clearResults } = useCustomerSearch();
  const api = useBookingApi();
  const { user, account } = useMFEProps();

  const [step, setStep] = useState(1);
  const [schedulingMode, setSchedulingMode] = useState<"book" | "block">("book");
  const isFromCalendar = !!isFromCell;

  // Step 1: Book Appointment State
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerUid, setSelectedCustomerUid] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);

  const handleCustomerCreated = (result: any) => {
    closeModal();
    if (result && (result.id || result.uid)) {
      applySelectedCustomer({
        uid: result.id || result.uid,
        firstName: result.firstName || result.consumer?.firstName,
        lastName: result.lastName || result.consumer?.lastName,
        phone: result.phoneNumber || result.phoneNo || result.phoneE164 || result.consumer?.phoneNo,
        email: result.email || result.consumer?.email,
        gender: result.gender || result.consumer?.gender,
        dateOfBirth: result.dob || result.consumer?.dob,
      });
    } else {
      clearResults();
      setCustomerQuery("");
    }
  };

  
  const [calendarUid, setCalendarUid] = useState(initialCalendarUid || "");
  const [serviceUid, setServiceUid] = useState("");
  const [doctorUid, setDoctorUid] = useState(initialProviderUid || "");
  const [scheduleUid, setScheduleUid] = useState("");
  
  // Step 1: Slot Block State
  const [blockReason, setBlockReason] = useState("");
  const [blockDurationType, setBlockDurationType] = useState<"single" | "full">("single");

  // File Upload State
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Step 2 State
  const [month, setMonth] = useState(() => initialDate ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1) : new Date(2026, 4, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>(initialTime ? [{ startTime: initialTime, endTime: "23:59", availableCount: 1, isAvailable: true }] : []);
  const [notes, setNotes] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState<{ value: string; label: string }[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [calendarDetails, setCalendarDetails] = useState<Calendar | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [interval, setIntervalVal] = useState(1);
  const [until, setUntil] = useState("");
  const scheduleManuallySelectedRef = useRef(false);

  const [availableCalendars, setAvailableCalendars] = useState<Calendar[] | null>(null);

  useEffect(() => {
    if (initialProviderUid && isFromCell && initialDate && initialTime) {
      const isoDateStr = initialDate.toISOString();
      const dateStr = isoDateStr.substring(0, isoDateStr.indexOf('T'));
      const timeParts = initialTime.split(":");
      if (timeParts.length >= 2) {
        const endH = String((Number(timeParts[0]) + 1) % 24).padStart(2, '0');
        const endTime = `${endH}:${timeParts[1]}`;
        getUserCalendarsAvailability(initialProviderUid, dateStr, initialTime, endTime)
          .then(cals => {
            setAvailableCalendars(cals);
            if (cals.length === 1 && !calendarUid) {
              setCalendarUid(cals[0].uid || "");
            }
          })
          .catch(err => {
            console.error("Failed to fetch available calendars for user", err);
            setAvailableCalendars([]);
          });
      }
    }
  }, [initialProviderUid, isFromCell, initialDate, initialTime, getUserCalendarsAvailability, calendarUid]);

  const dateStr = selectedDate ? iso(selectedDate) : "";
  const resolvedPatientName = patientName.trim() || (selectedCustomer ? buildCustomerLabel(selectedCustomer) : "");
  const resolvedPhone = phone.trim() || selectedCustomer?.phone || "";
  const resolvedEmail = email.trim() || selectedCustomer?.email || "";
  
  const selectedCalendar = useMemo(
    () => (availableCalendars ?? calendars).find((calendar) => calendar.uid === calendarUid),
    [calendarUid, calendars, availableCalendars],
  );
  const effectiveCalendar = calendarDetails ?? selectedCalendar ?? null;
  const calendarServiceMappings = useMemo(
    () => normalizeCalendarServiceMappings(effectiveCalendar?.services),
    [effectiveCalendar?.services]
  );
  const selectedProviderUid = useMemo(() => {
    const matchedProvider = providers.find((provider) =>
      provider.uid === doctorUid || provider.id === doctorUid || provider.name === doctorUid,
    );
    const resolved = matchedProvider?.uid ?? matchedProvider?.id ?? doctorUid;
    return typeof resolved === "string" ? resolved : "";
  }, [doctorUid, providers]);

  const selectedProvider = useMemo(() => providers.find(p => p.uid === selectedProviderUid || p.id === selectedProviderUid), [providers, selectedProviderUid]);
  const selectedService = useMemo(() => services.find(s => s.uid === serviceUid || s.id === serviceUid), [services, serviceUid]);
  
  const availableServices = useMemo(() => {
    if (calendarServiceMappings.length > 0) {
      return calendarServiceMappings
        .map((mapping) => services.find((service) => (service.uid ?? service.id) === mapping.serviceUid || service.id === mapping.serviceUid))
        .filter((service): service is NonNullable<typeof service> => Boolean(service));
    }
    if (!calendarUid) {
      return services;
    }
    if (!effectiveCalendar) {
      return calendarUid ? [] : services;
    }
    return [];
  }, [calendarServiceMappings, calendarUid, effectiveCalendar, services]);
  
  const serviceOptions = useMemo(
    () => availableServices.map((service) => ({ value: service.uid ?? service.id, label: service.name })),
    [availableServices],
  );

  const availableProviders = useMemo(() => {
    const selectedMapping = calendarServiceMappings.find((mapping) => mapping.serviceUid === serviceUid);
    if (selectedMapping) {
      return selectedMapping.users
        .map((assignedUser) =>
          providers.find((provider) => (provider.uid ?? provider.id) === assignedUser.userUid || provider.id === assignedUser.userUid) ?? {
            id: assignedUser.userUid,
            uid: assignedUser.userUid,
            name: assignedUser.userName,
            code: assignedUser.userName.slice(0, 2).toUpperCase(),
            color: "avatar-color-1",
            role: "",
            status: "online" as const,
          }
        )
        .filter(Boolean);
    }
    if (!calendarUid) {
      return providers;
    }
    if (!effectiveCalendar) {
      return calendarUid ? [] : providers;
    }
    return [];
  }, [calendarServiceMappings, calendarUid, effectiveCalendar, providers, serviceUid]);

  const providerOptions = useMemo(
    () => availableProviders.map((p) => ({ value: p.uid ?? p.id, label: p.name, disabled: false })),
    [availableProviders],
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
    if (!calendarUid) {
      setCalendarDetails(null);
      return;
    }
    let cancelled = false;
    async function loadCalendarDetails() {
      try {
        const data = await getCalendar(calendarUid);
        if (!cancelled) {
          setCalendarDetails(data);
        }
      } catch {
        if (!cancelled) {
          setCalendarDetails(null);
        }
      }
    }
    void loadCalendarDetails();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, getCalendar]);

  useEffect(() => {
    setSelectedSlots([]);
    if (serviceUid && dateStr) {
      fetchSlots({ serviceUid, calendarUid, date: dateStr, providerUid: doctorUid });
    } else {
      clearSlots();
    }
  }, [serviceUid, dateStr, doctorUid, fetchSlots, clearSlots, calendarUid]);

  useEffect(() => {
    if (!calendarUid) {
      setScheduleOptions([]);
      setScheduleUid("");
      scheduleManuallySelectedRef.current = false;
      setSchedulesLoading(false);
      return;
    }
    let cancelled = false;
    async function loadSchedules() {
      setSchedulesLoading(true);
      try {
        const schedules = await searchSchedules(calendarUid);
        if (cancelled) return;
        const nextOptions = schedules.map((schedule) => ({ value: schedule.uid, label: schedule.name }));
        setScheduleOptions(nextOptions);
        setScheduleUid((current) => {
          if (
            scheduleManuallySelectedRef.current &&
            current &&
            nextOptions.some((option) => option.value === current)
          ) {
            return current;
          }
          scheduleManuallySelectedRef.current = false;
          return nextOptions[0]?.value ?? "";
        });
      } catch {
        if (cancelled) return;
        setScheduleOptions([]);
        setScheduleUid("");
        scheduleManuallySelectedRef.current = false;
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
  }, [calendarUid, searchSchedules]);

  useEffect(() => {
    if (scheduleUid && !scheduleOptions.some((schedule) => schedule.value === scheduleUid)) {
      scheduleManuallySelectedRef.current = false;
      setScheduleUid(scheduleOptions[0]?.value ?? "");
      setSelectedSlots([]);
      clearSlots();
    }
  }, [clearSlots, scheduleOptions, scheduleUid]);

  useEffect(() => {
    if (serviceUid && !serviceOptions.some((service) => service.value === serviceUid)) {
      setServiceUid("");
      setDoctorUid("");
      setSelectedSlots([]);
      clearSlots();
    }
  }, [clearSlots, serviceOptions, serviceUid]);

  useEffect(() => {
    if (isFromCell && initialProviderUid && doctorUid === initialProviderUid) {
      return;
    }
    if (doctorUid && !providerOptions.some((provider) => provider.value === doctorUid)) {
      setDoctorUid("");
      setSelectedSlots([]);
      clearSlots();
    }
  }, [clearSlots, providerOptions, doctorUid, isFromCell, initialProviderUid]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7; 
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  const handleNextStep = () => {
    if (schedulingMode === "book") {
      if (!selectedCustomer && !patientName.trim()) {
        showToast("Please select a customer", "error");
        return;
      }
      if (!calendarUid || !serviceUid) {
        showToast("Please select Calendar and Service", "error");
        return;
      }
    } else {
      if (!blockReason || !calendarUid) {
        showToast("Please complete all block details", "error");
        return;
      }
    }
    setStep(2);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && !isFromCalendar) {
      handleNextStep();
      return;
    }

    if (schedulingMode === "book") {
      if (!resolvedPatientName) { showToast("Customer name is required", "error"); return; }
      if (!calendarUid || !serviceUid || !scheduleUid || !selectedDate || selectedSlots.length === 0) {
        showToast("Please complete calendar, service, date and slot", "error");
        return;
      }

      const combinedStartTime = selectedSlots[0].startTime;
      const combinedEndTime = selectedSlots[selectedSlots.length - 1].endTime;

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
            channel: "Walk-in",
            startTime: combinedStartTime,
            endTime: combinedEndTime,
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
              startTime: fmtSlot(combinedStartTime), endTime: fmtSlot(combinedEndTime), time: fmtSlot(combinedStartTime),
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

      let driveAttachments: any[] = [];
      if (pendingFiles.length > 0) {
        try {
          driveAttachments = await uploadAttachmentsToDrive(api, pendingFiles, user, account.id || "");
        } catch (e) {
          showToast("Failed to upload attachments. Booking aborted.", "error");
          return;
        }
      }

      try {
        const payload = {
          calendarUid, serviceUid, providerUid: selectedProviderUid, scheduleUid,
          date: dateStr, startTime: combinedStartTime, endTime: combinedEndTime,
          patientName: resolvedPatientName, phone: resolvedPhone, email: resolvedEmail, channel: "Walk-in" as const, notes,
          customerDetails: selectedCustomer ? mapCustomerDetails(selectedCustomer) : undefined,
          attachments: driveAttachments.length > 0 ? driveAttachments : undefined,
        };

        const validation = await validateBooking(payload);
        if (!validation.valid) {
          showToast(`Validation failed: ${validation.errors?.join(", ")}`, "error");
          return;
        }

        const result = await createBooking(payload);

        const createdUid = result.uid || `bk-${Date.now()}`;

        addCreatedBooking({
          id: createdUid, uid: createdUid,
          calendarId: calendarUid, calendarUid,
          serviceId: serviceUid, serviceUid,
          userId: selectedProviderUid, userUid: selectedProviderUid, providerId: selectedProviderUid,
          patientName: resolvedPatientName, customerName: resolvedPatientName,
          startTime: fmtSlot(combinedStartTime), endTime: fmtSlot(combinedEndTime), time: fmtSlot(combinedStartTime),
          status: "Checked-in",
          bookingDate: dateStr,
        });

        showToast("Appointment booked", "success");
        closeDrawer();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to book appointment", "error");
      }
    } else {
      if (!calendarUid || !scheduleUid || !selectedDate) {
        showToast("Please complete calendar, and select a date", "error");
        return;
      }

      if (blockDurationType === "single" && selectedSlots.length === 0) {
        showToast("Please pick a slot", "error");
        return;
      }

      try {
        if (blockDurationType === "full") {
          const res = await blockSlot({
            scheduleUid,
            serviceUid: serviceUid || undefined,
            providerUid: doctorUid || undefined,
            date: dateStr,
            startTime: "00:00:00",
            endTime: "23:59:59",
            notes: blockReason,
          });
          if (res.uid) {
            addCreatedBooking({
              id: res.uid, uid: res.uid,
              calendarId: calendarUid, calendarUid,
              serviceId: serviceUid, serviceUid,
              userId: doctorUid, userUid: doctorUid, providerId: doctorUid,
              patientName: "Blocked", customerName: "Blocked",
              startTime: "00:00:00", endTime: "23:59:59", time: "00:00:00",
              status: "Blocked",
              bookingDate: dateStr,
            });
          }
        } else {
          const sortedSlots = [...selectedSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
          const groups: Slot[][] = [];
          for (const s of sortedSlots) {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup[lastGroup.length - 1].endTime === s.startTime) {
              lastGroup.push(s);
            } else {
              groups.push([s]);
            }
          }
          await Promise.all(groups.map(async (group) => {
            const res = await blockSlot({
              scheduleUid,
              serviceUid: serviceUid || undefined,
              providerUid: doctorUid || undefined,
              date: dateStr,
              startTime: group[0].startTime,
              endTime: group[group.length - 1].endTime,
              notes: blockReason,
            });
            if (res.uid) {
              addCreatedBooking({
                id: res.uid, uid: res.uid,
                calendarId: calendarUid, calendarUid,
                serviceId: serviceUid, serviceUid,
                userId: doctorUid, userUid: doctorUid, providerId: doctorUid,
                patientName: "Blocked", customerName: "Blocked",
                startTime: fmtSlot(group[0].startTime), endTime: fmtSlot(group[group.length - 1].endTime), time: fmtSlot(group[0].startTime),
                status: "Blocked",
                bookingDate: dateStr,
              });
            }
          }));
        }

        showToast("Slot Block created successfully", "success");
        closeDrawer();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Could not create slot block", "error");
      }
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

      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 space-y-4">
        {/* Stepper */}
        {!isFromCalendar && schedulingMode === "book" && (
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
        )}

        {(step === 1 || isFromCalendar || schedulingMode === "block") && (
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
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider">1. Select Customer</h3>
                    </div>
                    {!selectedCustomer && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        type="button" 
                        className="text-xs h-7 px-3 py-1"
                        onClick={() => openModal(<CreatePatientModal onCreated={handleCustomerCreated} />)}
                      >
                        + New Customer
                      </Button>
                    )}
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
                        Change Customer
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
                        placeholder="Search by name or contact number" 
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
                            <div className="p-4 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                              No customers found.
                              <Button type="button" variant="secondary" size="sm" onClick={() => openModal(<CreatePatientModal onCreated={handleCustomerCreated} />)}>
                                Create New Customer
                              </Button>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  )}
                  
                </div>

                {/* 2. Calendar & Services */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider">2. Calendar & Services</h3>
                  </div>
                  <Select id="bk-calendar" label="Calendar Category" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={(availableCalendars ?? calendars).filter(c => c.status === "ACTIVE").map((c) => ({ value: c.uid || "", label: c.name }))} />
                  <Select id="bk-service" label="Consultation Service" required placeholder={calendarUid ? "-- Choose Service --" : "Select calendar first"} value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} options={serviceOptions} />
                  {!(isFromCell && initialProviderUid) && (
                    <Select id="bk-doctor" label="Assigned User (Optional)" placeholder="Select professional" value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)} options={providerOptions} />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 mb-6">
                  <Input 
                    id="bk-block-reason" 
                    label="Reason for Block" 
                    required 
                    placeholder="Enter reason..." 
                    value={blockReason} 
                    onChange={(e) => setBlockReason(e.target.value)} 
                  />
                  <Select id="bk-calendar" label="Calendar Category" required placeholder="Select calendar" value={calendarUid} onChange={(e) => setCalendarUid(e.target.value)} options={(availableCalendars ?? calendars).filter(c => c.status === "ACTIVE").map((c) => ({ value: c.uid || "", label: c.name }))} />
                  <Select id="bk-service" label="Consultation Service (Optional)" placeholder={calendarUid ? "-- Choose Service --" : "Select calendar first"} value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} options={serviceOptions} />
                  {!(isFromCell && initialProviderUid) && (
                    <Select id="bk-doctor" label="Assigned User (Optional)" placeholder="Select professional" value={doctorUid} onChange={(e) => setDoctorUid(e.target.value)} options={providerOptions} />
                  )}
                </div>
              </>
            )}
          </>
        )}

        {(step === 2 || isFromCalendar || schedulingMode === "block") && (
          <div className="space-y-4">
            {/* BOOKING SUMMARY */}
            {!isFromCalendar && schedulingMode === "book" && (
              <div className="bg-white border border-[#E3E5EE] rounded-xl p-4 shadow-sm">
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
                <div className="flex flex-col gap-4">
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
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-sm font-semibold text-slate-900 truncate" title={selectedService.name}>{selectedService.name}</span>
                        <div className="flex gap-1.5 shrink-0 ml-auto">
                          {selectedService.duration && (
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              {selectedService.duration} min
                            </span>
                          )}
                          {selectedService.price !== undefined && (
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                              ₹{selectedService.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 1. CHOOSE DATE */}
            {isFromCalendar ? (
              <div className="bg-white border border-[#E3E5EE] rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f5f3ff] text-[#31028C] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#31028C] uppercase tracking-wider">Selected Date</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {selectedDate?.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      {isFromCell && initialProviderUid && (
                        <span className="ml-2 font-normal text-slate-500">
                          | {providers.find(p => p.uid === initialProviderUid || p.id === initialProviderUid)?.name || "Provider"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E3E5EE] rounded-xl p-4 shadow-sm">
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
            )}

            {/* 2. CHOOSE SCHEDULE (Hidden) */}

            {/* 2. CHOOSE SLOT */}
            <div className="bg-white border border-[#E3E5EE] rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  2. Choose Slot
                </h3>
                {selectedSlots.length > 0 && (
                  <span className="text-xs font-bold text-[#31028C] bg-[#f5f3ff] px-3 py-1 rounded-md">
                    {schedulingMode === "block" ? `${selectedSlots.length} slot(s) selected` : `${fmtSlot(selectedSlots[0].startTime)} - ${fmtSlot(selectedSlots[selectedSlots.length - 1].endTime)}`}
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
                  slots.map((s, index) => {
                    const available = s.isAvailable !== false && (s.availableCount ?? 1) > 0;
                    const active = selectedSlots.some(selected => fmtSlot(selected.startTime) === fmtSlot(s.startTime));
                    return (
                      <button
                        key={s.startTime}
                        type="button"
                        disabled={!available}
                        onClick={async () => {
                          if (schedulingMode === "block") {
                            const isSelected = selectedSlots.some(selected => fmtSlot(selected.startTime) === fmtSlot(s.startTime));
                            if (isSelected) {
                              setSelectedSlots(selectedSlots.filter(selected => fmtSlot(selected.startTime) !== fmtSlot(s.startTime)));
                            } else {
                              setSelectedSlots([...selectedSlots, s].sort((a, b) => a.startTime.localeCompare(b.startTime)));
                            }
                            return;
                          }

                          if (!calendarUid || !serviceUid || !selectedDate) return;
                          
                          try {
                            const params = new URLSearchParams({
                              calendarUid,
                              serviceUid,
                              date: iso(selectedDate),
                              beginningSlot: s.startTime
                            });
                            if (doctorUid) {
                              params.append("tenantUserUid", doctorUid);
                            }
                            
                            const url = `/bookings/availability/validate-slot?${params.toString()}`;
                            const res = await api.get(url) as any;
                            
                            if (res.isAvailable === false) {
                              showToast(res.message || "Slot is not available.", "error");
                              setSelectedSlots([]);
                            } else if (res.slots && res.slots.length > 0) {
                              setSelectedSlots(res.slots);
                            } else {
                              setSelectedSlots([s]);
                            }
                          } catch (e: any) {
                            showToast(e.message || "Failed to validate slot.", "error");
                            setSelectedSlots([]);
                          }
                        }}
                        className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all shadow-sm ${active ? 'border-[#31028C] bg-[#31028C] text-white shadow-md' : available ? 'border-slate-200 bg-white text-slate-700 hover:border-[#31028C] hover:text-[#31028C]' : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed shadow-none'}`}
                      >
                        {fmtSlot(s.startTime)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* 3. SPECIAL NOTES / INSTRUCTIONS */}
            {schedulingMode === "book" && (
              <div className="bg-white border border-[#E3E5EE] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider mb-4">3. Special Notes / Instructions</h3>
                <Textarea 
                  id="bk-notes" 
                  label="" 
                  placeholder="Add booking notes..."
                  rows={3} 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>
            )}

            {/* 4. REFERENCE DOCUMENTS */}
            {schedulingMode === "book" && (
              <div className="bg-white border border-[#E3E5EE] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#31028C] uppercase tracking-wider mb-4">4. Reference Documents</h3>
                <FileUpload
                  multiple
                  onUpload={(files) => setPendingFiles(files)}
                />
              </div>
            )}


          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={step === 2 && !isFromCalendar && schedulingMode === "book" ? () => setStep(1) : closeDrawer} 
          className="px-6 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
        >
          {step === 2 && !isFromCalendar && schedulingMode === "book" ? "< Back to Selection" : "Cancel"}
        </Button>
        <Button 
          type="submit" 
          className="bg-[#31028C] hover:bg-[#230166] text-white px-8 font-semibold shadow-md" 
          loading={submitting || seriesSubmitting || blockSubmitting}
        >
          {step === 1 && !isFromCalendar && schedulingMode === "book"
            ? "Next: Select Date & Time >" 
            : schedulingMode === "block" 
              ? "Block Slot" 
              : "Confirm Booking"}
        </Button>
      </div>
    </form>
  );
}
