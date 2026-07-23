import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useCreateService, type ServiceFormInput } from "../../services/useCreateService";
import { Button, EmptyState, ErrorState, FormSection, Input, Select, Switch, PageHeader, Checkbox, PhoneInput, type PhoneInputValue } from "@jaldee/design-system";
import SchemaBuilder, { type SchemaField } from "./SchemaBuilder";
import { useUsers } from "../../services/useUsers";
import { useServiceDetails, toServiceFormPrefill, type ServiceDetailsRecord } from "../../services/useServiceDetails";
import DualListUsersModal from "../calendar/components/DualListUsersModal";

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

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
  const [prepaymentRequired, setPrepaymentRequired] = useState(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number | "">("");
  const [prePaymentType, setPrePaymentType] = useState<"FIXED" | "PERCENTAGE">("PERCENTAGE");
  const [multiCurrencyEnabled, setMultiCurrencyEnabled] = useState(false);
  const [internationalCurrency, setInternationalCurrency] = useState("USD");
  const [internationalPrice, setInternationalPrice] = useState<number | "">("");
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
    try {
      await saveService({
        name, displayOrder, description, serviceContext, serviceType, apptType, serviceCategory,
        requestType,
        teleServiceMode,
        teleServicePlatform,
        meetingLink: needsMeetingLink ? meetingLink.trim() : undefined,
        phoneNumber: needsPhoneNumber ? phoneValue.number : undefined,
        phoneCountryCode: needsPhoneNumber ? phoneValue.countryCode : undefined,
        durHrs, durMins, numResources, maxBookings, showDuration, leadDays, leadHrs, leadMins,
        safeSlots, hasPricing, price, taxApplicable, hsnCode,
        prepaymentRequired, prepaymentAmount, prePaymentType,
        preServiceSchema, postServiceSchema, currencyCode,
        assignUsers,
        practitionerPrices: Object.fromEntries(
          Object.entries(practitionerOverrides)
            .filter(([uid, override]) => override.enabled && isUuid(uid))
            .map(([uid, override]) => [uid, override.price])
        ),
      }, serviceId);
      showToast(isEditMode ? "Service updated" : "Service created", "success");
      goBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to save service.", "error");
    }
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
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-30">
        <PageHeader
          title={isEditMode ? "Edit Service" : "Create Service"}
          back={{ label: "Back to services", href: "/services" }}
          onNavigate={(href) => navigate(href)}
          className="mb-0"
        />
      </div>

      <div className="p-2 sm:p-4 md:p-8 max-w-5xl mx-auto w-full box-border">
        <form id="bookings-create-service-form" data-testid="bookings-create-service-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: Service Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1. Service Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2">Service Context</span>
                <Button type="button" size="sm" variant={serviceContext === "General Service" ? "primary" : "secondary"} onClick={() => setServiceContext("General Service")} id="bookings-create-service-context-general" data-testid="bookings-create-service-context-general">General Service</Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                  <Input
                    id="bookings-create-service-name"
                    data-testid="bookings-create-service-name"
                    label={<span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Service Name <span className="text-red-500">*</span></span>}
                    required
                    placeholder="e.g. Executive Cardiac Health Checkup"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <details className="mt-2 group">
                    <summary className="text-xs font-semibold text-indigo-600 cursor-pointer list-none flex items-center gap-1 mb-2">
                      <span className="group-open:hidden">+ Add Description (Optional)</span>
                      <span className="hidden group-open:inline">- Hide Description</span>
                    </summary>
                    <Input
                      id="bookings-create-service-description"
                      data-testid="bookings-create-service-description"
                      placeholder="Describe medical consultation summary, suitability and patient instructions..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </details>
                </div>
                <div className="md:col-span-1">
                  <Input
                    id="bookings-create-service-display-order"
                    data-testid="bookings-create-service-display-order"
                    label={<span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Display Order</span>}
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
                <div className="order-1 md:order-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">Service Type</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => resetTeleService("Onsite Service")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold whitespace-nowrap transition-colors ${serviceType === "Onsite Service" ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                      Onsite
                    </button>
                    <button type="button" onClick={() => resetTeleService("Teleservice")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${serviceType === "Teleservice" ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                      Teleservice
                    </button>
                  </div>
                </div>
              {isTeleservice ? (
                <div className="order-2 md:order-4 md:col-span-3 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a32a3" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    <h3 className="text-sm font-bold text-[#5a32a3] uppercase tracking-wider">Teleservice Setup Rules</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">Teleservice Mode</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setTeleServiceMode("Video Mode"); setTeleServicePlatform(undefined); setMeetingLink(""); setPhoneValue(EMPTY_PHONE); }} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${teleServiceMode === "Video Mode" ? "border-[#5a32a3] text-[#5a32a3] bg-[#f8f5ff]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                          Video Mode
                        </button>
                        <button type="button" onClick={() => { setTeleServiceMode("Audio Mode"); setTeleServicePlatform(undefined); setMeetingLink(""); setPhoneValue(EMPTY_PHONE); }} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${teleServiceMode === "Audio Mode" ? "border-[#5a32a3] text-[#5a32a3] bg-[#f8f5ff]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          Audio Mode
                        </button>
                      </div>
                      {errors.teleServiceMode ? <p className="mt-1 text-xs text-red-600">{errors.teleServiceMode}</p> : null}
                    </div>

                    {teleServiceMode ? (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">{isVideoMode ? "Video Platform *" : "Audio Platform *"}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {teleServicePlatformOptions.map((option) => {
                            let icon = null;
                            if (option.value === "Zoom") icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
                            else if (option.value === "Google Meet") icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 17V7c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2z"></path><polygon points="18 10 22 7 22 17 18 14"></polygon></svg>;
                            else if (option.value === "Jaldee Video") icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
                            else if (option.value === "WhatsApp") icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>;
                            else if (option.value === "Phone") icon = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => { setTeleServicePlatform(option.value); setMeetingLink(""); setPhoneValue(EMPTY_PHONE); }}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-xs font-semibold transition-colors ${teleServicePlatform === option.value ? "border-[#5a32a3] text-[#5a32a3] bg-[#f8f5ff]" : (option.value === "Google Meet" || option.value === "WhatsApp" ? "border-slate-200 text-emerald-600 hover:bg-slate-50" : "border-slate-200 text-[#5a32a3] hover:bg-slate-50")}`}
                              >
                                {icon}
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        {errors.teleServicePlatform ? <p className="mt-1 text-xs text-red-600">{errors.teleServicePlatform}</p> : null}
                      </div>
                    ) : null}
                  </div>

                  {needsMeetingLink ? (
                    <div className="mt-5">
                      <Input   
                        id={isAudioMode ? "bookings-create-service-meeting-link" : "bookings-create-service-meeting-id"}
                        data-testid={isAudioMode ? "bookings-create-service-meeting-link" : "bookings-create-service-meeting-id"}
                        label={<span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{isAudioMode ? "Meeting Link *" : "Meeting ID Setup Link *"}</span>}
                        placeholder={isAudioMode ? "https://meet.google.com/xxx-xxxx-xxx" : "e.g. https://zoom.us/j/948332190"}
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

                <div className="order-3 md:order-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">Appointment Type</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setApptType("Booking"); setRequestType(undefined); }} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${apptType === "Booking" ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      Booking
                    </button>
                    <button type="button" onClick={() => setApptType("Request")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${apptType === "Request" ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      Request
                    </button>
                  </div>
                </div>
              {isRequest ? (
                <div className="order-4 md:order-5 md:col-span-3 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a32a3" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <h3 className="text-sm font-bold text-[#5a32a3] uppercase tracking-wider">Request Configuration Rules</h3>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">Request Type <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <button type="button" onClick={() => setRequestType("With Date & Time")} className={`text-left p-4 rounded-lg border relative transition-colors ${requestType === "With Date & Time" ? "border-[#5a32a3] bg-[#f8f5ff]" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        {requestType === "With Date & Time" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-[#5a32a3] rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 text-sm font-bold mb-2 ${requestType === "With Date & Time" ? "text-[#5a32a3]" : "text-slate-700"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          With Date and Time
                        </div>
                        <p className="text-xs text-slate-500">Requires patients to propose a preferred date and specific time slot.</p>
                      </button>

                      <button type="button" onClick={() => setRequestType("With Date Only")} className={`text-left p-4 rounded-lg border relative transition-colors ${requestType === "With Date Only" ? "border-[#5a32a3] bg-[#f8f5ff]" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        {requestType === "With Date Only" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-[#5a32a3] rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 text-sm font-bold mb-2 ${requestType === "With Date Only" ? "text-[#5a32a3]" : "text-slate-700"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          With Date only
                        </div>
                        <p className="text-xs text-slate-500">Requires patients to specify only the date/day, with no time slot required.</p>
                      </button>

                      <button type="button" onClick={() => setRequestType("No Date & Time")} className={`text-left p-4 rounded-lg border relative transition-colors ${requestType === "No Date & Time" ? "border-[#5a32a3] bg-[#f8f5ff]" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        {requestType === "No Date & Time" && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-[#5a32a3] rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 text-sm font-bold mb-2 ${requestType === "No Date & Time" ? "text-[#5a32a3]" : "text-slate-700"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          No Date & Time
                        </div>
                        <p className="text-xs text-slate-500">Can request booking without any specific date, day or time constraint.</p>
                      </button>

                    </div>
                    {errors.requestType ? <p className="mt-1 text-xs text-red-600">{errors.requestType}</p> : null}
                  </div>
                </div>
              ) : null}

                <div className="order-5 md:order-3">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 block">Service Category</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setServiceCategory("Main Service")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${serviceCategory === "Main Service" ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                      Main Service
                    </button>
                    <button type="button" onClick={() => setServiceCategory("Sub Service")} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md border text-sm font-semibold transition-colors ${serviceCategory === "Sub Service" ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 13l4 4"></path><path d="M11 11L7 7"></path></svg>
                      Sub Service
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>

          {/* SECTION 2: Duration & Booking Rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
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

          {/* SECTION 3: Pricing & Payment */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm mt-6">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  3. PRICING & PAYMENT INFO
                </h2>
                <p className="mt-1 text-xs text-slate-500 font-medium">Does this service have pricing?</p>
              </div>
              <Switch checked={hasPricing} onChange={setHasPricing} />
            </div>
            
            {hasPricing && (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Service Price *</label>
                  <div className="relative max-w-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      min={0}
                      required
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="block w-full rounded-md border border-slate-200 pl-8 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded bg-indigo-50 p-1 text-indigo-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Auto-Generate Invoice Receipt</p>
                        <p className="text-xs text-slate-500">Instantly raise receipt upon booking confirmation.</p>
                      </div>
                    </div>
                    <Switch checked={true} onChange={() => {}} />
                  </div>
                  <div className="flex flex-col border-b border-slate-100">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded bg-indigo-50 p-1 text-indigo-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Require Advance Deposit</p>
                          <p className="text-xs text-slate-500">Deposit is mandatory for patients prior to clinical check-in.</p>
                        </div>
                      </div>
                      <Switch checked={prepaymentRequired} onChange={setPrepaymentRequired} />
                    </div>
                    {prepaymentRequired && (
                      <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                            <button type="button" onClick={() => setPrePaymentType("PERCENTAGE")} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors ${prePaymentType === "PERCENTAGE" ? "bg-[#0f172a] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Percentage (%)</button>
                            <button type="button" onClick={() => setPrePaymentType("FIXED")} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-colors ${prePaymentType === "FIXED" ? "bg-[#0f172a] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Fixed Amount (₹)</button>
                          </div>
                          <div className="relative w-28">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-medium text-[11px]">{prePaymentType === "PERCENTAGE" ? "%" : "₹"}</span>
                            <input type="number" min={0} value={prepaymentAmount} onChange={(e) => setPrepaymentAmount(Number(e.target.value))} className="block w-full rounded-md border border-slate-200 pl-7 pr-3 py-1.5 text-xs font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded bg-indigo-50 p-1 text-indigo-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Apply Clinic GST Slabs</p>
                        <p className="text-xs text-slate-500">Determine applicable healthcare GST on final checkout.</p>
                      </div>
                    </div>
                    <Switch checked={taxApplicable} onChange={setTaxApplicable} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded bg-indigo-50 p-1 text-indigo-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Enable Multi-Currency ($ / £) International Pricing</p>
                          <p className="text-xs text-slate-500">Essential configuration for overseas medical consultation, NRI patients, or global health tourism.</p>
                        </div>
                      </div>
                      <Switch checked={multiCurrencyEnabled} onChange={setMultiCurrencyEnabled} />
                    </div>
                    {multiCurrencyEnabled && (
                      <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 pt-3 flex gap-4 items-center justify-end">
                        <Select 
                          id="bookings-intl-currency"
                          value={internationalCurrency}
                          onChange={(e) => setInternationalCurrency(e.target.value)}
                          containerClassName="w-32 mb-0"
                          options={[
                            { value: "USD", label: "USD ($)" },
                            { value: "EUR", label: "EUR (€)" },
                            { value: "GBP", label: "GBP (£)" },
                            { value: "AED", label: "AED (د.إ)" },
                          ]}
                        />
                        <div className="relative w-32 mt-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-medium text-xs">
                            {internationalCurrency === "USD" ? "$" : internationalCurrency === "EUR" ? "€" : internationalCurrency === "GBP" ? "£" : internationalCurrency === "AED" ? "د.إ" : ""}
                          </span>
                          <input type="number" min={0} value={internationalPrice} onChange={(e) => setInternationalPrice(Number(e.target.value))} className="block w-full rounded-md border border-slate-200 pl-7 pr-3 py-[9px] text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" placeholder="Amount" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-4">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    GATEWAY ROUTING & ACCEPTED PAYMENT MODES
                  </h3>
                  
                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">DIRECT ROUTED PAYMENT PROFILE</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-[#5a32a3] bg-[#f8f5ff] rounded-lg p-3 flex items-start gap-3 cursor-pointer">
                          <div className="mt-0.5"><Checkbox checked={true} onChange={() => {}} /></div>
                          <div>
                            <p className="text-sm font-bold text-[#5a32a3]">Jaldee Primary Gateway</p>
                            <p className="text-xs text-slate-500">UPI, Debit Cards, Credit Cards, and Net Banking instantly settled.</p>
                          </div>
                        </div>
                        <div className="border border-slate-200 bg-white rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50">
                          <div className="mt-0.5"><Checkbox checked={false} onChange={() => {}} /></div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Specialty Package Escrow</p>
                            <p className="text-xs text-slate-500">Insurance claim validation, corporate health allowance, and package routing.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ACCEPTED NATIONAL PAYMENT MODES</p>
                      <div className="flex flex-wrap gap-2">
                        {["UPI", "Credit Card", "Debit Card", "Net Banking"].map(m => (
                          <span key={m} className="px-3 py-1 rounded-full bg-[#0f172a] text-white text-[11px] font-semibold">{m}</span>
                        ))}
                        {["Wallet", "Pay Later"].map(m => (
                          <span key={m} className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold">{m}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ACCEPTED INTERNATIONAL MODES</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#0f172a] text-white text-[11px] font-semibold">Credit Card</span>
                        <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold">Debit Card</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* SECTION 4: Assign User */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm mt-6">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">4. Assign User</h2>
                <p className="mt-1 text-xs text-slate-500">Enable this to assign specific users for this service.</p>
              </div>
              <Switch checked={assignUsers} onChange={setAssignUsers} />
            </div>

            {assignUsers ? (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center rounded-lg border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-600 hover:border-[#7c3aed] hover:text-[#7c3aed] bg-white hover:bg-slate-50 transition-colors"
                  onClick={() => setIsUsersModalOpen(true)}
                >
                  + Add Users
                </Button>
                
                {users.filter(u => practitionerOverrides[u.userUid]?.enabled).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Selected Users</h3>
                    
                    {!hasPricing ? (
                      <div className="flex flex-wrap gap-3">
                        {users.filter(u => practitionerOverrides[u.userUid]?.enabled).map(user => (
                          <div key={user.userUid} className="flex items-center gap-2 bg-[#f5f3ff] px-3 py-1.5 rounded-full border border-[#ede9fe]">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-[#7c3aed]">{user.displayName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {users
                          .filter((user) => practitionerOverrides[user.userUid]?.enabled)
                          .map((user) => {
                            const uid = user.userUid;
                            const override = practitionerOverrides[uid] || { enabled: false, price: price };
                            return (
                              <div key={uid} className="flex items-center justify-between gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">
                                    {user.displayName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="text-sm font-medium text-slate-700">{user.displayName}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-slate-400 font-medium uppercase hidden sm:inline-block">Override Base Price</span>
                                  <div className="relative w-32">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-medium">₹</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={override.price}
                                      onChange={(e) => setPractitionerOverrides({ ...practitionerOverrides, [uid]: { ...override, price: Number(e.target.value) } })}
                                      placeholder="Price"
                                      className="block w-full rounded-md border border-slate-200 pl-8 pr-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* SECTION 5: Customization */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mt-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-4 mb-6 border-b border-slate-100">5. Intake Forms &amp; Questionnaires</h2>
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
            <Button type="submit" loading={submitting} id="bookings-create-service-submit" data-testid="bookings-create-service-submit">{isEditMode ? "Update Service" : "Create Service"}</Button>
          </div>
        </form>
      </div>

      <DualListUsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        serviceName={name || "this service"}
        allUsers={users.map(u => ({ id: u.userUid, name: u.displayName, role: u.designation || "Practitioner" }))}
        initialSelectedUsers={users.filter(u => practitionerOverrides[u.userUid]?.enabled).map(u => ({ id: u.userUid, name: u.displayName, role: u.designation || "Practitioner" }))}
        onSave={(selectedUsers) => {
          const nextOverrides = { ...practitionerOverrides };
          // Disable all users first
          Object.keys(nextOverrides).forEach(uid => {
            nextOverrides[uid].enabled = false;
          });
          // Enable selected users
          selectedUsers.forEach(su => {
            if (!nextOverrides[su.id]) {
              nextOverrides[su.id] = { enabled: true, price: price };
            } else {
              nextOverrides[su.id].enabled = true;
            }
          });
          setPractitionerOverrides(nextOverrides);
          setIsUsersModalOpen(false);
        }}
      />
    </section>
  );
}
