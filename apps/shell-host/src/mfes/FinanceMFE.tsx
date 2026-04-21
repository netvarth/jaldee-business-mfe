import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function FinanceMFE() {
  const props = useBuildMFEProps("mfe-finance", "/finance");

  if (!props) {
    return <div className="shell-mfe-loading">Initialising...</div>;
  }

  return <MFELoader remote={() => import("mfe_finance/mount")} props={props} />;
}
