import { SectionCard } from "@jaldee/design-system";
import { useIpAdmissions } from "../queries/ip";

export function IpAdmissionsList() {
  const admissions = useIpAdmissions();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Admissions</h2>
        <p className="text-sm text-slate-500">Recent admission entries and discharge expectations.</p>
      </div>
      <div className="space-y-3">
        {admissions.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="font-medium text-slate-900">{row.patient}</div>
            <div className="mt-1 text-sm text-slate-500">{row.reason}</div>
            <div className="mt-3 flex gap-6 text-sm text-slate-600">
              <span>Room: {row.room}</span>
              <span>Admitted: {row.admittedOn}</span>
              <span>Expected discharge: {row.expectedDischarge}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
