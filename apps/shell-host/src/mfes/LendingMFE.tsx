import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function LendingMFE() {
  const props = useBuildMFEProps("mfe-lending", "/lending");

  if (!props) {
    return <div className="shell-mfe-loading">Initialising...</div>;
  }

  return <MFELoader remote={() => import("mfe_lending/mount")} props={props} />;
}
