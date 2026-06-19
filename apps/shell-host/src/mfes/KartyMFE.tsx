import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function loadKartyRemote() {
  if (import.meta.env.DEV) {
    const kartyUrl = import.meta.env.VITE_KARTY_URL ?? "http://localhost:3005";
    return import(/* @vite-ignore */ `${kartyUrl}/src/mount.tsx`);
  }

  return import("mfe_karty/mount");
}

export function KartyMFE() {
  const props = useBuildMFEProps("mfe-karty", "/karty");

  if (!props) {
    return <div className="shell-mfe-loading">Initialising...</div>;
  }

  return <MFELoader remote={loadKartyRemote} props={props} />;
}
