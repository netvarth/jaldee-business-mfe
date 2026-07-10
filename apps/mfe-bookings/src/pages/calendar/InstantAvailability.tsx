import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, EmptyState, FormSection, Input, PageHeader, Select } from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import { useProviders } from "../../services/useProviders";
import { useInstantAvailability } from "../../services/useInstantAvailability";

export default function InstantAvailability() {
  const navigate = useNavigate();
  const { services } = useServices();
  const { providers } = useProviders();
  const { slots, loading, error, search } = useInstantAvailability();

  const [serviceUid, setServiceUid] = useState("");
  const [providerUid, setProviderUid] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const serviceOptions = useMemo(
    () => services.map((service) => ({ value: service.uid ?? service.id, label: service.name })),
    [services],
  );
  const providerOptions = useMemo(
    () => [{ value: "", label: "Any provider" }, ...providers.map((provider) => ({ value: provider.uid ?? provider.id, label: provider.name }))],
    [providers],
  );

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await search({ serviceUid, providerUid: providerUid || undefined, date });
  };

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white px-8 py-4">
        <PageHeader
          title="Quick Availability"
          subtitle="Query the instant availability endpoint to surface the next slots without loading full schedules."
          back={{ label: "Back to Calendars", href: "/calendars" }}
          onNavigate={(href) => navigate(href)}
        />
      </div>

      <div className="mx-auto w-full max-w-5xl space-y-6 p-8">
        <form onSubmit={handleSearch} className="rounded-xl border border-slate-200 bg-white p-6">
          <FormSection title="Search Criteria">
            <Select label="Service" required value={serviceUid} onChange={(event) => setServiceUid(event.target.value)} options={serviceOptions} />
            <Select label="Provider" value={providerUid} onChange={(event) => setProviderUid(event.target.value)} options={providerOptions} />
            <Input type="date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FormSection>
          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={loading} disabled={!serviceUid}>Search Availability</Button>
          </div>
        </form>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Next Available Slots</h2>
              <p className="mt-1 text-sm text-slate-500">Shows fast-response availability for the selected provider and service.</p>
            </div>
            {slots.length ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {slots.length} slots
              </span>
            ) : null}
          </div>

          <div className="mt-5">
            {!slots.length ? (
              <EmptyState
                title="No instant availability loaded"
                description={serviceUid ? "Run a search to see available slots from the quick availability endpoint." : "Select a service and search for availability."}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {slots.map((slot, index) => (
                  <article key={`${slot.startTime}-${slot.providerUid ?? index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-900">{slot.startTime} to {slot.endTime}</p>
                    <p className="mt-1 text-sm text-slate-600">{slot.providerName ?? "Any provider"}</p>
                    <p className="mt-1 text-xs text-slate-500">{slot.serviceName ?? "Selected service"}</p>
                    <p className="mt-3 text-xs font-semibold text-emerald-700">
                      {slot.availableCount ?? 1} spot{(slot.availableCount ?? 1) === 1 ? "" : "s"} available
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
