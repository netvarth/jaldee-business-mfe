import { SectionCard } from "@jaldee/design-system";
import { useIpBeds } from "../queries/ip";
import { StatusPill } from "./shared";

export function IpBedsList() {
  const beds = useIpBeds();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Bed Management</h2>
        <p className="text-sm text-slate-500">Occupancy across wards, ICU, and housekeeping transitions.</p>
      </div>
      <div className="space-y-3">
        {beds.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">{row.ward}</div>
                <div className="text-sm text-slate-500">{row.bed}</div>
              </div>
              <StatusPill tone={row.occupancy === "Available" ? "teal" : row.occupancy === "Cleaning" ? "amber" : "rose"}>
                {row.occupancy}
              </StatusPill>
            </div>
            <div className="mt-3 text-sm text-slate-600">{row.patient ?? "No patient assigned"}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
