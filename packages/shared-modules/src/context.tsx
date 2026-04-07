import { createContext, useContext } from "react";
import type { SharedModuleProps } from "./types";

export const SharedModulesContext = createContext<SharedModuleProps | null>(null);

export const SharedModulesProvider = SharedModulesContext.Provider;

export function useSharedModulesContext(): SharedModuleProps {
  const context = useContext(SharedModulesContext);

  if (!context) {
    throw new Error("useSharedModulesContext must be used within SharedModulesProvider.");
  }

  return context;
}
