import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useModuleAccess } from "../useModuleAccess";
import { DriveActivityList } from "./components/DriveActivityList";
import { DriveFilesList } from "./components/DriveFilesList";
import { DriveFoldersList } from "./components/DriveFoldersList";
import { DriveOverview } from "./components/DriveOverview";
import { DriveSettings } from "./components/DriveSettings";
import { DriveSharedList } from "./components/DriveSharedList";

export function DriveModule() {
  const access = useModuleAccess("drive");
  const { basePath, routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "overview";
  const subview = routeParams?.subview ?? null;
  const recordId = routeParams?.recordId ?? null;
  const folderTitle =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("name")
      : null;

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
    return <DriveFilesList folderName="private" title="My Files" subtitle="Manage your own files!" />;
  }

  if (view === "shared") {
    if (subview === "staff" || subview === "customers") {
      if (recordId) {
        const isStaff = subview === "staff";
        const title = folderTitle || (isStaff ? "Staff member" : "Customer");
        return (
          <DriveFilesList
            allowUpload={false}
            backTo={`${basePath}/shared/${subview}`}
            folderId={recordId}
            folderName={isStaff ? "public" : "shared"}
            showContext
            showOwner
            subtitle={`Manage the files uploaded by the ${title}!`}
            title={title}
          />
        );
      }

      return <DriveFoldersList type={subview} />;
    }

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
