import type { AccountContext, BranchLocation, MFEHttpBridge, ModuleKey, ProductKey, UserContext } from "@jaldee/auth-context";

export const API_SCOPES = ["global", "location"] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const SHARED_MODULE_NAMES = [
  "customers",
  "orders",
  "ip",
  "audit-log",
  "settings",
  "tasks",
  "users",
  "leads",
  "drive",
  "membership",
  "finance",
  "analytics",
  "reports",
] as const;

export type SharedModuleName = (typeof SHARED_MODULE_NAMES)[number];

export interface SharedModuleRouteParams {
  locationId?: string | null;
  recordId?: string | null;
  view?: string | null;
  subview?: string | null;
  tab?: string | null;
}

export interface SharedModuleProps {
  moduleName: SharedModuleName;
  product: ProductKey;
  apiScope: ApiScope;
  basePath: string;
  assetsBaseUrl?: string;
  /**
   * Optional client-side navigation handler provided by the host MFE.
   * When present, shared modules should prefer this over full page reloads.
   * The handler expects a router-internal path (i.e., with `basePath` stripped).
   */
  navigate?: (to: string) => void;
  user: UserContext;
  account: AccountContext;
  location: BranchLocation | null;
  api: MFEHttpBridge;
  routeParams?: SharedModuleRouteParams;
}

export interface ModuleAccessResult {
  allowed: boolean;
  reason?: "module-disabled" | "scope-mismatch" | "location-required";
  redirectTo?: string;
  requiresBypass?: boolean;
}

export interface ScopeAwareRequestConfig {
  apiScope: ApiScope;
  locationId?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export type SharedModuleToAuthModuleMap = Record<SharedModuleName, ModuleKey | null>;
