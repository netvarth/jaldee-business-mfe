import { MFELoader }        from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";
import { MFEInitialisationFallback } from "./LocationRequiredState";

export function loadHealthRemote() {
  if (import.meta.env.DEV) {
    const healthUrl = import.meta.env.VITE_HEALTH_URL ?? "http://localhost:3002";
    return import(/* @vite-ignore */ `${healthUrl}/src/mount.tsx`);
  }

  return import("mfe_health/mount");
}

export function HealthMFE() {
  const props = useBuildMFEProps("mfe-health", "/health");

  if (!props) return <MFEInitialisationFallback />;

  return (
    <MFELoader
      remote={loadHealthRemote}
      props={props}
    />
  );
}
