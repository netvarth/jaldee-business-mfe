import { PageHeader } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { ModulePlaceholder } from "./shared";

export function LeadFormPlaceholder({ mode, recordId }: { mode: "create" | "update"; recordId?: string }) {
  const { basePath } = useSharedModulesContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "update" ? "Update Lead" : "Create Lead"}
        back={{ label: "Back", href: `${basePath}/leads` }}
        onNavigate={(href) => window.location.assign(href)}
      />
      <ModulePlaceholder
        title={mode === "update" ? `Lead update mapped for ${recordId ?? "record"}` : "Lead create route mapped"}
        description="The route now exists in the new shared module. Rebuilding the full Angular dynamic-form lead workflow is a larger pass and is the next implementation slice."
        backHref={`${basePath}/leads`}
      />
    </div>
  );
}
