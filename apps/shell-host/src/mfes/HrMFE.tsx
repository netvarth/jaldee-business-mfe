import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

function loadHrRemote() {
  if (import.meta.env.DEV) {
    const hrUrl = import.meta.env.VITE_HR_URL ?? "http://localhost:4008";
    return import(/* @vite-ignore */ `${hrUrl}/src/mount.tsx`);
  }

  return import("mfe_hr/mount");
}

export function HrMFE() {
  const props = useBuildMFEProps("mfe-hr", "/hr");

  if (!props) {
    return <div className="shell-mfe-loading">Initialising...</div>;
  }

  return <MFELoader remote={loadHrRemote} props={props} />;
}


