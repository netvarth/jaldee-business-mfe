import { SectionCard } from "@jaldee/design-system";
import { useDriveActivity } from "../queries/drive";

export function DriveActivityList() {
  const activity = useDriveActivity();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Drive Activity</h2>
        <p className="text-sm text-slate-500">
          Uploads, reviews, shares, and document edits across the workspace.
        </p>
      </div>
      <div className="space-y-3">
        {activity.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{row.actor}</span> {row.action}{" "}
              <span className="font-medium text-slate-900">{row.target}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{row.occurredOn}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
