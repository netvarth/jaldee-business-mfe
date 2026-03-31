// ─── Primitive key types ──────────────────────────────

export type ProductKey =
  | "health"
  | "bookings"
  | "golderp"
  | "karty"
  | "finance"
  | "lending"
  | "hr"
  | "ai";

export type ModuleKey =
  | "customers"
  | "leads"
  | "tasks"
  | "users"
  | "finance"
  | "analytics"
  | "reports"
  | "drive"
  | "membership"
  | "audit-log"
  | "settings";

export type DomainKey =
  | "healthcare"
  | "retail"
  | "service"
  | "finance"
  | "corporate"
  | "education"
  | "other";

export type PlanKey = "starter" | "growth" | "enterprise";

// ─── User ─────────────────────────────────────────────

export interface UserRole {
  id: string;
  name: string;
  tier: "owner" | "custom";
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: UserRole[];
  permissions: string[];
}

// ─── Account ──────────────────────────────────────────

export interface AccountLabels {
  customer: string;    // Patient | Client | Customer | Employee
  staff: string;       // Doctor | Officer | Staff
  service: string;     // Treatment | Product | Service
  appointment: string; // Appointment | Meeting | Session
  order: string;       // Order | Supply
  lead: string;        // Lead | Referral | Enquiry
}

export interface AccountTheme {
  primaryColor: string;  // hex e.g. "#5B21D1"
  logoUrl: string;
  faviconUrl?: string;
}

export interface AccountContext {
  id: string;
  name: string;
  licensedProducts: ProductKey[];
  enabledModules: ModuleKey[];
  theme: AccountTheme;
  plan: PlanKey;
  domain: DomainKey;
  labels: AccountLabels;
}

// ─── Location ─────────────────────────────────────────

export interface BranchLocation {
  id: string;
  name: string;
  code: string;
}

// ─── Theme ────────────────────────────────────────────

export interface ThemeContext {
  primaryColor: string;
}

// ─── EventBus ─────────────────────────────────────────

export interface EventBus {
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, handler: (payload: unknown) => void) => () => void;
}

// ─── Telemetry (placeholder — filled in later) ────────

export interface TelemetryService {
  captureError: (error: Error, context?: Record<string, unknown>) => void;
  trackEvent: (name: string, props?: Record<string, unknown>) => void;
  trackPageView: (path: string) => void;
}

// ─── MFE Error ────────────────────────────────────────

export interface MFEError {
  mfe: string;
  code: string;
  message: string;
  severity: "warn" | "error" | "fatal";
  context?: Record<string, unknown>;
}

// ─── MFEProps — the shell-to-MFE contract ─────────────

export interface MFEProps {
  // Identity
  mfeName: string;
  basePath: string;

  // Auth
  // Browser — empty string, HttpOnly cookie handles auth
  // Native  — token injected by NativeBridge
  authToken: string;

  // Context
  user: UserContext;
  account: AccountContext;
  theme: ThemeContext;
  locale: string;
  location: BranchLocation;

  // Navigation
  navigate: (route: string) => void;

  // Communication
  eventBus: EventBus;
  onError: (error: MFEError) => void;

  // Telemetry
  telemetry: TelemetryService;
}

// ─── MFE Lifecycle — what every MFE must export ───────

export interface MFELifecycle {
  mount: (container: HTMLElement, props: MFEProps) => void;
  unmount: (container: HTMLElement) => void;
  updateProps?: (props: Partial<MFEProps>) => void;
  CONTRACT_VERSION: string;
}
