import { Button, EmptyState, SectionCard, SkeletonCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useDriveActivity } from "../queries/drive";
import { DrivePageShell } from "./shared";

export function DriveActivityList() {
  const activity = useDriveActivity();
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  return (
    <DrivePageShell
      title="Drive Activity"
      subtitle="Recent upload and sharing activity derived from live drive files."
      onBack={() => navigate(basePath)}
    >
      <SectionCard className="border-slate-200 bg-white shadow-sm">

      {activity.isLoading && <SkeletonCard />}

      {activity.isError && (
        <EmptyState
          title="Activity could not load"
          description="The drive service returned an error."
          action={<Button onClick={() => activity.refetch()}>Retry</Button>}
        />
      )}

      {!activity.isLoading && !activity.isError && activity.data.length === 0 && (
        <EmptyState title="No activity found" description="Drive activity will appear after files are uploaded or shared." />
      )}

      <div className="space-y-3">
        {activity.data.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{row.actor}</span> {row.action}{" "}
              <span className="font-medium text-slate-900">{row.target}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{row.occurredOn}</div>
          </div>
        ))}
      </div>
      </SectionCard>
    </DrivePageShell>
  );
}
