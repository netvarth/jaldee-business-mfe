import type { AccountContext, ProductKey } from "@jaldee/auth-context";

const PRODUCT_PRIORITY: ProductKey[] = [
  "health",
  "bookings",
  "golderp",
  "karty",
  "finance",
  "lending",
  "hr",
  "ai",
];

const PRODUCT_HOME_PATHS: Partial<Record<ProductKey, string>> = {
  karty: "/karty/orders/dashboard",
};

export function getPreferredLandingPathFromProducts(products?: readonly string[] | null): string {
  const licensedProducts = Array.isArray(products) ? products : [];
  const prioritizedProduct = PRODUCT_PRIORITY.find((product) => licensedProducts.includes(product));

  if (prioritizedProduct) {
    return PRODUCT_HOME_PATHS[prioritizedProduct] ?? `/${prioritizedProduct}`;
  }

  return "/customers";
}

export function getPreferredLandingPath(account?: AccountContext | null): string {
  return getPreferredLandingPathFromProducts(account?.licensedProducts);
}
