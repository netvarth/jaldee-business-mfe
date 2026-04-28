import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useModuleAccess } from "../useModuleAccess";
import { StoresList } from "./components/StoresList";

export function StoresModule() {
  const access = useModuleAccess("stores");

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Stores unavailable"
          description={
            access.reason === "location-required"
              ? "Select a location to work with location-scoped store data."
              : "This module cannot be opened in the current scope."
          }
        />
      </SectionCard>
    );
  }

  return <StoresList />;
}
