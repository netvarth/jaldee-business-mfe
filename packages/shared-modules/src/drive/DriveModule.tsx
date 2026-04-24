import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useModuleAccess } from "../useModuleAccess";
import { DriveActivityList } from "./components/DriveActivityList";
import { DriveFilesList } from "./components/DriveFilesList";
import { DriveOverview } from "./components/DriveOverview";
import { DriveSettings } from "./components/DriveSettings";
import { DriveSharedList } from "./components/DriveSharedList";

export function DriveModule() {
  const access = useModuleAccess("drive");
  const { routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "overview";

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Drive unavailable"
          description={
            access.reason === "module-disabled"
              ? "This account does not currently have access to the Drive module."
              : access.reason === "location-required"
                ? "Select a location to work with location-scoped drive data."
                : "The drive module cannot be opened in the current scope."
          }
        />
      </SectionCard>
    );
  }

  if (view === "files") {
    return <DriveFilesList />;
  }

  if (view === "shared") {
    return <DriveSharedList />;
  }

  if (view === "activity") {
    return <DriveActivityList />;
  }

  if (view === "settings") {
    return <DriveSettings />;
  }

  return <DriveOverview />;
}
