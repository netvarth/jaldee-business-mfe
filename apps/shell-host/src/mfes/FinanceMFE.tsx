import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";
import { MFEInitialisationFallback } from "./LocationRequiredState";

export function loadFinanceRemote() {
  if (import.meta.env.DEV) {
    const financeUrl = import.meta.env.VITE_FINANCE_URL ?? "http://localhost:3005";
    return import(/* @vite-ignore */ `${financeUrl}/src/mount.tsx`);
  }

  return import("mfe_finance/mount");
}

export function FinanceMFE() {
  const props = useBuildMFEProps("mfe-finance", "/finance");

  if (!props) {
    return <MFEInitialisationFallback />;
  }

  return <MFELoader remote={loadFinanceRemote} props={props} />;
}
