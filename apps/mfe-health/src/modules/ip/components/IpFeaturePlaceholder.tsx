import { EmptyState, SectionCard } from "@jaldee/design-system";

export function IpFeaturePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <EmptyState title={title} description={description} />
    </SectionCard>
  );
}

