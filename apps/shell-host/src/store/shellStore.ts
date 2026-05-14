import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  UserContext,
  AccountContext,
  BranchLocation,
  ProductKey,
} from "@jaldee/auth-context";
import {
  DEFAULT_ENABLED_MODULES,
  DEFAULT_LICENSED_PRODUCTS,
  normalizeAccountContext,
} from "@jaldee/auth-context";

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
  enabledModules: [
    ...DEFAULT_ENABLED_MODULES,
    "membership",
  ] as AccountContext["enabledModules"],
  theme: {
    primaryColor: "#5B21D1",
    logoUrl: "",
  },
  plan: "growth",
  domain: "healthcare",
  labels: {
    customer: "Patient",
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
  >
>;

interface ShellStore {
  // Auth
  user:            UserContext | null;
  account:         AccountContext | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
  hasHydrated:     boolean;
  onboardingStatus: "complete" | "pending";

  // Location
  activeLocation:     BranchLocation | null;
  availableLocations: BranchLocation[];

  // UI
  activeProduct:   ProductKey | null;
  sidebarCollapsed: boolean;
  sidebarVisible:    boolean;

  // Actions
  setAuth:          (user: UserContext, account: AccountContext, token: string) => void;
  clearAuth:        () => void;
  setOnboardingStatus: (status: "complete" | "pending") => void;
  setLocation:      (location: BranchLocation) => void;
  setAvailableLocations: (locations: BranchLocation[]) => void;
  setActiveProduct: (product: ProductKey | null) => void;
  toggleSidebar:    () => void;
  setSidebarVisible: (visible: boolean) => void;
  setHasHydrated:   (value: boolean) => void;
}

export const useShellStore = create<ShellStore>()(
  persist(
    (set) => ({
      user:               DEFAULT_USER,
      account:            DEFAULT_ACCOUNT,
      accessToken:        null,
      isAuthenticated:    false,
      hasHydrated:        false,
      onboardingStatus:   "complete",
      activeLocation:     null,
      availableLocations: [],
      activeProduct:      null,
      sidebarCollapsed:   false,
      sidebarVisible:     true,

      setAuth: (user, account, token) =>
        set({
          user,
          account: normalizeAccountContext(account),
          accessToken: token,
          isAuthenticated: true,
        }),

      setOnboardingStatus: (status) =>
        set({ onboardingStatus: status }),

      clearAuth: () =>
        set({
          user: DEFAULT_USER,
          account: DEFAULT_ACCOUNT,
          accessToken: null,
          isAuthenticated: false,
          onboardingStatus: "complete",
          activeLocation: null,
          availableLocations: [],
          activeProduct: null,
        }),

      setLocation: (location) =>
        set({ activeLocation: location }),

      setAvailableLocations: (locations) =>
        set({ availableLocations: locations }),


      setActiveProduct: (product) =>
        set({ activeProduct: product }),

      setSidebarVisible: (visible) =>
        set({ sidebarVisible: visible }),

      toggleSidebar: () =>
        set((state: ShellStore) => ({ sidebarVisible: !state.sidebarVisible })),

      setHasHydrated: (value) =>
        set({ hasHydrated: value }),
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
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedShellStore;
        const merged: ShellStore = {
          ...currentState,
          ...persisted,
          account: normalizeAccountContext(
            persisted.account ?? currentState.account
          ),
          availableLocations:
            persisted.availableLocations ?? currentState.availableLocations,
          activeLocation: persisted.activeLocation ?? currentState.activeLocation,
          onboardingStatus: persisted.onboardingStatus ?? "complete",
        };

        if (merged.isAuthenticated && (!merged.user || !merged.account)) {
          return {
            ...currentState,
            hasHydrated: true,
          };
        }

        return merged;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
