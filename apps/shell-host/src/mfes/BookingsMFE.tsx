import { MFELoader }        from "../routing/MFELoader";
import { useBuildMFEProps } from "../hooks/useMFEProps";
import { MFEInitialisationFallback } from "./LocationRequiredState";

export function loadBookingsRemote() {
  if (import.meta.env.DEV) {
    const bookingsUrl = import.meta.env.VITE_BOOKINGS_URL ?? "http://localhost:3001";
    return import(/* @vite-ignore */ `${bookingsUrl}/src/mount.tsx`);
  }

  return import("mfe_bookings/mount");
}

export function BookingsMFE() {
  const props = useBuildMFEProps("mfe-bookings", "/bookings");

  if (!props) return <MFEInitialisationFallback />;

  return (
    <MFELoader
      remote={loadBookingsRemote}
      props={props}
    />
  );
}
