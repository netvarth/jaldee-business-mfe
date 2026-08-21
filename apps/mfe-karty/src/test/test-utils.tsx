import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { MFEPropsContext } from "@jaldee/auth-context";
import type { MFEProps } from "@jaldee/auth-context";

const mockMFEProps: MFEProps = {
  mfeName: "mfe-karty",
  basePath: "/karty",
  authToken: "test-token",
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    roles: [{ id: "owner", name: "Owner", tier: "owner" }],
    permissions: ["*"],
  },
  account: {
    id: "acc-1",
    tenantUid: "00000000-0000-0000-0000-000000000001",
    name: "Test Store",
    licensedProducts: ["karty"],
    enabledModules: ["settings"],
    theme: { primaryColor: "#5B21D1", logoUrl: "" },
    plan: "enterprise",
    domain: "retail",
    labels: {
      customer: "Customer",
      staff: "Staff",
      service: "Product",
      appointment: "Order",
      order: "Order",
      lead: "Lead",
    },
  },
  theme: { primaryColor: "#5B21D1" },
  locale: "en",
  location: { id: "loc-1", name: "Main", code: "MAIN" },
  navigate: () => {},
  history: {} as any,
  eventBus: { emit: () => {}, on: () => () => {} },
  onError: () => {},
  telemetry: { captureError: () => {}, trackEvent: () => {}, trackPageView: () => {} },
};

/**
 * Creates a fresh QueryClient configured for testing (no retries, no refetch).
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Custom render that wraps components with the providers they need:
 * - MFEPropsContext.Provider (@jaldee/auth-context)
 * - QueryClientProvider (TanStack Query)
 * - MemoryRouter (react-router-dom)
 */
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MFEPropsContext.Provider value={mockMFEProps}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </MFEPropsContext.Provider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

export { renderWithProviders, mockMFEProps };
