import { Button, EmptyState, SectionCard, SkeletonCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useDriveDataset } from "../queries/drive";
import { formatDriveStorageGb } from "../services/drive";
import { DrivePageShell } from "./shared";

export function DriveSettings() {
  const dataset = useDriveDataset();
  const storage = dataset.data?.storage;
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  if (dataset.isLoading) {
    return (
      <DrivePageShell title="Storage" subtitle="Live storage usage from Jaldee Drive." onBack={() => navigate(basePath)}>
        <SkeletonCard />
      </DrivePageShell>
    );
  }

  if (dataset.isError) {
    return (
      <DrivePageShell title="Storage" subtitle="Live storage usage from Jaldee Drive." onBack={() => navigate(basePath)}>
        <SectionCard className="border-slate-200 bg-white shadow-sm">
          <EmptyState
            title="Drive storage could not load"
            description="The storage API returned an error."
            action={<Button onClick={() => dataset.refetch()}>Retry</Button>}
          />
        </SectionCard>
      </DrivePageShell>
    );
  }

  return (
    <DrivePageShell title="Storage" subtitle="Live storage usage from Jaldee Drive." onBack={() => navigate(basePath)}>
      <SectionCard className="border-slate-200 bg-white shadow-sm">
        {!storage ? (
          <EmptyState title="Storage unavailable" description="No storage data was returned for this account." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Total</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatDriveStorageGb(storage.totalStorage)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Used</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatDriveStorageGb(storage.usedStorage)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Remaining</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {formatDriveStorageGb(storage.remainingStorage)}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </DrivePageShell>
  );
}
