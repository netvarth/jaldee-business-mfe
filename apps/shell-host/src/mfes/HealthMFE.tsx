import { MFELoader }        from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function HealthMFE() {
  const props = useBuildMFEProps("mfe-health", "/health");

  if (!props) return (
    <div style={{ padding: "32px", color: "#6B7280" }}>
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