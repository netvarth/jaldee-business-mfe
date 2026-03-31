import { createContext, useContext } from "react";

/**
 * Context that provides the portal container element for Radix UI portals.
 * When the app is embedded inside a Shadow DOM, all portals (Dialog, Select, etc.)
 * must render inside the shadow root mount point — not document.body — so that
 * the injected styles apply correctly.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
  const el = useContext(PortalContainerContext);
  return el ?? undefined;
}
