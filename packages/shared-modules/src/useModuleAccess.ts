import type { SharedModuleName, ModuleAccessResult, SharedModuleToAuthModuleMap } from "./types";
import { useSharedModulesContext } from "./context";

const SHARED_TO_AUTH_MODULE: SharedModuleToAuthModuleMap = {
  customers: "customers",
  orders: null,
  ip: null,
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

const BASE_CRM_MODULES = new Set<SharedModuleName>([
  "customers",
  "users",
  "drive",
  "tasks",
  "membership",
  "leads",
  "reports",
  "audit-log",
]);

export function getModuleAccess(
  moduleName: SharedModuleName,
  apiScope: "global" | "location",
  enabledModules: string[],
  locationId: string | null | undefined
): ModuleAccessResult {
  if (BASE_CRM_MODULES.has(moduleName)) {
    return { allowed: true, requiresBypass: moduleName === "audit-log" };
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
