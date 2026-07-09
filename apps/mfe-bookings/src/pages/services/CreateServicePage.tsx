import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useCreateService, type ServiceFormInput } from "../../services/useCreateService";
import { Button, EmptyState, ErrorState, FormSection, Input, Select, Switch, PageHeader, Checkbox, PhoneInput, type PhoneInputValue } from "@jaldee/design-system";
import SchemaBuilder, { type SchemaField } from "./SchemaBuilder";
import { useUsers } from "../../services/useUsers";
import { useServiceDetails, toServiceFormPrefill, type ServiceDetailsRecord } from "../../services/useServiceDetails";

type ValidationErrors = Partial<Record<
  "name" | "teleServiceMode" | "teleServicePlatform" | "meetingLink" | "phoneNumber" | "requestType",
  string
>>;

const EMPTY_PHONE: PhoneInputValue = { countryCode: "+91", number: "", e164Number: "" };

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPhone(value: PhoneInputValue) {
  const digits = value.number.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export default function CreateServicePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const serviceId = params.id;
  const editService = (location.state as { service?: ServiceDetailsRecord } | null)?.service;
  const isEditMode = Boolean(serviceId);
  const { showToast } = useToast();
  const { saveService, submitting } = useCreateService();
  const { getService, loading: loadingService, error: serviceError } = useServiceDetails();
  const { users } = useUsers();

  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [description, setDescription] = useState("");
  const [serviceContext, setServiceContext] = useState<ServiceFormInput["serviceContext"]>("General Service");
  const [serviceType, setServiceType] = useState<ServiceFormInput["serviceType"]>("Onsite Service");
  const [apptType, setApptType] = useState<ServiceFormInput["apptType"]>("Booking");
  const [requestType, setRequestType] = useState<ServiceFormInput["requestType"]>();
  const [serviceCategory, setServiceCategory] = useState<ServiceFormInput["serviceCategory"]>("Main Service");
  const [teleServiceMode, setTeleServiceMode] = useState<ServiceFormInput["teleServiceMode"]>();
  const [teleServicePlatform, setTeleServicePlatform] = useState<ServiceFormInput["teleServicePlatform"]>();
  const [meetingLink, setMeetingLink] = useState("");
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(EMPTY_PHONE);
  const [durHrs, setDurHrs] = useState(0);
  const [durMins, setDurMins] = useState(30);
  const [numResources, setNumResources] = useState(1);
  const [maxBookings, setMaxBookings] = useState(1);
  const [showDuration, setShowDuration] = useState(true);
  const [leadDays, setLeadDays] = useState(0);
  const [leadHrs, setLeadHrs] = useState(0);
  const [leadMins, setLeadMins] = useState(0);
  const [safeSlots, setSafeSlots] = useState(true);
  const [assignUsers, setAssignUsers] = useState(false);
  const [hasPricing, setHasPricing] = useState(false);
  const [price, setPrice] = useState(500);
  const [taxApplicable, setTaxApplicable] = useState(false);
  const [hsnCode, setHsnCode] = useState("None");
  const [preServiceSchema, setPreServiceSchema] = useState<SchemaField[]>([]);
  const [postServiceSchema, setPostServiceSchema] = useState<SchemaField[]>([]);
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [practitionerOverrides, setPractitionerOverrides] = useState<Record<string, { enabled: boolean; price: number }>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hydrating, setHydrating] = useState(isEditMode);

  const goBack = () => navigate("/services");
  const isTeleservice = serviceType === "Teleservice";
  const isRequest = apptType === "Request";
  const isVideoMode = teleServiceMode === "Video Mode";
  const isAudioMode = teleServiceMode === "Audio Mode";
  const needsPhoneNumber = isTeleservice && isAudioMode && (teleServicePlatform === "Phone" || teleServicePlatform === "WhatsApp");
  const needsMeetingLink = isTeleservice && ((isVideoMode && Boolean(teleServicePlatform)) || (isAudioMode && teleServicePlatform === "Google Meet"));

  const teleServicePlatformOptions = useMemo(() => {
    if (isVideoMode) {
      return [
        { value: "Zoom", label: "Zoom", description: "Share a setup link or meeting identifier." },
        { value: "Google Meet", label: "Google Meet", description: "Use a Google Meet session link." },
        { value: "Jaldee Video", label: "Jaldee Video", description: "Use Jaldee-hosted video consultation." },
        { value: "WhatsApp", label: "WhatsApp", description: "Share the WhatsApp call setup link." },
      ] as const;
    }

    return [
      { value: "Phone", label: "Phone", description: "Customer joins by direct phone call." },
      { value: "WhatsApp", label: "WhatsApp", description: "Customer joins by WhatsApp call." },
      { value: "Google Meet", label: "Google Meet", description: "Customer joins by Google Meet audio link." },
    ] as const;
  }, [isVideoMode]);

  const resetTeleService = (nextType: ServiceFormInput["serviceType"]) => {
    setServiceType(nextType);
    if (nextType !== "Teleservice") {
      setTeleServiceMode(undefined);
      setTeleServicePlatform(undefined);
      setMeetingLink("");
      setPhoneValue(EMPTY_PHONE);
    }
  };

  useEffect(() => {
    if (!isEditMode) {
      setHydrating(false);
      return;
    }

    let cancelled = false;
    async function loadService() {
      setHydrating(true);
      try {
        const details = editService ?? (serviceId ? await getService(serviceId) : null);
        if (!details || cancelled) return;
        const initial = toServiceFormPrefill(details.raw);
        setName(initial.name);
        setDisplayOrder(initial.displayOrder);
        setDescription(initial.description);
        setServiceContext(initial.serviceContext);
        setServiceType(initial.serviceType);
        setApptType(initial.apptType);
        setRequestType(initial.requestType);
        setServiceCategory(initial.serviceCategory);
        setTeleServiceMode(initial.teleServiceMode);
        setTeleServicePlatform(initial.teleServicePlatform);
        setMeetingLink(initial.meetingLink);
        setPhoneValue(initial.phoneValue);
        setDurHrs(initial.durHrs);
        setDurMins(initial.durMins);
        setNumResources(initial.numResources);
        setMaxBookings(initial.maxBookings);
        setShowDuration(initial.showDuration);
        setLeadDays(initial.leadDays);
        setLeadHrs(initial.leadHrs);
        setLeadMins(initial.leadMins);
        setSafeSlots(initial.safeSlots);
        setAssignUsers(initial.assignUsers);
        setHasPricing(initial.hasPricing);
        setPrice(initial.price);
        setTaxApplicable(initial.taxApplicable);
        setHsnCode(initial.hsnCode);
        setPreServiceSchema(initial.preServiceSchema);
        setPostServiceSchema(initial.postServiceSchema);
        setCurrencyCode(initial.currencyCode);
        setPractitionerOverrides(initial.practitionerOverrides);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }

    void loadService();
    return () => {
      cancelled = true;
    };
  }, [editService, getService, isEditMode, serviceId]);

  const validateForm = () => {
    const nextErrors: ValidationErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Service name is required";
    }

    if (isTeleservice) {
      if (!teleServiceMode) {
        nextErrors.teleServiceMode = "Teleservice mode is required";
      }
      if (!teleServicePlatform) {
        nextErrors.teleServicePlatform = "Platform is required";
      }
      if (needsMeetingLink) {
        if (!meetingLink.trim()) {
          nextErrors.meetingLink = isAudioMode ? "Meeting link is required" : "Meeting ID / setup link is required";
        } else if (isAudioMode && teleServicePlatform === "Google Meet" && !isValidUrl(meetingLink.trim())) {
          nextErrors.meetingLink = "Enter a valid URL";
        }
      }
      if (needsPhoneNumber) {
        if (!phoneValue.number.trim()) {
          nextErrors.phoneNumber = "Phone number is required";
        } else if (!isValidPhone(phoneValue)) {
          nextErrors.phoneNumber = "Enter a valid phone number";
        }
      }
    }

    if (isRequest && !requestType) {
      nextErrors.requestType = "Request type is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Complete the required service details", "error");
      return;
    }
    await saveService({
      name, displayOrder, description, serviceContext, serviceType, apptType, serviceCategory,
      requestType,
      teleServiceMode,
      teleServicePlatform,
      meetingLink: needsMeetingLink ? meetingLink.trim() : undefined,
      phoneNumber: needsPhoneNumber ? (phoneValue.e164Number || `${phoneValue.countryCode}${phoneValue.number}`) : undefined,
      durHrs, durMins, numResources, maxBookings, showDuration, leadDays, leadHrs, leadMins,
      safeSlots, hasPricing, price, taxApplicable, hsnCode, 
      preServiceSchema, postServiceSchema, currencyCode, 
      assignUsers,
      practitionerPrices: Object.fromEntries(
        Object.entries(practitionerOverrides)
          .filter(([_, override]) => override.enabled)
          .map(([uid, override]) => [uid, override.price])
      ),
    }, serviceId);
    showToast(isEditMode ? "Service updated" : "Service created", "success");
    goBack();
  };

  if (hydrating || loadingService) {
    return <div className="p-6 text-sm text-slate-500">{isEditMode ? "Loading service..." : "Loading..."}</div>;
  }

  if (isEditMode && serviceError) {
    return (
      <div className="p-6">
        <ErrorState title="Failed to load service" description={serviceError} action={<Button onClick={() => navigate("/services")}>Back to Services</Button>} />
      </div>
    );
  }

  return (
    <section id="page-create-service" data-testid="bookings-create-service-page" className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
        <PageHeader
          title={isEditMode ? "Edit Service" : "Create Service"}
          back={{ label: "Back to services", href: "/services" }}
          onNavigate={(href) => navigate(href)}
          className="mb-0"
        />
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full box-border">
        <form id="bookings-create-service-form" data-testid="bookings-create-service-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: Service Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1. Service Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2">Service Context</span>
                <Button type="button" size="sm" variant={serviceContext === "General Service" ? "primary" : "secondary"} onClick={() => setServiceContext("General Service")} id="bookings-create-service-context-general" data-testid="bookings-create-service-context-general">General Service</Button>
              </div>
            </div>

            <FormSection title="">
              <Input
                id="bookings-create-service-name"
                data-testid="bookings-create-service-name"
                label="Service Name"
                required
                placeholder="e.g. Executive Cardiac Health Checkup"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                id="bookings-create-service-display-order"
                data-testid="bookings-create-service-display-order"
                label="Display Order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
              <div className="md:col-span-2">
                <Input
                  id="bookings-create-service-description"
                  data-testid="bookings-create-service-description"
                  label="Service Description"
                  placeholder="Describe medical consultation summary, suitability and patient instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </FormSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <label className="ds-form-label mb-2 block">Service Type</label>
                <div className="flex gap-2">
                  <Button type="button" variant={serviceType === "Onsite Service" ? "primary" : "secondary"} onClick={() => resetTeleService("Onsite Service")} fullWidth id="bookings-create-service-type-onsite" data-testid="bookings-create-service-type-onsite">Onsite Service</Button>
                  <Button type="button" variant={serviceType === "Teleservice" ? "primary" : "secondary"} onClick={() => resetTeleService("Teleservice")} fullWidth id="bookings-create-service-type-teleservice" data-testid="bookings-create-service-type-teleservice">Teleservice</Button>
                </div>
              </div>
              <div>
                <label className="ds-form-label mb-2 block">Appointment Type</label>
                <div className="flex gap-2">
                  <Button type="button" variant={apptType === "Booking" ? "primary" : "secondary"} onClick={() => {
                    setApptType("Booking");
                    setRequestType(undefined);
                  }} fullWidth id="bookings-create-service-appt-booking" data-testid="bookings-create-service-appt-booking">Booking</Button>
                  <Button type="button" variant={apptType === "Request" ? "primary" : "secondary"} onClick={() => setApptType("Request")} fullWidth id="bookings-create-service-appt-request" data-testid="bookings-create-service-appt-request">Request</Button>
                </div>
              </div>
              <div>
                <label className="ds-form-label mb-2 block">Service Category</label>
                <div className="flex gap-2">
                  <Button type="button" variant={serviceCategory === "Main Service" ? "primary" : "secondary"} onClick={() => setServiceCategory("Main Service")} fullWidth id="bookings-create-service-category-main" data-testid="bookings-create-service-category-main">Main Service</Button>
                  <Button type="button" variant={serviceCategory === "Sub Service" ? "primary" : "secondary"} onClick={() => setServiceCategory("Sub Service")} fullWidth id="bookings-create-service-category-sub" data-testid="bookings-create-service-category-sub">Sub Service</Button>
                </div>
              </div>
            </div>

            {isTeleservice ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mt-4">
                  <label className="ds-form-label mb-2 block">Teleservice Mode</label>
                  <div className="flex gap-2">
                    <Button type="button" variant={teleServiceMode === "Video Mode" ? "primary" : "secondary"} onClick={() => {
                      setTeleServiceMode("Video Mode");
                      setTeleServicePlatform(undefined);
                      setMeetingLink("");
                      setPhoneValue(EMPTY_PHONE);
                    }} fullWidth id="bookings-create-service-tele-mode-video" data-testid="bookings-create-service-tele-mode-video">Video Mode</Button>
                    <Button type="button" variant={teleServiceMode === "Audio Mode" ? "primary" : "secondary"} onClick={() => {
                      setTeleServiceMode("Audio Mode");
                      setTeleServicePlatform(undefined);
                      setMeetingLink("");
                      setPhoneValue(EMPTY_PHONE);
                    }} fullWidth id="bookings-create-service-tele-mode-audio" data-testid="bookings-create-service-tele-mode-audio">Audio Mode</Button>
                  </div>
                  {errors.teleServiceMode ? <p className="mt-1 text-xs text-red-600">{errors.teleServiceMode}</p> : null}
                </div>

                {teleServiceMode ? (
                  <div className="mt-5">
                    <label className="ds-form-label mb-2 block">{isVideoMode ? "Video Platform" : "Audio Platform"}</label>
                    <div className="flex flex-wrap gap-2">
                      {teleServicePlatformOptions.map((option) => (
                        <Button
                          key={option.value}
                          id={`bookings-create-service-tele-platform-${option.value.toLowerCase().replace(/\s+/g, "-")}`}
                          testId={`bookings-create-service-tele-platform-${option.value.toLowerCase().replace(/\s+/g, "-")}`}
                          type="button"
                          variant={teleServicePlatform === option.value ? "primary" : "secondary"}
                          onClick={() => {
                            setTeleServicePlatform(option.value);
                            setMeetingLink("");
                            setPhoneValue(EMPTY_PHONE);
                          }}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {errors.teleServicePlatform ? <p className="mt-1 text-xs text-red-600">{errors.teleServicePlatform}</p> : null}
                  </div>
                ) : null}

                {needsMeetingLink ? (
                  <div className="mt-5">
                    <Input
                      id={isAudioMode ? "bookings-create-service-meeting-link" : "bookings-create-service-meeting-id"}
                      data-testid={isAudioMode ? "bookings-create-service-meeting-link" : "bookings-create-service-meeting-id"}
                      label={isAudioMode ? "Meeting Link *" : "Meeting ID / Setup Link *"}
                      placeholder={isAudioMode ? "https://meet.google.com/xxx-xxxx-xxx" : "https://zoom.us/j/123456789"}
                      value={meetingLink}
                      onChange={(e) => {
                        setMeetingLink(e.target.value);
                        if (errors.meetingLink) setErrors((current) => ({ ...current, meetingLink: undefined }));
                      }}
                      error={errors.meetingLink}
                    />
                  </div>
                ) : null}

                {needsPhoneNumber ? (
                  <div className="mt-5">
                    <PhoneInput
                      id="bookings-create-service-phone-number"
                      testId="bookings-create-service-phone-number"
                      label="Phone Number *"
                      value={phoneValue}
                      onChange={(value) => {
                        setPhoneValue(value);
                        if (errors.phoneNumber) setErrors((current) => ({ ...current, phoneNumber: undefined }));
                      }}
                      error={errors.phoneNumber}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {isRequest ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800">Request Type</h3>
                <p className="mt-1 text-xs text-slate-500">Choose how much scheduling detail a patient must provide.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant={requestType === "With Date & Time" ? "primary" : "secondary"} onClick={() => setRequestType("With Date & Time")} id="bookings-create-service-request-type-date-time" data-testid="bookings-create-service-request-type-date-time">With Date & Time</Button>
                  <Button type="button" variant={requestType === "With Date Only" ? "primary" : "secondary"} onClick={() => setRequestType("With Date Only")} id="bookings-create-service-request-type-date-only" data-testid="bookings-create-service-request-type-date-only">With Date Only</Button>
                  <Button type="button" variant={requestType === "No Date & Time" ? "primary" : "secondary"} onClick={() => setRequestType("No Date & Time")} id="bookings-create-service-request-type-none" data-testid="bookings-create-service-request-type-none">No Date & Time</Button>
                </div>
                {errors.requestType ? <p className="mt-1 text-xs text-red-600">{errors.requestType}</p> : null}
              </div>
            ) : null}
          </div>

          {/* SECTION 2: Duration & Booking Rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-4 mb-6 border-b border-slate-100">2. Duration &amp; Booking Rules</h2>
            
            <FormSection title="Schedules & Limits">
              <div>
                <label className="ds-form-label mb-1.5 block">Estimated Duration *</label>
                <div className="flex gap-2 items-center">
                  <Input id="bookings-create-service-duration-hours" data-testid="bookings-create-service-duration-hours" type="number" min={0} value={durHrs} onChange={(e) => setDurHrs(Number(e.target.value))} />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">hr(s)</span>
                  <Input id="bookings-create-service-duration-minutes" data-testid="bookings-create-service-duration-minutes" type="number" min={0} value={durMins} onChange={(e) => setDurMins(Number(e.target.value))} />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">mins</span>
                </div>
              </div>
              <Input id="bookings-create-service-resources" data-testid="bookings-create-service-resources" type="number" min={1} label="Number of Resources" value={numResources} onChange={(e) => setNumResources(Number(e.target.value))} />
              <Input id="bookings-create-service-max-bookings" data-testid="bookings-create-service-max-bookings" type="number" min={1} label="Max Aligned Daily Bookings" value={maxBookings} onChange={(e) => setMaxBookings(Number(e.target.value))} />
              
              <div>
                <label className="ds-form-label mb-1.5 block">Minimum Booking Lead Notice</label>
                <div className="flex gap-2">
                  <Input id="bookings-create-service-lead-days" data-testid="bookings-create-service-lead-days" type="number" min={0} placeholder="Days" value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))} />
                  <Input id="bookings-create-service-lead-hours" data-testid="bookings-create-service-lead-hours" type="number" min={0} placeholder="Hours" value={leadHrs} onChange={(e) => setLeadHrs(Number(e.target.value))} />
                  <Input id="bookings-create-service-lead-minutes" data-testid="bookings-create-service-lead-minutes" type="number" min={0} placeholder="Mins" value={leadMins} onChange={(e) => setLeadMins(Number(e.target.value))} />
                </div>
              </div>
            </FormSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-700">Show Service Duration to Patients</div>
                  <div className="text-[11px] text-slate-400 mt-1">Display duration estimates in clinic scheduling</div>
                </div>
                <Switch checked={showDuration} onChange={setShowDuration} />
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-700">Show Only Safe Available Slots</div>
                  <div className="text-[11px] text-slate-400 mt-1">Filter fully occupied slots immediately</div>
                </div>
                <Switch checked={safeSlots} onChange={setSafeSlots} />
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Global Service Status</div>
                <div className="text-xs text-emerald-600 mt-1">No practitioners limited. This is configured as a Global Service.</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Assign User</h2>
                <p className="mt-1 text-xs text-slate-500">Enable this to assign specific users for this service.</p>
              </div>
              <Switch checked={assignUsers} onChange={setAssignUsers} />
            </div>

            {assignUsers ? (
              <div className="space-y-3">
                {users.map((user) => {
                  const uid = user.userUid;
                  const override = practitionerOverrides[uid] || { enabled: false, price: price };
                  return (
                    <div key={uid} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <Checkbox
                        id={`bookings-create-service-assign-user-${uid}`}
                        checked={override.enabled}
                        onChange={(e) =>
                          setPractitionerOverrides({
                            ...practitionerOverrides,
                            [uid]: { ...override, enabled: e.target.checked },
                          })
                        }
                        label={user.displayName}
                        className="min-w-[180px]"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* SECTION 3: Pricing & Payment */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">3. Pricing &amp; Payment</h2>
              <Switch checked={hasPricing} onChange={setHasPricing} />
            </div>
            {hasPricing && (
              <>
                <FormSection title="Pricing Configuration">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      id="bookings-create-service-currency"
                      label="Currency"
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value)}
                      options={[
                        { value: "INR", label: "INR (₹)" },
                        { value: "USD", label: "USD ($)" },
                        { value: "EUR", label: "EUR (€)" },
                        { value: "AED", label: "AED (د.إ)" },
                      ]}
                    />
                    <Input id="bookings-create-service-price" data-testid="bookings-create-service-price" type="number" min={0} label="Service Base Price" required value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                  </div>
                  <Select
                    id="bookings-create-service-tax-applicable"
                    data-testid="bookings-create-service-tax-applicable"
                    label="Tax Applicable"
                    value={String(taxApplicable)}
                    onChange={(e) => setTaxApplicable(e.target.value === "true")}
                    options={[
                      { value: "false", label: "No" },
                      { value: "true", label: "Yes" },
                    ]}
                  />
                </FormSection>

                {assignUsers ? (
                  <FormSection title="Practitioner Price Overrides" className="mt-6">
                    <p className="text-xs text-slate-500 mb-4">Set custom prices for assigned users providing this service.</p>
                    <div className="space-y-3">
                      {users
                        .filter((user) => practitionerOverrides[user.userUid]?.enabled)
                        .map((user) => {
                          const uid = user.userUid;
                          const override = practitionerOverrides[uid] || { enabled: false, price: price };
                          return (
                            <div key={uid} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <div className="min-w-[180px] text-sm font-medium text-slate-700">{user.displayName}</div>
                              <Input
                                type="number"
                                min={0}
                                value={override.price}
                                onChange={(e) => setPractitionerOverrides({ ...practitionerOverrides, [uid]: { ...override, price: Number(e.target.value) } })}
                                placeholder="Override Price"
                              />
                            </div>
                          );
                        })}
                    </div>
                  </FormSection>
                ) : null}
              </>
            )}
          </div>

          {/* SECTION 4: Customization */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-4 mb-6 border-b border-slate-100">4. Intake Forms & Questionnaires</h2>
            <SchemaBuilder 
              title="Pre-Service Questionnaire"
              description="Ask customers these questions before confirming their booking."
              fields={preServiceSchema}
              onChange={setPreServiceSchema}
            />
            <SchemaBuilder 
              title="Post-Service Questionnaire"
              description="Ask customers these questions after their service is completed."
              fields={postServiceSchema}
              onChange={setPostServiceSchema}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="secondary" onClick={goBack} id="bookings-create-service-cancel" data-testid="bookings-create-service-cancel">Cancel</Button>
            <Button type="submit" loading={submitting} id="bookings-create-service-submit" data-testid="bookings-create-service-submit">{isEditMode ? "Save Service" : "Create Service"}</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
