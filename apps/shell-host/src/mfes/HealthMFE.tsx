import { MFELoader }        from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function HealthMFE() {
  const props = useBuildMFEProps("mfe-health", "/health");

  if (!props) return (
    <div className="shell-mfe-loading">
      Initialising...
    </div>
  );

  return (
    <MFELoader
      remote={() => import("mfe_health/mount")}
      props={props}
    />
  );
}
