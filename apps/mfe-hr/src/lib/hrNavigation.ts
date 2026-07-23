export const HR_ANALYTICS_NAVIGATION_STATE = {
  navigationType: "analytics",
} as const;

export function isAnalyticsNavigation(state: unknown): boolean {
  return Boolean(
    state &&
      typeof state === "object" &&
      "navigationType" in state &&
      state.navigationType === "analytics",
  );
}

export const HR_ANALYTICS_BACK = {
  label: "Analytics",
  href: "/",
} as const;
