import { EmptyState, SectionCard } from "@jaldee/design-system";

export function DriveSettings() {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <EmptyState
        title="Drive settings"
        description="Retention rules, access policies, folder templates, and file approval workflows can be configured here."
      />
    </SectionCard>
  );
}
