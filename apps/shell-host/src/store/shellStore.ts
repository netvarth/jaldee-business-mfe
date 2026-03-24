import { create } from "zustand";
import type {
  UserContext,
  AccountContext,
  BranchLocation,
  ProductKey,
} from "@jaldee/auth-context";


interface ShellStore {
  // Auth
  user:            UserContext | null;
  account:         AccountContext | null;
  accessToken:     string | null;
  isAuthenticated: boolean;

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
  setLocation:      (location: BranchLocation) => void;
  setAvailableLocations: (locations: BranchLocation[]) => void;
  setActiveProduct: (product: ProductKey | null) => void;
  toggleSidebar:    () => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  user:               null,
  account:            null,
  accessToken:        null,
  isAuthenticated:    false,
  activeLocation:     null,
  availableLocations: [],
  activeProduct:      null,
  sidebarCollapsed:   false,
  sidebarVisible:    true,

  setAuth: (user, account, token) =>
    set({
      user,
      account,
      accessToken:     token,
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      user:            null,
      account:         null,
      accessToken:     null,
      isAuthenticated: false,
      activeLocation:  null,
      activeProduct:   null,
    }),

  setLocation: (location) =>
    set({ activeLocation: location }),

  setAvailableLocations: (locations) =>
    set({ availableLocations: locations }),

  setActiveProduct: (product) =>
    set({ activeProduct: product }),

  toggleSidebar: () =>
    set((state: ShellStore) => ({ sidebarVisible: !state.sidebarVisible })),
}));