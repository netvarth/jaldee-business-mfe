import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useIpDataset } from "../queries/ip";
import { StatusPill } from "./shared";

const ACCENT_STYLES = {
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  sky: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
} as const;

function getPatientTone(status: string) {
  if (status === "Ready for Discharge") return "amber" as const;
  if (status === "Under Observation") return "sky" as const;
  return "teal" as const;
}

function getBedTone(occupancy: string) {
  if (occupancy === "Occupied") return "rose" as const;
  if (occupancy === "Cleaning") return "amber" as const;
  return "teal" as const;
}

function getBillingTone(status: string) {
  if (status === "Paid") return "teal" as const;
  if (status === "Partial") return "amber" as const;
  return "rose" as const;
}

export function IpOverview() {
  const dataset = useIpDataset();
  const { basePath } = useSharedModulesContext();

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">{dataset.title}</h2>
          <p className="text-sm text-slate-600">{dataset.subtitle}</p>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dataset.summaries.map((item) => (
          <SectionCard
            key={item.label}
            className={`border ${ACCENT_STYLES[item.accent]} shadow-sm`}
          >
            <div className="text-xs font-medium uppercase tracking-wide opacity-80">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{item.value}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Active Patients</h3>
            <button
              className="text-sm font-medium text-teal-700"
              onClick={() => window.location.assign(`${basePath}/patients`)}
              type="button"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {dataset.patients.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-slate-900">{row.patient}</div>
                    <div className="text-sm text-slate-500">
                      {row.ward} · {row.attendingDoctor}
                    </div>
                  </div>
                  <StatusPill tone={getPatientTone(row.status)}>{row.status}</StatusPill>
                </div>
                <div className="mt-3 flex gap-6 text-sm text-slate-600">
                  <span>Admitted: {row.admittedOn}</span>
                  <span>Stay: {row.stayDays} days</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Bed Status</h3>
            <button
              className="text-sm font-medium text-teal-700"
              onClick={() => window.location.assign(`${basePath}/beds`)}
              type="button"
            >
              Open beds
            </button>
          </div>
          <div className="space-y-3">
            {dataset.beds.map((bed) => (
              <div key={bed.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{bed.ward}</div>
                    <div className="text-sm text-slate-500">{bed.bed}</div>
                  </div>
                  <StatusPill tone={getBedTone(bed.occupancy)}>{bed.occupancy}</StatusPill>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {bed.patient ?? "No patient assigned"}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Admissions</h3>
            <button
              className="text-sm font-medium text-teal-700"
              onClick={() => window.location.assign(`${basePath}/admissions`)}
              type="button"
            >
              Admission queue
            </button>
          </div>
          <div className="space-y-3">
            {dataset.admissions.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">{row.patient}</div>
                <div className="mt-1 text-sm text-slate-500">{row.reason}</div>
                <div className="mt-3 flex gap-6 text-sm text-slate-600">
                  <span>Room: {row.room}</span>
                  <span>Discharge: {row.expectedDischarge}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Billing Snapshot</h3>
            <button
              className="text-sm font-medium text-teal-700"
              onClick={() => window.location.assign(`${basePath}/billing`)}
              type="button"
            >
              Billing details
            </button>
          </div>
          <div className="space-y-3">
            {dataset.billing.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{row.patient}</div>
                    <div className="text-sm text-slate-500">{row.invoice}</div>
                  </div>
                  <StatusPill tone={getBillingTone(row.status)}>{row.status}</StatusPill>
                </div>
                <div className="mt-3 flex gap-6 text-sm text-slate-600">
                  <span>Amount: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.amount)}</span>
                  <span>Due: {row.dueOn}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {dataset.patients.length === 0 ? (
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="No inpatient data"
            description="Admissions, bed occupancy, and inpatient billing will appear here once IP activity starts."
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
