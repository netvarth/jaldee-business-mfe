import type { AccountContext } from "./types";

export const DEFAULT_LICENSED_PRODUCTS: AccountContext["licensedProducts"] = [
  "health",
  "bookings",
  "golderp",
  "karty",
  "finance",
  "ivr",
];

export const DEFAULT_ENABLED_MODULES: AccountContext["enabledModules"] = [
  "customers",
  "drive",
  "ip",
  "users",
  "reports",
  "settings",
  "finance",
];

export function normalizeAccountContext(
  account: AccountContext
): AccountContext;
export function normalizeAccountContext(
  account: AccountContext | null | undefined
): AccountContext | null | undefined;
export function normalizeAccountContext(
  account: AccountContext | null | undefined
): AccountContext | null | undefined {
  if (!account) {
    return account;
  }

  const licensedProducts = new Set<string>(
    Array.isArray(account.licensedProducts)
      ? account.licensedProducts.map(String)
      : DEFAULT_LICENSED_PRODUCTS
  );

  licensedProducts.add("finance");
  licensedProducts.add("karty");

  const enabledModules = new Set<string>(
    Array.isArray(account.enabledModules)
      ? account.enabledModules.map(String)
      : DEFAULT_ENABLED_MODULES
  );

  enabledModules.add("drive");

  if (licensedProducts.has("finance")) {
    enabledModules.add("finance");
  }

  return {
    ...account,
    licensedProducts: Array.from(
      licensedProducts
    ) as AccountContext["licensedProducts"],
    enabledModules: Array.from(
      enabledModules
    ) as AccountContext["enabledModules"],
  };
}
