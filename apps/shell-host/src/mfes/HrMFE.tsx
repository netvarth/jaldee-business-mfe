import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";
import { MFEInitialisationFallback } from "./LocationRequiredState";

export function loadHrRemote() {
  if (import.meta.env.DEV) {
    const hrUrl = import.meta.env.VITE_HR_URL ?? "http://localhost:3007";
    return import(/* @vite-ignore */ `${hrUrl}/src/mount.tsx`);
  }

  return import("mfe_hr/mount");
}

export function HrMFE() {
  const props = useBuildMFEProps("mfe-hr", "/hr");

  if (!props) {
    return <MFEInitialisationFallback />;
  }

  return <MFELoader remote={loadHrRemote} props={props} />;
}

