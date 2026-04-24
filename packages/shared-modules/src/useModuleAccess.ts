import type { SharedModuleName, ModuleAccessResult, SharedModuleToAuthModuleMap } from "./types";
import { useSharedModulesContext } from "./context";

const SHARED_TO_AUTH_MODULE: SharedModuleToAuthModuleMap = {
  customers: "customers",
  orders: null,
  ip: "ip",
  "audit-log": null,
  settings: "settings",
  tasks: "tasks",
  users: "users",
  leads: "leads",
  drive: "drive",
  membership: "membership",
  finance: "finance",
  analytics: "analytics",
  reports: "reports",
};

export function getModuleAccess(
  moduleName: SharedModuleName,
  apiScope: "global" | "location",
  enabledModules: string[],
  locationId: string | null | undefined
): ModuleAccessResult {
  if (moduleName === "audit-log") {
    return { allowed: true, requiresBypass: true };
  }

  if (moduleName === "settings" && apiScope === "global" && locationId) {
    return { allowed: true, redirectTo: "location" };
  }

  if (apiScope === "location" && !locationId) {
    return { allowed: false, reason: "location-required" };
  }

  const mappedModule = SHARED_TO_AUTH_MODULE[moduleName];
  if (mappedModule && !enabledModules.includes(mappedModule)) {
    return { allowed: false, reason: "module-disabled" };
  }

  return { allowed: true };
}

export function useModuleAccess(moduleName?: SharedModuleName): ModuleAccessResult {
  const { moduleName: contextModuleName, apiScope, account, location } = useSharedModulesContext();

  return getModuleAccess(
    moduleName ?? contextModuleName,
    apiScope,
    account.enabledModules,
    location?.id
  );
}
