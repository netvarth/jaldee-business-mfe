import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Checkbox, FormSection, Input, PageHeader, Select, Textarea } from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import { useServiceGroups } from "../../services/useServiceGroups";
import { useToast } from "../../contexts/ToastContext";
import type { ServiceGroupItem } from "../../types";

export default function CreateServiceGroupPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editGroup = (state as { group?: ServiceGroupItem } | null)?.group;
  const { services } = useServices();
  const { createGroup, updateGroup } = useServiceGroups();
  const { showToast } = useToast();

  const [name, setName] = useState(editGroup?.name ?? "");
  const [description, setDescription] = useState(editGroup?.description ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(editGroup?.serviceIds ?? []);
  const [priceMode, setPriceMode] = useState<"sum" | "fixed">(editGroup?.priceMode ?? "sum");
  const [price, setPrice] = useState(editGroup?.price ?? 0);
  const [durationMode, setDurationMode] = useState<"sum" | "override">(editGroup?.durationMode ?? "sum");
  const [duration, setDuration] = useState(editGroup?.duration ?? 30);
  const [status, setStatus] = useState<"Active" | "Inactive">(editGroup?.status ?? "Active");

  const activeServices = useMemo(() => services.filter((service) => service.status === "Active"), [services]);

  const computedPrice = useMemo(
    () => selectedServiceIds.reduce((sum, id) => sum + (services.find((service) => (service.uid ?? service.id) === id)?.price ?? 0), 0),
    [selectedServiceIds, services],
  );
  const computedDuration = useMemo(
    () => selectedServiceIds.reduce((sum, id) => sum + (services.find((service) => (service.uid ?? service.id) === id)?.duration ?? 0), 0),
    [selectedServiceIds, services],
  );

  const handleSubmit = (event: React.FormEvent) => {
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
      price: priceMode === "fixed" ? price : computedPrice,
      durationMode,
      duration: durationMode === "override" ? duration : computedDuration,
      status,
    } as const;

    if (editGroup) {
      updateGroup(editGroup.id, payload);
      showToast("Service group updated.", "success");
    } else {
      createGroup(payload);
      showToast("Service group created.", "success");
    }

    navigate("/services/groups");
  };

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white px-8 py-4">
        <PageHeader
          title={editGroup ? "Edit Service Group" : "Create Service Group"}
          subtitle="Bundle services under a reusable group for easier booking configuration."
          back={{ label: "Back to Groups", href: "/services/groups" }}
          onNavigate={(href) => navigate(href)}
        />
      </div>

      <div className="mx-auto w-full max-w-4xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <FormSection title="Basic Details">
              <Input label="Group name" required value={name} onChange={(event) => setName(event.target.value)} />
              <Textarea label="Description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
              <Select
                label="Status"
                value={status}
                onChange={(event) => setStatus(event.target.value as "Active" | "Inactive")}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
              />
            </FormSection>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <FormSection title="Linked Services">
              <div className="grid gap-3 md:grid-cols-2">
                {activeServices.map((service) => {
                  const serviceId = service.uid ?? service.id;
                  return (
                    <Checkbox
                      key={serviceId}
                      checked={selectedServiceIds.includes(serviceId)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedServiceIds((current) => [...current, serviceId]);
                        } else {
                          setSelectedServiceIds((current) => current.filter((value) => value !== serviceId));
                        }
                      }}
                      label={`${service.name} · ₹${service.price} · ${service.duration} mins`}
                    />
                  );
                })}
              </div>
            </FormSection>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <FormSection title="Pricing">
                <Select
                  label="Pricing mode"
                  value={priceMode}
                  onChange={(event) => setPriceMode(event.target.value as "sum" | "fixed")}
                  options={[
                    { value: "sum", label: "Sum of linked services" },
                    { value: "fixed", label: "Fixed package price" },
                  ]}
                />
                {priceMode === "fixed" ? (
                  <Input type="number" min={0} label="Fixed price" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
                ) : (
                  <p className="text-sm text-slate-500">Calculated total: ₹{computedPrice}</p>
                )}
              </FormSection>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <FormSection title="Duration">
                <Select
                  label="Duration mode"
                  value={durationMode}
                  onChange={(event) => setDurationMode(event.target.value as "sum" | "override")}
                  options={[
                    { value: "sum", label: "Sum of linked services" },
                    { value: "override", label: "Override duration" },
                  ]}
                />
                {durationMode === "override" ? (
                  <Input type="number" min={1} label="Duration in minutes" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
                ) : (
                  <p className="text-sm text-slate-500">Calculated total: {computedDuration} mins</p>
                )}
              </FormSection>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/services/groups")}>Cancel</Button>
            <Button type="submit">{editGroup ? "Save Group" : "Create Group"}</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
