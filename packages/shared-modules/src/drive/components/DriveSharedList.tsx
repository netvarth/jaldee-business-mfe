import { SectionCard } from "@jaldee/design-system";
import { useDriveShared } from "../queries/drive";
import { DrivePill } from "./shared";

export function DriveSharedList() {
  const shared = useDriveShared();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Shared Items</h2>
        <p className="text-sm text-slate-500">
          Track link sharing, internal access, and expiry windows.
        </p>
      </div>
      <div className="space-y-3">
        {shared.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">{row.title}</div>
                <div className="text-sm text-slate-500">{row.sharedWith}</div>
              </div>
              <DrivePill tone={row.permission === "Edit" ? "violet" : "sky"}>
                {row.permission}
              </DrivePill>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              {row.expiresOn ? `Expires on ${row.expiresOn}` : "No expiry configured"}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
