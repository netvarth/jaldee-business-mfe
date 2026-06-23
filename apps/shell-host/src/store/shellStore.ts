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
  >
>;

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

      setAuth: (user, account, token) =>
        set({
          user,
          account: normalizeAccountContext(account),
          accessToken: token,
          isAuthenticated: true,
        }),

      setAccount: (account) =>
        set({
          account: normalizeAccountContext(account),
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
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        activeLocation: state.activeLocation,
        availableLocations: state.availableLocations,
        activeProduct: state.activeProduct,
        onboardingStatus: state.onboardingStatus,
        userPreferences: state.userPreferences,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedShellStore;
        const merged: ShellStore = {
          ...currentState,
          ...persisted,
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
        // Apply rehydrated preferences immediately
        if (state?.userPreferences) {
          themeService.applyUserPreferences(state.userPreferences);
        }
      },
    }
  )
);
