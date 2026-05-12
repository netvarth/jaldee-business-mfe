import { EmptyState, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../context";
import { useModuleAccess } from "../useModuleAccess";
import { UserDetailView } from "./components/UserDetail";
import { UserTeamsList } from "./components/UserTeamsList";
import { UsersList } from "./components/UsersList";
import { UsersOverview } from "./components/UsersOverview";

export function UsersModule() {
  const access = useModuleAccess("users");
  const { routeParams } = useSharedModulesContext();
  const view = routeParams?.view ?? "overview";
  const recordId = routeParams?.recordId ?? null;
  const subview = routeParams?.subview ?? null;

  if (!access.allowed) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState
          title="Users unavailable"
          description={
            access.reason === "module-disabled"
              ? "This account does not currently have access to the Users module."
              : access.reason === "location-required"
                ? "Select a location to work with location-scoped user data."
                : "The users module cannot be opened in the current scope."
          }
        />
      </SectionCard>
    );
  }

  if (recordId) {
    return <UserDetailView userId={recordId} section={subview ?? "personal-details"} />;
  }

  if (view === "list") {
    return <UsersList />;
  }

  if (view === "teams") {
    return <UserTeamsList />;
  }

  return <UsersOverview />;
}
