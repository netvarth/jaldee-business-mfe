import { createContext, useContext } from "react";
import type { MFEProps } from "./types";

export const MFEPropsContext = createContext<MFEProps | null>(null);

export function useMFEProps(): MFEProps {
  const ctx = useContext(MFEPropsContext);
  if (!ctx) {
    throw new Error(
      "useMFEProps must be used inside an MFE mounted by the shell. " +
      "Make sure MFEPropsContext.Provider wraps your MFE root."
    );
  }
  return ctx;
}