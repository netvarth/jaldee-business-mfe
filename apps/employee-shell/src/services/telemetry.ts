import posthog from "posthog-js";

let initialized = false;

export function initTelemetry() {
  if (initialized) return;
  initialized = true;

  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  const host = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://app.posthog.com";

  if (key) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
    });
  }
}

export function identifyUser(user: { id: string; name: string; email: string }, workspaceId: string) {
  posthog.identify(user.id, {
    name: user.name,
    email: user.email,
    workspace_id: workspaceId,
    shell: "employee",
  });
}

export function clearTelemetryUser() {
  posthog.reset();
}

export const telemetryService = {
  captureError(error: Error, context?: Record<string, unknown>) {
    console.error("[employee-shell:error]", error, context);
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_type: error.name,
      shell: "employee",
      ...context,
    });
  },
  trackEvent(name: string, props?: Record<string, unknown>) {
    posthog.capture(name, { shell: "employee", ...props });
  },
  trackPageView(path: string) {
    posthog.capture("$pageview", {
      $current_url: path,
      shell: "employee",
    });
  },
};
