import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";
import { MFEInitialisationFallback } from "./LocationRequiredState";

export function loadKartyRemote() {
  if (import.meta.env.DEV) {
    const kartyUrl = import.meta.env.VITE_KARTY_URL ?? "http://localhost:3004";
    return import(/* @vite-ignore */ `${kartyUrl}/src/mount.tsx`);
  }

  return import("mfe_karty/mount");
}

export function KartyMFE() {
  const props = useBuildMFEProps("mfe-karty", "/karty");

  if (!props) {
    return <MFEInitialisationFallback />;
  }

  return <MFELoader remote={loadKartyRemote} props={props} />;
}
