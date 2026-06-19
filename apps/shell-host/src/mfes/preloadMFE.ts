import type { ProductKey } from "../store/shellStore";

type PreloadableProduct = Exclude<ProductKey, "ai">;

const preloaders: Record<PreloadableProduct, () => Promise<unknown>> = {
  health: () => import("./HealthMFE").then(({ loadHealthRemote }) => loadHealthRemote()),
  bookings: () => import("./BookingsMFE").then(({ loadBookingsRemote }) => loadBookingsRemote()),
  golderp: () => import("./GoldErpMFE").then(({ loadGoldErpRemote }) => loadGoldErpRemote()),
  karty: () => import("./KartyMFE").then(({ loadKartyRemote }) => loadKartyRemote()),
  finance: () => import("./FinanceMFE").then(({ loadFinanceRemote }) => loadFinanceRemote()),
  lending: () => import("./LendingMFE").then(({ loadLendingRemote }) => loadLendingRemote()),
  hr: () => import("./HrMFE").then(({ loadHrRemote }) => loadHrRemote()),
};

const pendingPreloads = new Map<PreloadableProduct, Promise<unknown>>();

export function preloadMFE(product: ProductKey) {
  if (product === "ai") {
    return;
  }

  if (!pendingPreloads.has(product)) {
    const preload = preloaders[product]().catch((error) => {
      pendingPreloads.delete(product);
      console.debug(`[MFE preload] ${product} preload failed`, error);
    });
    pendingPreloads.set(product, preload);
  }
}
