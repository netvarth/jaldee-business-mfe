import { Button, EmptyState, SectionCard } from "@jaldee/design-system";
import { SharedFinanceLayout } from "./shared";

export function FinanceSettings() {
  return (
    <SharedFinanceLayout
      title="Shared Finance Settings"
      subtitle="Configuration is intentionally limited in the shared finance module."
      actions={<Button onClick={() => window.location.assign("/finance/settings")}>Open Full Finance Settings</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Use the standalone Finance app"
          description="The shared module is only for quick operational visibility inside the active product. Use the full Finance product for templates, workflows, and administrative setup."
        />
      </SectionCard>
    </SharedFinanceLayout>
  );
}
