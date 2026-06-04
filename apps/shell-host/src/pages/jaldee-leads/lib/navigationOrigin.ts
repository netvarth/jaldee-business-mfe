import type { Location, NavigateFunction } from 'react-router-dom';

export const DASHBOARD_PATH = '/jaldee-leads/dashboard';

export function cameFromDashboard(location: Location): boolean {
  return Boolean((location.state as { fromDashboard?: boolean } | null)?.fromDashboard);
}

export function navigateBackToDashboard(navigate: NavigateFunction) {
  navigate(DASHBOARD_PATH, { replace: true, state: null });
}
