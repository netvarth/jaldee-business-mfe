import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, PageHeader, Select, Textarea } from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import { useServiceGroups } from "../../services/useServiceGroups";
import { useToast } from "../../contexts/ToastContext";
import type { ServiceGroupItem } from "../../types";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import DualListServicesModal from "../calendar/components/DualListServicesModal";

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);

export default function CreateServiceGroupPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editGroup = (state as { group?: ServiceGroupItem } | null)?.group;
  const filterClauses = useMemo<SearchFilterClause[]>(() => [{ id: "sys-isgroup", field: "isGroup", operator: "EQ", values: ["false"] }], []);
  const { services } = useServices(filterClauses);
  const { createGroup, updateGroup } = useServiceGroups();
  const { showToast } = useToast();

  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [showDescription, setShowDescription] = useState(Boolean(editGroup?.description));

  const [name, setName] = useState(editGroup?.name ?? "");
  const [description, setDescription] = useState(editGroup?.description ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(editGroup?.serviceIds ?? []);
  
  const [priceMode, setPriceMode] = useState<ServiceGroupItem["priceMode"]>(editGroup?.priceMode ?? "SUM_OF_LINKED_SERVICES");
  const [price, setPrice] = useState(editGroup?.price ?? 0);
  const [durationMode, setDurationMode] = useState<ServiceGroupItem["durationMode"]>(editGroup?.durationMode ?? "SUM_OF_LINKED_SERVICES");
  const [duration, setDuration] = useState(editGroup?.duration ?? 0);
  const [status, setStatus] = useState<"Active" | "Inactive">(editGroup?.status ?? "Active");
  const [labels, setLabels] = useState("");

  const activeServices = useMemo(() => services.filter((service) => service.status === "Active"), [services]);

  const computedPrice = useMemo(
    () => selectedServiceIds.reduce((sum, id) => sum + (services.find((service) => (service.uid ?? service.id) === id)?.price ?? 0), 0),
    [selectedServiceIds, services],
  );
  const computedDuration = useMemo(
    () => selectedServiceIds.reduce((sum, id) => sum + (services.find((service) => (service.uid ?? service.id) === id)?.duration ?? 0), 0),
    [selectedServiceIds, services],
  );

  const computedMaxPrice = useMemo(
    () => selectedServiceIds.reduce((max, id) => Math.max(max, services.find((service) => (service.uid ?? service.id) === id)?.price ?? 0), 0),
    [selectedServiceIds, services],
  );
  const computedMaxDuration = useMemo(
    () => selectedServiceIds.reduce((max, id) => Math.max(max, services.find((service) => (service.uid ?? service.id) === id)?.duration ?? 0), 0),
    [selectedServiceIds, services],
  );

  // Sync inputs with calculated values
  useMemo(() => {
    if (priceMode === "SUM_OF_LINKED_SERVICES") setPrice(computedPrice);
    else if (priceMode === "MAX_OF_LINKED_SERVICES") setPrice(computedMaxPrice);
  }, [computedPrice, computedMaxPrice, priceMode]);

  useMemo(() => {
    if (durationMode === "SUM_OF_LINKED_SERVICES") setDuration(computedDuration);
    else if (durationMode === "MAX_OF_LINKED_SERVICES") setDuration(computedMaxDuration);
  }, [computedDuration, computedMaxDuration, durationMode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      showToast("Service group name is required.", "error");
      return;
    }
    if (selectedServiceIds.length === 0) {
      showToast("Select at least one service for the group.", "error");
      return;
    }

    const payload = {
      name,
      description,
      serviceIds: selectedServiceIds,
      priceMode,
      price: priceMode === "FIXED" ? price : priceMode === "MAX_OF_LINKED_SERVICES" ? computedMaxPrice : computedPrice,
      durationMode,
      duration: durationMode === "OVERRIDE_DURATION" ? duration : durationMode === "MAX_OF_LINKED_SERVICES" ? computedMaxDuration : computedDuration,
      status,
    } as const;

    try {
      if (editGroup) {
        await updateGroup(editGroup.id, payload);
        showToast("Service group updated.", "success");
      } else {
        await createGroup(payload);
        showToast("Service group created.", "success");
      }
      navigate("/services/groups");
    } catch (error) {
      showToast("Failed to save service group. Please try again.", "error");
    }
  };

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-[#f8f9fc]">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white px-8 py-4">
        <PageHeader
          title={editGroup ? "Edit Service Group" : "Create Service Group"}
          subtitle="Bundle services under a reusable group for easier booking configuration."
          back={{ label: "Back to Groups", href: "/services/groups" }}
          onNavigate={(href) => navigate(href)}
        />
      </div>
      
      <div className="mx-auto w-full max-w-[1200px] p-0 md:p-6">
        <form onSubmit={handleSubmit} className="md:rounded-xl md:border border-[#e2e8f0] border-y md:border-y md:border-x bg-white md:shadow-sm overflow-hidden flex flex-col">
          
          <div className="p-8 pb-6 border-b border-[#e2e8f0]">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6b21a8] mb-6">Basic Package Info</h2>
            
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b] mb-2">Package Name *</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Executive General Health Checkup"
                className="w-full h-11 px-4 text-[14px] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
              />
            </div>

            {showDescription ? (
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b] mb-2">Description</label>
                <textarea 
                  rows={3}
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Enter package description..."
                  className="w-full p-4 text-[14px] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                />
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setShowDescription(true)}
                className="text-[14px] font-semibold text-[#6b21a8] hover:text-[#581c87]"
              >
                + Add Description (Optional)
              </button>
            )}
          </div>

          <div className="p-8 pb-4 border-b border-[#e2e8f0]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
              <div className="flex items-center gap-3">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6b21a8]">Bundle Clinical Services *</h2>
                {selectedServiceIds.length > 0 && (
                  <span className="bg-[#f3e8ff] text-[#6b21a8] text-[12px] font-bold px-3 py-1 rounded-full">
                    {selectedServiceIds.length} Selected
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsServicesModalOpen(true)}
                className="bg-[#f3e8ff] text-[#6b21a8] hover:bg-[#e9d5ff] font-semibold text-[13px] px-4 py-2 rounded-md transition-colors w-full sm:w-auto text-center"
              >
                + Add Service
              </button>
            </div>

            <div className="flex flex-col">
              {selectedServiceIds.length > 0 ? (
                selectedServiceIds.map((serviceId) => {
                  const service = services.find((s) => (s.uid ?? s.id) === serviceId);
                  if (!service) return null;
                  const initials = service.name.substring(0, 2).toUpperCase();
                  
                  return (
                    <div key={serviceId} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4 sm:gap-0 border-b border-[#f1f5f9] last:border-0 group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#f3e8ff] text-[#6b21a8] flex shrink-0 items-center justify-center font-bold text-[14px]">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[14px] text-[#0f172a] truncate">{service.name}</div>
                          <div className="text-[13px] text-[#64748b] truncate">{service.description || "General Medicine • Consultation"}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-12 w-full sm:w-auto pl-14 sm:pl-0">
                        <div className="flex items-center gap-8 sm:gap-12">
                          <div className="text-left sm:text-right">
                            <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">Duration</div>
                            <div className="font-bold text-[14px] text-[#334155]">{service.duration} mins</div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">Price</div>
                            <div className="font-bold text-[14px] text-[#334155]">₹{service.price}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedServiceIds((current) => current.filter((id) => id !== serviceId))}
                          className="text-[#94a3b8] hover:text-[#ef4444] transition-colors p-2 shrink-0"
                        >
                          <TrashIcon className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-[14px] text-[#64748b]">
                  No services added to this bundle yet.
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between bg-[#f8fafc] -mx-8 -mb-4 px-8 py-4 border-t border-[#e2e8f0]">
              <div className="font-bold text-[13px] text-[#334155]">Total Bundled: {selectedServiceIds.length} Service(s)</div>
              <div className="flex items-center gap-6 font-bold text-[13px] text-[#334155]">
                <span>Sum Duration: {computedDuration} mins</span>
                <span>Sum Cost: ₹{computedPrice}</span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#6b21a8] mb-6">Pricing &amp; Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b]">Package Fee Mode</label>
                </div>
                <div className="relative mb-4">
                  <select 
                    value={priceMode}
                    onChange={(e) => setPriceMode(e.target.value as ServiceGroupItem["priceMode"])}
                    className="w-full h-11 px-4 pr-10 text-[14px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                  >
                    <option value="SUM_OF_LINKED_SERVICES">Sum of linked services (₹{computedPrice})</option>
                    <option value="MAX_OF_LINKED_SERVICES">Max of linked services (₹{computedMaxPrice})</option>
                    <option value="FIXED">Fixed custom price</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
                
                {priceMode === "FIXED" && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b]">Package Fee (₹) *</label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b] font-medium">₹</span>
                      <input 
                        type="number" 
                        required 
                        min={0}
                        value={price} 
                        onChange={(e) => { setPrice(Number(e.target.value)); setPriceMode("FIXED"); }} 
                        className="w-full h-11 pl-8 pr-4 text-[14px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b]">Package Duration Mode</label>
                </div>
                <div className="relative mb-4">
                  <select 
                    value={durationMode}
                    onChange={(e) => setDurationMode(e.target.value as ServiceGroupItem["durationMode"])}
                    className="w-full h-11 px-4 pr-10 text-[14px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                  >
                    <option value="SUM_OF_LINKED_SERVICES">Sum of linked services ({computedDuration} mins)</option>
                    <option value="MAX_OF_LINKED_SERVICES">Max of linked services ({computedMaxDuration} mins)</option>
                    <option value="OVERRIDE_DURATION">Fixed custom duration</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>

                {durationMode === "OVERRIDE_DURATION" && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b]">Package Duration (Minutes) *</label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </span>
                      <input 
                        type="number" 
                        required 
                        min={1}
                        value={duration} 
                        onChange={(e) => { setDuration(Number(e.target.value)); setDurationMode("OVERRIDE_DURATION"); }} 
                        className="w-full h-11 pl-10 pr-4 text-[14px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b] mb-2">Status</label>
                <div className="relative">
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                    className="w-full h-11 px-4 pr-10 text-[14px] font-semibold bg-[#f8fafc] border border-[#e2e8f0] rounded-lg appearance-none focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-8 py-6 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/services/groups")}
              className="px-6 h-11 rounded-lg border border-[#cbd5e1] text-[#475569] font-bold text-[14px] hover:bg-[#f1f5f9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 h-11 rounded-lg bg-[#4c1d95] text-white font-bold text-[14px] hover:bg-[#5b21b6] transition-colors"
            >
              {editGroup ? "Update Package" : "Create Package"}
            </button>
          </div>
        </form>
      </div>

      <DualListServicesModal
        isOpen={isServicesModalOpen}
        onClose={() => setIsServicesModalOpen(false)}
        allServices={activeServices}
        initialSelectedServices={activeServices.filter((s) => selectedServiceIds.includes(s.uid ?? s.id ?? ""))}
        onSave={(selected) => {
          setSelectedServiceIds(selected.map((s) => s.uid ?? s.id ?? ""));
          setIsServicesModalOpen(false);
        }}
      />
    </section>
  );
}
