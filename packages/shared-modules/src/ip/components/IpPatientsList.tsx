import { SectionCard } from "@jaldee/design-system";
import { useIpPatients } from "../queries/ip";
import { StatusPill } from "./shared";

export function IpPatientsList() {
  const patients = useIpPatients();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Inpatients</h2>
        <p className="text-sm text-slate-500">Current admitted patients and care ownership.</p>
      </div>
      <div className="space-y-3">
        {patients.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">{row.patient}</div>
                <div className="text-sm text-slate-500">{row.ward} · {row.attendingDoctor}</div>
              </div>
              <StatusPill tone={row.status === "Admitted" ? "teal" : row.status === "Under Observation" ? "sky" : "amber"}>
                {row.status}
              </StatusPill>
            </div>
            <div className="mt-3 flex gap-6 text-sm text-slate-600">
              <span>Admitted: {row.admittedOn}</span>
              <span>Stay: {row.stayDays} days</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
