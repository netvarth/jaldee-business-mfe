import { SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useDriveDataset } from "../queries/drive";
import { DrivePill } from "./shared";

const ACCENT_STYLES = {
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  sky: "border-sky-200 bg-sky-50 text-sky-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

export function DriveOverview() {
  const dataset = useDriveDataset();
  const { basePath } = useSharedModulesContext();

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">{dataset.title}</h2>
          <p className="text-sm text-slate-600">{dataset.subtitle}</p>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dataset.summaries.map((item) => (
          <SectionCard
            key={item.label}
            className={`border ${ACCENT_STYLES[item.accent]} shadow-sm`}
          >
            <div className="text-xs font-medium uppercase tracking-wide opacity-80">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{item.value}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Files</h3>
            <button
              className="text-sm font-medium text-violet-700"
              onClick={() => window.location.assign(`${basePath}/files`)}
              type="button"
            >
              Open files
            </button>
          </div>
          <div className="space-y-3">
            {dataset.files.map((row) => (
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

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Shared Items</h3>
            <button
              className="text-sm font-medium text-violet-700"
              onClick={() => window.location.assign(`${basePath}/shared`)}
              type="button"
            >
              Manage sharing
            </button>
          </div>
          <div className="space-y-3">
            {dataset.shared.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">{row.title}</div>
                <div className="mt-1 text-sm text-slate-500">{row.sharedWith}</div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <DrivePill tone={row.permission === "Edit" ? "violet" : "sky"}>
                    {row.permission}
                  </DrivePill>
                  <span>{row.expiresOn ? `Expires ${row.expiresOn}` : "No expiry"}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Activity</h3>
          <button
            className="text-sm font-medium text-violet-700"
            onClick={() => window.location.assign(`${basePath}/activity`)}
            type="button"
          >
            View activity
          </button>
        </div>
        <div className="space-y-3">
          {dataset.activity.map((row) => (
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
    </div>
  );
}
