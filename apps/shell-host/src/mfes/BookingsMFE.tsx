import { MFELoader }        from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";

export function BookingsMFE() {
  const props = useBuildMFEProps("mfe-bookings", "/bookings");

  if (!props) return (
    <div className="shell-mfe-loading">
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
