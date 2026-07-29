import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";
import { MFEInitialisationFallback } from "./LocationRequiredState";

export function loadLendingRemote() {
  if (import.meta.env.DEV) {
    const lendingUrl = import.meta.env.VITE_LENDING_URL ?? "http://localhost:3006";
    return import(/* @vite-ignore */ `${lendingUrl}/src/mount.tsx`);
  }

  return import("mfe_lending/mount");
}

export function LendingMFE() {
  const props = useBuildMFEProps("mfe-lending", "/lending");

  if (!props) {
    return <MFEInitialisationFallback />;
  }

  return <MFELoader remote={loadLendingRemote} props={props} />;
}
