import { MFELoader } from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

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
      remote={() => import("mfe_golderp/mount")}
      props={props}
    />
  );
}
