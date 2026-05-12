import { Button, EmptyState, SectionCard, SkeletonCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useDriveDataset } from "../queries/drive";
import { formatDriveStorageGb } from "../services/drive";
import { DrivePageShell, FolderGlyph } from "./shared";

export function DriveOverview() {
  const dataset = useDriveDataset();
  const { basePath, account } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const staffLabel = account.labels.staff || "staff member";
  const customerLabel = account.labels.customer || "customer";
  const storage = dataset.data?.storage;
  const usedPercent = storage
    ? Math.min(100, (storage.usedStorage / Math.max(storage.totalStorage, 1)) * 100)
    : 0;

  return (
    <DrivePageShell
      title="Jaldee Drive"
      subtitle={`Manage the files uploaded by the ${staffLabel}s or ${customerLabel}s or you!`}
    >
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Files</h2>
          <div className="grid max-w-5xl gap-5 md:grid-cols-2">
            <button
              className="group flex min-h-24 items-center gap-5 rounded-lg border border-slate-200 bg-white px-6 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              onClick={() => navigate(`${basePath}/files`)}
              type="button"
            >
              <FolderGlyph className="h-9 w-12" />
              <div>
                <span className="text-sm font-semibold text-slate-900">My Files</span>
                <p className="mt-1 text-xs text-slate-500">Upload and manage your private drive files.</p>
              </div>
            </button>
            <button
              className="group flex min-h-24 items-center gap-5 rounded-lg border border-slate-200 bg-white px-6 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              onClick={() => navigate(`${basePath}/shared`)}
              type="button"
            >
              <FolderGlyph className="h-9 w-12" />
              <div>
                <span className="text-sm font-semibold text-slate-900">Shared Files</span>
                <p className="mt-1 text-xs text-slate-500">Browse files shared by staff and customers.</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Storage</h2>
          <SectionCard className="max-w-5xl border-slate-200 bg-white shadow-sm">
            {dataset.isLoading && <SkeletonCard />}
            {dataset.isError && (
              <EmptyState
                title="Storage could not load"
                description="The live drive storage API returned an error."
                action={<Button onClick={() => dataset.refetch()}>Retry</Button>}
              />
            )}
            {!dataset.isLoading && !dataset.isError && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <span className="text-lg font-semibold">GB</span>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-900">Available Space</span>
                      <p className="mt-1 text-xs text-slate-500">
                        {storage ? `${formatDriveStorageGb(storage.usedStorage)} used` : "Storage usage unavailable"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {storage ? `${formatDriveStorageGb(storage.remainingStorage)} left` : "-"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-700" style={{ width: `${usedPercent}%` }} />
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  To purchase additional cloud storage, please contact our support team at the following
                  contact information:
                  <br />
                  +91 8714766671. They will be happy to assist you.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </DrivePageShell>
  );
}
