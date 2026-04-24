import { EmptyState, SectionCard } from "@jaldee/design-system";

export function IpSettings() {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <EmptyState
        title="IP settings"
        description="Ward rules, admission workflows, discharge policies, and IP billing preferences can be configured here."
      />
    </SectionCard>
  );
}
