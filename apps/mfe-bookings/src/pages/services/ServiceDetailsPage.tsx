import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, ErrorState, PageHeader } from "@jaldee/design-system";
import { useServiceDetails, type ServiceDetailsRecord } from "../../services/useServiceDetails";

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function displayValue(value: unknown): ReactNode {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    return value.length ? (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge key={`${String(item)}-${index}`} variant="neutral">{String(item)}</Badge>
        ))}
      </div>
    ) : "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([key, child]) => (
          <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{humanizeKey(key)}</span>
            <div className="mt-1 text-sm text-slate-800">{displayValue(child)}</div>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DetailGrid({ items }: { items: Array<{ label: string; value: unknown }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className="mt-1 text-sm text-slate-800">{displayValue(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ServiceDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const initialService = (location.state as { service?: ServiceDetailsRecord } | null)?.service;
  const serviceId = params.id ?? initialService?.id ?? "";
  const { getService, loading, error } = useServiceDetails();
  const [service, setService] = useState<ServiceDetailsRecord | null>(initialService ?? null);

  useEffect(() => {
    if (!serviceId) return;
    if (initialService?.id === serviceId) return;
    let cancelled = false;
    async function load() {
      try {
        const details = await getService(serviceId);
        if (!cancelled) setService(details);
      } catch {
        if (!cancelled) setService(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getService, initialService, serviceId]);

  const additionalConfig = useMemo(() => {
    if (!service) return [];
    const excluded = new Set([
      "id", "uid", "name", "displayName", "description", "shortDescription", "status", "serviceCode", "code", "encId",
      "serviceCategory", "category", "serviceType", "appointmentType", "apptType", "requestType", "duration", "serviceDuration",
      "approxDuration", "displayOrder", "color", "consultationType", "serviceContext", "bookingEnabled", "onlineBooking",
      "leadDays", "leadHrs", "leadMins", "slotDuration", "maxBookings", "visibilityRules", "price", "serviceCharge", "amount",
      "taxApplicable", "hsnCode", "invoiceConfiguration", "currencyCode", "assignedProviders", "providers", "users", "labels",
      "tags", "teleService",
    ]);
    return Object.entries(service.raw).filter(([key, value]) => !excluded.has(key) && value != null && value !== "");
  }, [service]);

  if (loading && !service) {
    return <div className="p-6 text-sm text-slate-500">Loading service details...</div>;
  }

  if (error && !service) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load service details"
          description={error}
          action={<Button onClick={() => navigate("/services")}>Back to Services</Button>}
        />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-6">
        <EmptyState title="No service details available" description="Select a service from the grid to view its details." />
      </div>
    );
  }

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white px-8 py-4">
        <PageHeader
          title={service.name}
          subtitle={service.description || "Service configuration and availability."}
          back={{ label: "Back to services", href: "/services" }}
          onNavigate={() => navigate("/services")}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate("/services")}>Back</Button>
              <Button
                id={`bookings-service-details-edit-${service.id}`}
                data-testid={`bookings-service-details-edit-${service.id}`}
                onClick={() => navigate(`/services/edit/${service.id}`, { state: { service } })}
              >
                Edit
              </Button>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-slate-900">{service.name}</h1>
                <Badge variant={service.status === "Active" ? "success" : "neutral"}>{service.status}</Badge>
              </div>
              {service.serviceCode ? <p className="mt-2 text-sm text-slate-500">Code: {service.serviceCode}</p> : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <SectionCard title="Service Information">
              <DetailGrid
                items={[
                  { label: "Name", value: service.name },
                  { label: "Description", value: service.description },
                  { label: "Service Category", value: service.serviceCategory },
                  { label: "Consultation Type", value: service.consultationType },
                  { label: "Service Type", value: service.serviceType },
                  { label: "Appointment Type", value: service.appointmentType },
                  { label: "Request Type", value: service.requestType },
                  { label: "Duration", value: service.durationMinutes ? `${service.durationMinutes} mins` : undefined },
                  { label: "Display Order", value: service.displayOrder },
                  { label: "Color", value: service.color },
                  { label: "Status", value: service.status },
                ]}
              />
            </SectionCard>

            <SectionCard title="Booking Configuration">
              <DetailGrid
                items={[
                  { label: "Booking Enabled", value: service.bookingEnabled },
                  { label: "Online Booking", value: service.onlineBooking },
                  { label: "Lead Time", value: service.leadTime },
                  { label: "Slot Duration", value: service.slotDuration ? `${service.slotDuration} mins` : undefined },
                  { label: "Maximum Bookings", value: service.maxBookings },
                  { label: "Visibility Rules", value: service.visibilityRules },
                ]}
              />
            </SectionCard>

            <SectionCard title="Pricing">
              <DetailGrid
                items={[
                  { label: "Consultation Fee", value: service.price != null ? `${service.currencyCode ?? "INR"} ${service.price}` : undefined },
                  { label: "Tax Applicable", value: service.taxApplicable },
                  { label: "HSN Code", value: service.hsnCode },
                  { label: "Currency", value: service.currencyCode },
                ]}
              />
            </SectionCard>

            {additionalConfig.length ? (
              <SectionCard title="Additional Configuration">
                <DetailGrid items={additionalConfig.map(([key, value]) => ({ label: humanizeKey(key), value }))} />
              </SectionCard>
            ) : null}
          </div>

          <aside className="space-y-6">
            <SectionCard title="Assigned Providers">
              {service.assignedProviders?.length ? displayValue(service.assignedProviders) : <span className="text-sm text-slate-500">No providers assigned</span>}
            </SectionCard>

            <SectionCard title="Labels / Tags">
              {service.labels?.length || service.tags?.length
                ? displayValue([...(service.labels ?? []), ...(service.tags ?? [])])
                : <span className="text-sm text-slate-500">No labels or tags available</span>}
            </SectionCard>

            {service.teleService && Object.keys(service.teleService).length ? (
              <SectionCard title="Teleservice Configuration">
                <DetailGrid items={Object.entries(service.teleService).map(([key, value]) => ({ label: humanizeKey(key), value }))} />
              </SectionCard>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
