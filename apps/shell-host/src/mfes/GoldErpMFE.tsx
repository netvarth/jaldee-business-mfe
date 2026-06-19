import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function loadGoldErpRemote() {
  if (import.meta.env.DEV) {
    const goldErpUrl = import.meta.env.VITE_GOLDERP_URL ?? "http://localhost:3003";
    return import(/* @vite-ignore */ `${goldErpUrl}/src/mount.tsx`);
  }

  return import("mfe_golderp/mount");
}

export function GoldErpMFE() {
  const props = useBuildMFEProps("mfe-golderp", "/golderp");

  if (!props) {
    return (
      <div className="shell-mfe-loading">
        Initialising...
      </div>
    );
  }

  return (
    <MFELoader
      remote={loadGoldErpRemote}
      props={props}
    />
  );
}
