import { SectionCard } from "@jaldee/design-system";
import { useDriveFiles } from "../queries/drive";
import { DrivePill } from "./shared";

export function DriveFilesList() {
  const files = useDriveFiles();

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Files</h2>
        <p className="text-sm text-slate-500">
          Clinical documents, billing attachments, and operational files.
        </p>
      </div>
      <div className="space-y-3">
        {files.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-slate-900">{row.name}</div>
                <div className="text-sm text-slate-500">
                  {row.category} · {row.owner}
                </div>
              </div>
              <DrivePill tone="slate">{row.size}</DrivePill>
            </div>
            <div className="mt-3 text-sm text-slate-600">Updated on {row.updatedOn}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
