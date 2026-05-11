import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { DrivePageShell, FolderGlyph } from "./shared";

export function DriveSharedList() {
  const { account, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const staffLabel = account.labels.staff || "Staff member";
  const customerLabel = account.labels.customer || "Customer";

  return (
    <DrivePageShell
      title="Shared Files"
      subtitle={`Manage the files uploaded by the ${staffLabel}s or ${customerLabel}s!`}
      onBack={() => navigate(basePath)}
    >
      <div className="grid max-w-5xl gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <button
          className="flex min-h-40 flex-col items-start justify-between gap-5 rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          onClick={() => navigate(`${basePath}/shared/staff`)}
          type="button"
        >
          <FolderGlyph />
          <div>
            <span className="text-sm font-semibold text-slate-900">From {staffLabel}</span>
            <p className="mt-1 text-xs text-slate-500">Folders grouped by staff member.</p>
          </div>
        </button>
        <button
          className="flex min-h-40 flex-col items-start justify-between gap-5 rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          onClick={() => navigate(`${basePath}/shared/customers`)}
          type="button"
        >
          <FolderGlyph />
          <div>
            <span className="text-sm font-semibold text-slate-900">From {customerLabel}</span>
            <p className="mt-1 text-xs text-slate-500">Folders grouped by customer.</p>
          </div>
        </button>
      </div>
    </DrivePageShell>
  );
}
