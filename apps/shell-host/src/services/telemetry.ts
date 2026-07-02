import posthog from "posthog-js";
import type { TelemetryService } from "@jaldee/auth-context";
import { useShellStore } from "../store/shellStore";

let _initialized = false;

const getOS = (ua: string) => {
  if (ua.indexOf("Win") !== -1) return "Windows";
  if (ua.indexOf("Mac") !== -1) return "MacOS";
  if (ua.indexOf("X11") !== -1) return "UNIX";
  if (ua.indexOf("Linux") !== -1) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Unknown";
};

const getBrowser = (ua: string) => {
  if (ua.indexOf("Chrome") !== -1) return "Chrome";
  if (ua.indexOf("Safari") !== -1) return "Safari";
  if (ua.indexOf("Firefox") !== -1) return "Firefox";
  if (ua.indexOf("MSIE") !== -1) return "IE";
  return "Unknown";
};

const getDeviceType = (ua: string) => {
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
};

function getServiceGatewayPrefix() {
  const prefix = import.meta.env.VITE_SERVICE_GATEWAY_PREFIX?.trim();
  if (!prefix || prefix === "/") return "";
  return `/${prefix.replace(/^\/+|\/+$/g, "")}`;
}

function buildPlatformServiceUrl(path: string) {
  const configuredBase = import.meta.env.VITE_BASE_SERVICE_BASE_URL?.trim().replace(/\/$/, "") || getServiceGatewayPrefix();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!configuredBase) {
    return typeof window !== "undefined" ? `${window.location.origin}${normalizedPath}` : normalizedPath;
  }
  const combinedPath = `${configuredBase}${normalizedPath}`;
  return typeof window !== "undefined" && configuredBase.startsWith("/")
    ? new URL(combinedPath, window.location.origin).toString()
    : combinedPath;
}

/** Call once at shell startup before mounting any MFE. */
export function initTelemetry() {
  if (_initialized) return;
  _initialized = true;

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY?.trim();
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST?.trim() ?? "https://app.posthog.com";
  const env = import.meta.env.MODE ?? "development";

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      // Disable automatic pageview — we send them manually via trackPageView
      capture_pageview: false,
    });
  }
}

/**
 * Identify the logged-in user in PostHog.
 * Call this once after a successful login/session restore.
 */
export function identifyUser(user: { id: string; name: string; email: string }, accountId: string) {
  posthog.identify(user.id, {
    name: user.name,
    email: user.email,
    account_id: accountId,
  });
}

/** Clear identity on logout. */
export function clearTelemetryUser() {
  posthog.reset();
}

/**
 * The concrete TelemetryService implementation injected into every MFE
 * via MFEProps.telemetry.
 */
export const telemetryService: TelemetryService = {
  captureError(error, context) {
    console.error("[telemetry:error]", error, context);

    try {
      const state = useShellStore.getState();
      const user = state.user;
      const account = state.account;
      const token = state.accessToken;

      // 1. Capture error in PostHog
      posthog.capture("$exception", {
        $exception_message: error.message || String(error),
        $exception_type: error.name || "Error",
        $exception_stack_trace_raw: error.stack || "",
        mfe: context?.mfe || "shell-host",
        ...context
      });

      // 2. Skip sending REST/API errors to the backend notification API for now
      if (context?.type === "API_ERROR") {
        console.debug("[telemetry:skip-backend] Skipping REST error notification to backend health API");
        return;
      }

      // 3. Report to Backend platform health report API
      const payload = {
        userInfo: user ? {
          businessName: account?.name || "Jaldee Business",
          businessSubdomain: account?.domain || "",
          name: user.name || "Jaldee User",
          id: user.id ? (isNaN(Number(user.id)) ? user.id : Number(user.id)) : 0,
          phonenumber: user.email && /^\d+$/.test(user.email) ? Number(user.email) : undefined,
          sector: account?.domain || "",
          type: user.roles?.[0]?.name || "Provider"
        } : null,
        url: typeof window !== "undefined" ? window.location.pathname + window.location.search : "",
        errorName: error.name || "Error",
        errorMessage: error.message || String(error),
        errorStack: error.stack || "",
        source: (context?.mfe as string) || "shell-host",
        deviceInfo: typeof window !== "undefined" ? {
          userAgent: navigator.userAgent,
          os: getOS(navigator.userAgent),
          browser: getBrowser(navigator.userAgent),
          deviceType: getDeviceType(navigator.userAgent),
          orientation: window.screen && window.screen.orientation ? window.screen.orientation.type : "landscape"
        } : null,
        requestFrom: "Browser- GlobalErrorHandler",
        timestamp: new Date().toISOString()
      };

      const reportUrl = buildPlatformServiceUrl("/platform-service/v1/api/platform/notification/health/report");

      fetch(reportUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      }).catch((err) => {
        console.error("Failed to report telemetry error to backend API:", err);
      });
    } catch (e) {
      console.error("Critical error in telemetry captureError logic:", e);
    }
  },

  trackEvent(name, props) {
    console.debug("[telemetry:event]", name, props);
    posthog.capture(name, props);
  },

  trackPageView(path) {
    console.debug("[telemetry:pageview]", path);
    posthog.capture("$pageview", { $current_url: path });
  },
};

