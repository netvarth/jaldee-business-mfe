import { Button, EmptyState, SectionCard, Tabs } from "@jaldee/design-system";
import { useMemo, useState } from "react";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";
import { useIpDetail } from "../queries/ip";
import { StatusPill } from "./shared";

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("discharge")) return "amber" as const;
  if (normalized.includes("observation")) return "sky" as const;
  if (normalized.includes("cancel")) return "rose" as const;
  return "teal" as const;
}

function resolveIpUid(recordId?: string | null, subview?: string | null) {
  return recordId || subview || null;
}

function resolveInitialTab(tab?: string | null) {
  const normalized = String(tab ?? "").trim().toLowerCase();

  switch (normalized) {
    case "invoice":
    case "invoices":
      return "invoices";
    case "prescription":
    case "prescriptions":
      return "prescriptions";
    case "vital":
    case "vitals":
      return "vitals";
    case "bed-transaction":
    case "bed-transactions":
    case "bedtransactions":
      return "bedTransactions";
    case "log":
      return "log";
    default:
      return "services";
  }
}

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <EmptyState title={title} description={description} />
    </SectionCard>
  );
}

export function IpDetails() {
  const { routeParams, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const ipUid = resolveIpUid(routeParams?.recordId, routeParams?.subview);
  const detailQuery = useIpDetail(ipUid);
  const detail = detailQuery.data;
  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(routeParams?.tab));

  const tabItems = useMemo(
    () => [
      { value: "services", label: "Services" },
      { value: "invoices", label: "Invoices" },
      { value: "prescriptions", label: "Prescriptions" },
      { value: "vitals", label: "Vitals" },
      { value: "bedTransactions", label: "Bed Transactions" },
      { value: "log", label: "Log" },
    ],
    []
  );

  if (!ipUid) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="IP record missing" description="Open an inpatient detail route with a valid IP UID." />
      </SectionCard>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="h-44 animate-pulse rounded-2xl bg-slate-100" />
        </SectionCard>
        <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
          <SectionCard className="border-slate-200 shadow-sm"><div className="h-80 animate-pulse rounded-2xl bg-slate-100" /></SectionCard>
          <SectionCard className="border-slate-200 shadow-sm"><div className="h-80 animate-pulse rounded-2xl bg-slate-100" /></SectionCard>
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detail) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="IP details unavailable" description="The selected inpatient record could not be loaded." />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-700">
              {detail.patient.slice(0, 1).toUpperCase()}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-2xl font-semibold text-slate-900">{detail.patient}</div>
                <StatusPill tone={getStatusTone(detail.status)}>{detail.status}</StatusPill>
              </div>
              <div className="text-sm text-slate-600">Patient ID: {detail.customerId || "-"} </div>
              <div className="grid gap-x-8 gap-y-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                <div><span className="font-medium text-slate-900">IP Number:</span> #{detail.id || "-"}</div>
                <div><span className="font-medium text-slate-900">Doctor:</span> {detail.attendingDoctor}</div>
                <div><span className="font-medium text-slate-900">Admission:</span> {detail.admittedOn}</div>
                <div><span className="font-medium text-slate-900">Bed:</span> {detail.bed}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(`${basePath}/admissions`)}>
              Back
            </Button>
            <Button type="button" variant="primary">
              Discharge
            </Button>
            <Button type="button" variant="secondary">
              Checkout
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm" padding={false}>
            <div className="p-5">
              <div className="mb-5 flex flex-wrap gap-3">
                <Button type="button" variant="secondary">Medical Record</Button>
                <Button type="button" variant="secondary">Create Invoice</Button>
                <Button type="button" variant="secondary">Discharge Summary</Button>
                <Button type="button" variant="secondary">Transfer Bed</Button>
              </div>
              <Tabs items={tabItems} value={activeTab} onValueChange={setActiveTab} />
            </div>
          </SectionCard>

          {activeTab === "services" ? (
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="mb-4 text-lg font-semibold text-slate-900">Admission Overview</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Reason For Admission</div>
                  <div className="mt-2 text-sm leading-6 text-slate-800">{detail.reason || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Expected Discharge</div>
                  <div className="mt-2 text-sm leading-6 text-slate-800">{detail.expectedDischarge}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Ward</div>
                  <div className="mt-2 text-sm leading-6 text-slate-800">{detail.ward}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Clinical Notes</div>
                  <div className="mt-2 text-sm leading-6 text-slate-800">{detail.notes || "No case notes available."}</div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "invoices" ? (
            <PlaceholderPanel title="Invoices" description="Convert the Angular inpatient invoice panel here using the finance shared pieces." />
          ) : null}
          {activeTab === "prescriptions" ? (
            <PlaceholderPanel title="Prescriptions" description="Convert the Angular prescription workspace for inpatient details here." />
          ) : null}
          {activeTab === "vitals" ? (
            <PlaceholderPanel title="Vitals" description="Convert the Angular vitals panel here with the shared health components." />
          ) : null}
          {activeTab === "bedTransactions" ? (
            <PlaceholderPanel title="Bed Transactions" description="Convert the Angular bed transaction and bed transfer history panel here." />
          ) : null}
          {activeTab === "log" ? (
            <PlaceholderPanel title="IP Log" description="Convert the Angular activity log panel here." />
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 text-lg font-semibold text-slate-900">General Info</div>
            <div className="space-y-3 text-sm text-slate-700">
              <div><span className="font-medium text-slate-900">Customer:</span> {detail.customerName || "-"}</div>
              <div><span className="font-medium text-slate-900">Phone:</span> {detail.customerPhone || "-"}</div>
              <div><span className="font-medium text-slate-900">Email:</span> {detail.customerEmail || "-"}</div>
              <div><span className="font-medium text-slate-900">Case ID:</span> {detail.caseId || "-"}</div>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 text-lg font-semibold text-slate-900">Care Team</div>
            <div className="space-y-3">
              {detail.doctors.slice(0, 5).map((doctor) => (
                <div key={doctor.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  {doctor.fullName}
                </div>
              ))}
              {!detail.doctors.length ? <div className="text-sm text-slate-500">No providers found.</div> : null}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 text-lg font-semibold text-slate-900">Active Users</div>
            <div className="space-y-3">
              {detail.users.slice(0, 5).map((user) => (
                <div key={user.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  {user.fullName}
                </div>
              ))}
              {!detail.users.length ? <div className="text-sm text-slate-500">No active users found.</div> : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

