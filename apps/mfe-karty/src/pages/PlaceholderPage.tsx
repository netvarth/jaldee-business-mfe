import { EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useParams } from "react-router-dom";

const sectionLabels: Record<string, string> = {
  orders: "Orders",
  inventory: "Inventory",
  catalog: "Catalog",
  reports: "Reports",
  settings: "Settings",
};

export default function PlaceholderPage() {
  const { section = "" } = useParams();
  const title = sectionLabels[section] ?? "Section";

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title={title}
          subtitle="This section is scaffolded and routed correctly in the Karty microfrontend."
        />

        <SectionCard>
          <EmptyState
            title={`${title} is ready for implementation`}
            description="The route now resolves correctly through shell and remote mount. Build the Karty feature here next."
          />
        </SectionCard>
      </div>
    </div>
  );
}
