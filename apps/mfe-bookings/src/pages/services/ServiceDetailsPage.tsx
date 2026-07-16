import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, ErrorState, PageHeader } from "@jaldee/design-system";
import { useServiceDetails, type ServiceDetailsRecord } from "../../services/useServiceDetails";

const FileIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5 text-indigo-500"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5 text-indigo-500"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5 text-indigo-500"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
);
const FinanceIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5 text-indigo-500"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
);
const CardIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5 text-indigo-500"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
);
const TagIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-5 h-5 text-indigo-500"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
);
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4 text-emerald-600"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
);

function humanize(val: unknown): string | null {
  if (typeof val !== "string") return null;
  return val
    .replace(/[_]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function SectionCard({ title, icon, rightElement, children, subtitle }: { title: string; icon: ReactNode; rightElement?: ReactNode; children: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
            {icon}
          </div>
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          </div>
        </div>
        {rightElement}
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, rightValue }: { label: string; rightValue?: ReactNode }) {
  if (rightValue == null || rightValue === "") return null;
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="text-sm font-semibold text-slate-800 flex items-center gap-2 text-right">
        {rightValue}
      </div>
    </div>
  );
}

function GridBox({ label, value }: { label: string; value?: ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
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

  const raw = service.raw as Record<string, any>;
  const hasLabels = Array.isArray(raw.labels) && raw.labels.length > 0;
  const hasConsumerNote = !!(raw.consumerNoteTitle || raw.consumerNoteText);

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-slate-50/50">
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
                onClick={() => navigate(`/services/edit/${service.id}`, { state: { service } })}
              >
                Edit
              </Button>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(380px,1fr)] items-start">
          <div className="space-y-6">
            
            {/* CLINICAL DESCRIPTION & SCOPE */}
            <SectionCard
              title="CLINICAL DESCRIPTION & SCOPE"
              icon={<FileIcon />}
              rightElement={
                (raw.serviceCode || raw.uid) ? (
                  <span className="rounded bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {raw.serviceCode || (raw.uid ? raw.uid.slice(0, 8).toUpperCase() : service.id)}
                  </span>
                ) : null
              }
            >
              {(raw.description || raw.internalDescription) && (
                <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm italic text-slate-700">
                  "{raw.description || raw.internalDescription}"
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <GridBox label="Context Scope" value={humanize(raw.serviceMode || service.consultationType)} />
                <GridBox label="Service Category" value={humanize(raw.category || service.serviceCategory)} />
                <GridBox label="Display Order" value={raw.displayOrder != null ? `Rank ${raw.displayOrder}` : null} />
              </div>
            </SectionCard>

            {/* DURATION & BOOKING RULES */}
            <SectionCard
              title="DURATION & BOOKING RULES"
              icon={<ClockIcon />}
              rightElement={
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 text-[11px] uppercase tracking-wider">
                  <CheckIcon /> VALIDATED CONFIGURATION
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                <DetailRow label="Service Direct Action" rightValue={humanize(raw.bookingMode)} />
                <DetailRow label="Time Proposal Method" rightValue={humanize(raw.serviceBookingType)} />
                <DetailRow 
                  label="Estimated Duration" 
                  rightValue={raw.duration != null ? (
                    <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4 text-slate-400" /> {raw.duration} mins</span>
                  ) : null} 
                />
                <DetailRow 
                  label="Slot Visibility Displayed" 
                  rightValue={raw.serviceDurationEnabled != null ? (raw.serviceDurationEnabled ? <span className="text-emerald-600">Show Estimated Duration</span> : "Hidden") : null} 
                />
                <DetailRow label="Consultation Chambers" rightValue={raw.resourcesRequired != null ? `${raw.resourcesRequired} allocated resource room(s)` : null} />
                <DetailRow label="Lead Scheduling Time Policy" rightValue={raw.leadTime != null ? `${raw.leadTime}h` : null} />
                <DetailRow label="Max Bookings per Slot" rightValue={raw.maxBookingsPerConsumer != null ? `Max ${raw.maxBookingsPerConsumer} Patient(s)` : null} />
                <DetailRow label="Only Available Slots" rightValue={raw.showOnlyAvailableSlots != null ? (raw.showOnlyAvailableSlots ? "Enabled" : "Disabled") : null} />
              </div>
            </SectionCard>

            {/* ASSIGNED PROVIDERS & RATES */}
            <SectionCard
              title="ASSIGNED PROVIDERS & RATES"
              icon={<UsersIcon />}
              rightElement={
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  {Array.isArray(raw.users) ? raw.users.length : 0} Doctor(s) Connected
                </span>
              }
            >
              {Array.isArray(raw.users) && raw.users.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                  {raw.users.map((user: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-sm font-bold text-white shadow-sm">
                          {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : (user.userUid ? user.userUid.slice(0, 2).toUpperCase() : 'U')}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {user.displayName || `Provider ${user.userUid?.slice(0, 5).toUpperCase()}`}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">General Medicine</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Consult Rate</div>
                        <div className="font-bold text-indigo-700">{user.currencyCode === 'INR' ? '₹' : (user.currencyCode || '')}{user.price}</div>
                        <div className="text-[10px] font-bold text-emerald-600">Custom Rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No providers assigned</div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            
            {/* FINANCES & BILLING */}
            <SectionCard
              title="FINANCES & BILLING"
              icon={<FinanceIcon />}
              subtitle="Taxes, billing automation & payment modes"
            >
              {raw.price != null && (
                <div className="mb-6 rounded-2xl bg-indigo-50/50 p-6 text-center border border-indigo-50">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-700">Base Consultation Fee</div>
                  <div className="my-2 text-4xl font-extrabold text-indigo-700 tracking-tight">
                    {raw.currencyCode === 'INR' ? '₹' : (raw.currencyCode || '')}{raw.price}
                  </div>
                  <div className="text-xs font-medium text-slate-500">Charges assessed per patient token</div>
                </div>
              )}

              <div className="space-y-1">
                <DetailRow label="Auto Invoice Generation" rightValue={raw.autoGenerateInvoice != null ? (raw.autoGenerateInvoice ? <span className="text-emerald-600 font-bold uppercase">AUTO</span> : <span className="text-slate-600 font-bold uppercase">MANUAL</span>) : null} />
                <DetailRow label="Advance Token Booking" rightValue={raw.prePaymentType ? <span className="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold uppercase text-slate-600">{humanize(raw.prePaymentType)}</span> : null} />
                <DetailRow label="Tax Applicable" rightValue={raw.taxPreference ? humanize(raw.taxPreference) : null} />
                <DetailRow label="HSN Code Matrix" rightValue={raw.hsnCode || null} />
              </div>
            </SectionCard>

            {/* PAYMENT CHANNELS - Only show if there's payment data, else omitted as per "null responses no need to show" */}
            {(raw.bankType || raw.bankId) && (
              <SectionCard
                title="PAYMENT CHANNELS"
                icon={<CardIcon />}
              >
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Accepted National Channels</div>
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckIcon /> UPI</span>
                  <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckIcon /> Credit Card</span>
                  <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckIcon /> Debit Card</span>
                </div>
              </SectionCard>
            )}

            {/* CLINICAL DIRECT LABELS */}
            {(hasLabels || hasConsumerNote) && (
              <SectionCard
                title="CLINICAL DIRECT LABELS"
                icon={<TagIcon />}
              >
                {hasLabels && (
                  <div className="mb-6">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Aggregated System Labels</div>
                    <div className="flex flex-wrap gap-2">
                      {raw.labels.map((label: string, idx: number) => (
                        <span key={idx} className="flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                          <TagIcon className="w-3.5 h-3.5" /> {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {hasConsumerNote && (
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Booking Instructions</div>
                    <div className="rounded-lg bg-emerald-50/50 p-4 text-sm font-medium text-emerald-800 border border-emerald-100">
                      {raw.consumerNoteTitle && <div className="font-bold mb-1">{raw.consumerNoteTitle}</div>}
                      {raw.consumerNoteText}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
