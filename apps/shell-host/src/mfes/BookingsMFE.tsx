import { MFELoader }        from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function BookingsMFE() {
  const props = useBuildMFEProps("mfe-bookings", "/bookings");

  if (!props) return (
    <div style={{ padding: "32px", color: "#6B7280" }}>
      Initialising...
    </div>
  );

  return (
    <MFELoader
      remote={() => import("mfe_bookings/mount")}
      props={props}
    />
  );
}
