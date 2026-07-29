import { MapPin } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";

export function MFEInitialisationFallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const availableLocations = useShellStore((state) => state.availableLocations);

  if (availableLocations.length > 0) {
    return <div className="shell-mfe-loading">Initialising...</div>;
  }

  return (
    <div
      data-testid="mfe-location-required"
      className="shell-mfe-location-required"
    >
      <MapPin size={34} aria-hidden="true" />
      <div>
        <h2>Location not set</h2>
        <p>
          A branch or service location is required.{" "}
          <button
            id="mfe-location-required-link"
            data-testid="mfe-location-required-link"
            type="button"
            className="shell-mfe-location-required__link"
            onClick={() =>
              navigate(`/settings/locations?returnTo=${encodeURIComponent(location.pathname + location.search)}`)
            }
          >
            Click here
          </button>{" "}
          to open Branches &amp; Locations and create one.
        </p>
      </div>
    </div>
  );
}
