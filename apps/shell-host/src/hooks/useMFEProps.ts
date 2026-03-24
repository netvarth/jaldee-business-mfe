import { useNavigate } from "react-router-dom";
import { useShellStore } from "../store/shellStore";
import { eventBus } from "../eventBus/eventBus";
import type { MFEProps } from "@jaldee/auth-context";

export function useBuildMFEProps(
  mfeName: string,
  basePath: string
): MFEProps | null {
  const navigate = useNavigate();
  const { user, account, accessToken, activeLocation } = useShellStore();
  console.log("[useBuildMFEProps]", { 
    user: !!user, 
    account: !!account, 
    activeLocation: !!activeLocation 
  });

  if (!user || !account || !activeLocation) return null;

  return {
    mfeName,
    basePath,
    authToken:  accessToken ?? "",
    user,
    account,
    theme:      { primaryColor: account.theme.primaryColor },
    locale:     "en-IN",
    location:   activeLocation,
    navigate:   (route: string) => navigate(route),
    eventBus,
    onError:    (error) => {
      console.error(`[${mfeName}] MFE Error:`, error);
    },
    telemetry: {
      captureError: (error) => console.error("[telemetry]", error),
      trackEvent:   (name, props) => console.debug("[telemetry]", name, props),
      trackPageView:(path) => console.debug("[telemetry:pageview]", path),
    },
  };
}