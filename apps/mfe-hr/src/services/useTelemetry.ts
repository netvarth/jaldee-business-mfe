/**
 * useTelemetry — thin wrapper around MFEProps.telemetry
 *
 * Avoids destructuring `telemetry` from `useMFEProps()` in every component.
 * The shell injects the real Sentry + PostHog implementation; in dev/test it
 * falls back to no-ops so this never throws.
 *
 * Usage:
 *   const { trackEvent, captureError } = useTelemetry();
 *   trackEvent("hr.employee.created", { employeeId: id });
 */

import { useCallback } from "react";
import { useMFEProps } from "@jaldee/auth-context";

export function useTelemetry() {
  const { telemetry } = useMFEProps();

  return {
    trackEvent: useCallback(
      (name: string, props?: Record<string, unknown>) => telemetry.trackEvent(name, props),
      [telemetry]
    ),
    trackPageView: useCallback(
      (path: string) => telemetry.trackPageView(path),
      [telemetry]
    ),
    captureError: useCallback(
      (error: Error, context?: Record<string, unknown>) => telemetry.captureError(error, context),
      [telemetry]
    ),
  };
}
