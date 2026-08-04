import { create } from "zustand";
import type { AppUser, AppWorkspace, PublicTenant } from "../types";

interface AppState {
  user: AppUser | null;
  workspace: AppWorkspace | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  authResolved: boolean;
  tenant: PublicTenant | null;
  accessToken: string;
  setSession: (user: AppUser, workspace: AppWorkspace, token?: string) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
  setAuthResolved: (value: boolean) => void;
  setTenant: (tenant: PublicTenant | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  workspace: null,
  isAuthenticated: false,
  hasHydrated: false,
  authResolved: false,
  tenant: null,
  accessToken: "",
  setSession: (user, workspace, token) =>
    set({
      user,
      workspace,
      isAuthenticated: true,
      accessToken: token ?? "",
    }),
  clearSession: () =>
    set({
      user: null,
      workspace: null,
      isAuthenticated: false,
      accessToken: "",
    }),
  setHasHydrated: (value) => set({ hasHydrated: value }),
  setAuthResolved: (value) => set({ authResolved: value }),
  setTenant: (tenant) => set({ tenant }),
}));
