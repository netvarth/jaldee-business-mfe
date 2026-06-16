// Types
export type {
  ProductKey,
  ModuleKey,
  DomainKey,
  PlanKey,
  UserRole,
  UserContext,
  AccountLabels,
  AccountTheme,
  AccountContext,
  BranchLocation,
  ThemeContext,
  EventBus,
  ShellToastPayload,
  TelemetryService,
  MFEHttpBridge,
  MFEError,
  MFEProps,
  MFELifecycle,
} from "./types";
export { SHELL_TOAST_EVENT } from "./types";

// Context + hook
export { MFEPropsContext, useMFEProps } from "./context";
export {
  DEFAULT_ENABLED_MODULES,
  DEFAULT_LICENSED_PRODUCTS,
  normalizeAccountContext,
} from "./account";

// Contract version — shell checks this on every MFE mount
export const MFE_CONTRACT_VERSION = "3.4";
