import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function KartyMFE() {
  const props = useBuildMFEProps("mfe-karty", "/karty");

  if (!props) {
    return <div className="shell-mfe-loading">Initialising...</div>;
  }

  return <MFELoader remote={() => import("mfe_karty/mount")} props={props} />;
}
