import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { useCreateService, type ServiceFormInput } from "../../services/useCreateService";
import { Button, FormSection, Input, Select, Switch, PageHeader } from "@jaldee/design-system";

export default function CreateServicePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { createService, submitting } = useCreateService();

  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [description, setDescription] = useState("");
  const [serviceContext, setServiceContext] = useState<ServiceFormInput["serviceContext"]>("General Service");
  const [serviceType, setServiceType] = useState<ServiceFormInput["serviceType"]>("Onsite Service");
  const [apptType, setApptType] = useState<ServiceFormInput["apptType"]>("Booking");
  const [serviceCategory, setServiceCategory] = useState<ServiceFormInput["serviceCategory"]>("Main Service");
  const [durHrs, setDurHrs] = useState(0);
  const [durMins, setDurMins] = useState(30);
  const [numResources, setNumResources] = useState(1);
  const [maxBookings, setMaxBookings] = useState(1);
  const [showDuration, setShowDuration] = useState(true);
  const [leadDays, setLeadDays] = useState(0);
  const [leadHrs, setLeadHrs] = useState(0);
  const [leadMins, setLeadMins] = useState(0);
  const [safeSlots, setSafeSlots] = useState(true);
  const [hasPricing, setHasPricing] = useState(false);
  const [price, setPrice] = useState(500);
  const [taxApplicable, setTaxApplicable] = useState(false);
  const [hsnCode, setHsnCode] = useState("None");
  const [customIntake, setCustomIntake] = useState(false);

  const goBack = () => navigate("/services");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast("Service name is required", "error"); return; }
    await createService({
      name, displayOrder, description, serviceContext, serviceType, apptType, serviceCategory,
      durHrs, durMins, numResources, maxBookings, showDuration, leadDays, leadHrs, leadMins,
      safeSlots, hasPricing, price, taxApplicable, hsnCode, customIntake,
    });
    showToast("Service created", "success");
    goBack();
  };

  return (
    <section id="page-create-service" data-testid="bookings-create-service-page" className="page-section active bg-slate-50 overflow-y-auto flex flex-col">
      <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
        <PageHeader
          title="Create Service"
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
                <Button size="sm" variant={serviceContext === "General Service" ? "primary" : "secondary"} onClick={() => setServiceContext("General Service")} id="bookings-create-service-context-general" data-testid="bookings-create-service-context-general">General Service</Button>
                <Button size="sm" variant={serviceContext === "Inpatient Service" ? "primary" : "secondary"} onClick={() => setServiceContext("Inpatient Service")} id="bookings-create-service-context-inpatient" data-testid="bookings-create-service-context-inpatient">Inpatient Service</Button>
              </div>
            </div>

            <FormSection title="Core Information">
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
                  <Button variant={serviceType === "Onsite Service" ? "primary" : "secondary"} onClick={() => setServiceType("Onsite Service")} fullWidth id="bookings-create-service-type-onsite" data-testid="bookings-create-service-type-onsite">Onsite</Button>
                  <Button variant={serviceType === "Teleservice" ? "primary" : "secondary"} onClick={() => setServiceType("Teleservice")} fullWidth id="bookings-create-service-type-teleservice" data-testid="bookings-create-service-type-teleservice">Telehealth</Button>
                </div>
              </div>
              <div>
                <label className="ds-form-label mb-2 block">Appointment Type</label>
                <div className="flex gap-2">
                  <Button variant={apptType === "Booking" ? "primary" : "secondary"} onClick={() => setApptType("Booking")} fullWidth id="bookings-create-service-appt-booking" data-testid="bookings-create-service-appt-booking">Booking</Button>
                  <Button variant={apptType === "Request" ? "primary" : "secondary"} onClick={() => setApptType("Request")} fullWidth id="bookings-create-service-appt-request" data-testid="bookings-create-service-appt-request">Request</Button>
                </div>
              </div>
              <div>
                <label className="ds-form-label mb-2 block">Service Category</label>
                <div className="flex gap-2">
                  <Button variant={serviceCategory === "Main Service" ? "primary" : "secondary"} onClick={() => setServiceCategory("Main Service")} fullWidth id="bookings-create-service-category-main" data-testid="bookings-create-service-category-main">Main Service</Button>
                  <Button variant={serviceCategory === "Sub Service" ? "primary" : "secondary"} onClick={() => setServiceCategory("Sub Service")} fullWidth id="bookings-create-service-category-sub" data-testid="bookings-create-service-category-sub">Sub Service</Button>
                </div>
              </div>
            </div>
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

          {/* SECTION 3: Pricing & Payment */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">3. Pricing &amp; Payment</h2>
              <Switch checked={hasPricing} onChange={setHasPricing} />
            </div>
            {hasPricing && (
              <FormSection title="Pricing Configuration">
                <Input id="bookings-create-service-price" data-testid="bookings-create-service-price" type="number" min={0} label="Service Price (₹)" required value={price} onChange={(e) => setPrice(Number(e.target.value))} />
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
                <Select
                  id="bookings-create-service-hsn-code"
                  data-testid="bookings-create-service-hsn-code"
                  label="HSN Code"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  options={[
                    { value: "None", label: "None" },
                    { value: "998511", label: "998511 (Clinical Services)" },
                  ]}
                />
              </FormSection>
            )}
          </div>

          {/* SECTION 5: Customization */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-4 mb-6 border-b border-slate-100">4. Customization</h2>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
              <div className="pr-4">
                <div className="text-sm font-bold text-slate-700">Enable Patient Custom Intake Fields</div>
                <div className="text-[11px] text-slate-400 mt-1">Gather allergies, medical files and previous prescriptions</div>
              </div>
              <Switch checked={customIntake} onChange={setCustomIntake} />
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <div>
                <div className="text-xs font-bold text-amber-800">Need Specialty Patient Questionnaires?</div>
                <div className="text-xs text-amber-600 mt-1">Jaldee can customize rich clinical intake templates. Contact medical setup support at (+91 8714766671).</div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="secondary" onClick={goBack} id="bookings-create-service-cancel" data-testid="bookings-create-service-cancel">Cancel</Button>
            <Button type="submit" loading={submitting} id="bookings-create-service-submit" data-testid="bookings-create-service-submit">Create Service</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
