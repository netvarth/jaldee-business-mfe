import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  UserContext,
  AccountContext,
  BranchLocation,
  ProductKey,
  UserPreferences,
} from "@jaldee/auth-context";
import {
  DEFAULT_ENABLED_MODULES,
  DEFAULT_LICENSED_PRODUCTS,
  normalizeAccountContext,
} from "@jaldee/auth-context";
import { themeService } from "../theme/ThemeService";

const DEFAULT_USER: UserContext = {
  id: "default-user",
  name: "Jaldee User",
  email: "user@jaldee.com",
  roles: [{ id: "role-owner", name: "Admin", tier: "owner" }],
  permissions: [],
};

const DEFAULT_ACCOUNT: AccountContext = {
  id: "default-account",
  name: "Jaldee Business",
  licensedProducts: DEFAULT_LICENSED_PRODUCTS,
  enabledModules: DEFAULT_ENABLED_MODULES,
  theme: {
    primaryColor: "#5B21D1",
    logoUrl: "",
  },
  plan: "growth",
  domain: "healthcare",
  labels: {
    customer: "Customer",
    staff: "Doctor",
    service: "Service",
    appointment: "Appointment",
    order: "Order",
    lead: "Lead",
  },
};

type PersistedShellStore = Partial<
  Pick<
    ShellStore,
    | "user"
    | "account"
    | "accessToken"
    | "isAuthenticated"
    | "onboardingStatus"
    | "activeLocation"
    | "availableLocations"
    | "activeProduct"
    | "userPreferences"
    | "brandingOverrides"
  >
>;

type AccountBranding = Pick<AccountContext, "theme" | "whiteLabel">;

const ACCOUNT_BRANDING_STORAGE_KEY = "jaldee-account-branding";

function readStoredBranding(): Record<string, AccountBranding> {
  if (typeof window === "undefined") return {};
  try {
    const value = window.localStorage.getItem(ACCOUNT_BRANDING_STORAGE_KEY);
    return value ? JSON.parse(value) as Record<string, AccountBranding> : {};
  } catch {
    return {};
  }
}

function writeStoredBranding(value: Record<string, AccountBranding>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_BRANDING_STORAGE_KEY, JSON.stringify(value));
}

interface ShellStore {
  // Auth
  user:            UserContext | null;
  account:         AccountContext | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  hasHydrated:     boolean;
  authResolved:    boolean;
  onboardingStatus: "complete" | "pending";

  // Location
  activeLocation:     BranchLocation | null;
  availableLocations: BranchLocation[];

  // UI
  activeProduct:   ProductKey | null;
  sidebarCollapsed: boolean;
  sidebarVisible:    boolean;
  userPreferences:   UserPreferences;
  brandingOverrides: Record<string, AccountBranding>;

  // Actions
  setAuth:          (user: UserContext, account: AccountContext, token: string) => void;
  setAccount:       (account: AccountContext) => void;
  clearAuth:        () => void;
  setOnboardingStatus: (status: "complete" | "pending") => void;
  setAuthResolved:   (value: boolean) => void;
  setLocation:      (location: BranchLocation) => void;
  setAvailableLocations: (locations: BranchLocation[]) => void;
  setActiveProduct: (product: ProductKey | null) => void;
  toggleSidebar:    () => void;
  setSidebarVisible: (visible: boolean) => void;
  setHasHydrated:   (value: boolean) => void;
  setUserPreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useShellStore = create<ShellStore>()(
  persist(
    (set) => ({
      user:               DEFAULT_USER,
      account:            DEFAULT_ACCOUNT,
      accessToken:        null,
      isAuthenticated:    false,
      hasHydrated:        false,
      authResolved:       false,
      onboardingStatus:   "complete",
      activeLocation:     null,
      availableLocations: [],
      activeProduct:      null,
      sidebarCollapsed:   false,
      sidebarVisible:     true,
      userPreferences:    { theme: "light", fontSize: "md" },
      brandingOverrides:  readStoredBranding(),

      setAuth: (user, account, token) =>
        set((state) => {
          const normalizedAccount = normalizeAccountContext(account);
          const isRestoringSameAccount = state.account?.id === normalizedAccount.id;
          const savedBranding =
            state.brandingOverrides[normalizedAccount.id] ??
            readStoredBranding()[normalizedAccount.id];

          return {
            user,
            account: savedBranding
              ? {
                  ...normalizedAccount,
                  theme: savedBranding.theme,
                  whiteLabel: savedBranding.whiteLabel,
                }
              : isRestoringSameAccount
              ? {
                  ...normalizedAccount,
                  theme: state.account?.theme ?? normalizedAccount.theme,
                  whiteLabel: state.account?.whiteLabel ?? normalizedAccount.whiteLabel,
                }
              : normalizedAccount,
            accessToken: token,
            isAuthenticated: true,
          };
        }),

      setAccount: (account) =>
        set((state) => {
          const normalizedAccount = normalizeAccountContext(account);
          const brandingOverrides = {
            ...readStoredBranding(),
            ...state.brandingOverrides,
            [normalizedAccount.id]: {
              theme: normalizedAccount.theme,
              whiteLabel: normalizedAccount.whiteLabel,
            },
          };
          writeStoredBranding(brandingOverrides);
          return {
            account: normalizedAccount,
            brandingOverrides,
          };
        }),

      setOnboardingStatus: (status) =>
        set({ onboardingStatus: status }),

      setAuthResolved: (value) =>
        set({ authResolved: value }),

      clearAuth: () =>
        set({
          user: DEFAULT_USER,
          account: DEFAULT_ACCOUNT,
          accessToken: null,
          isAuthenticated: false,
          authResolved: true,
          onboardingStatus: "complete",
          activeLocation: null,
          availableLocations: [],
          activeProduct: null,
        }),

      setLocation: (location) => {
        console.log("[shellStore] setLocation called with:", location);
        set({ activeLocation: location });
      },

      setAvailableLocations: (locations) => {
        console.log("[shellStore] setAvailableLocations called with:", locations);
        set((state) => {
          const nextActiveLocation =
            locations.find((location) => location.id === state.activeLocation?.id) ??
            locations[0] ??
            null;
          console.log("[shellStore] setAvailableLocations updating state with:", {
            availableLocations: locations,
            activeLocation: nextActiveLocation,
          });
          return {
            availableLocations: locations,
            activeLocation: nextActiveLocation,
          };
        });
      },

      setActiveProduct: (product) =>
        set({ activeProduct: product }),

      setSidebarVisible: (visible) =>
        set({ sidebarVisible: visible }),

      toggleSidebar: () =>
        set((state: ShellStore) => ({ sidebarVisible: !state.sidebarVisible })),

      setHasHydrated: (value) =>
        set({ hasHydrated: value }),

      setUserPreferences: (prefs) =>
        set((state) => {
          const next = { ...state.userPreferences, ...prefs };
          themeService.applyUserPreferences(next);
          return { userPreferences: next };
        }),
    }),
    {
      name: "jaldee-shell-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        account: state.account,
        isAuthenticated: state.isAuthenticated,
        activeLocation: state.activeLocation,
        availableLocations: state.availableLocations,
        activeProduct: state.activeProduct,
        onboardingStatus: state.onboardingStatus,
        userPreferences: state.userPreferences,
        brandingOverrides: state.brandingOverrides,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedShellStore;
        const merged: ShellStore = {
          ...currentState,
          ...persisted,
          accessToken: null,
          isAuthenticated: false,
          account: normalizeAccountContext(
            persisted.account ?? currentState.account
          ),
          availableLocations: [],
          activeLocation: null,
          onboardingStatus: persisted.onboardingStatus ?? "complete",
          userPreferences: persisted.userPreferences ?? currentState.userPreferences,
        };

        if (merged.isAuthenticated && (!merged.user || !merged.account)) {
          return {
            ...currentState,
            hasHydrated: true,
            authResolved: false,
          };
        }

        return merged;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        const storedBranding = readStoredBranding();
        const accountBranding = state?.account?.id
          ? storedBranding[state.account.id]
          : undefined;
        // Restore persisted visual settings before session bootstrap completes.
        if (accountBranding ?? state?.account?.theme) {
          themeService.applyAccountTheme(accountBranding?.theme ?? state!.account!.theme);
          const whiteLabel = accountBranding?.whiteLabel ?? state?.account?.whiteLabel;
          if (whiteLabel) {
            themeService.applyWhiteLabel(whiteLabel);
          }
        }
        if (state?.userPreferences) {
          themeService.applyUserPreferences(state.userPreferences);
        }
      },
    }
  )
);
