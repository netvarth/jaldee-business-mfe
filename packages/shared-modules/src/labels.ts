import type { AccountLabels, ProductKey } from "@jaldee/auth-context";

export type LabelEntity = keyof AccountLabels;

function isHrProduct(product: ProductKey): boolean {
  return product === "hr";
}

export function resolveEntityLabel(
  labels: AccountLabels,
  entity: LabelEntity,
  product: ProductKey
): string {
  if (entity === "customer" && isHrProduct(product)) {
    return "Employee";
  }

  return labels[entity];
}

export function resolveCustomerLabel(labels: AccountLabels, product: ProductKey): string {
  return resolveEntityLabel(labels, "customer", product);
}

export function resolveStaffLabel(labels: AccountLabels, product: ProductKey): string {
  return resolveEntityLabel(labels, "staff", product);
}

export function resolveLeadLabel(labels: AccountLabels, product: ProductKey): string {
  return resolveEntityLabel(labels, "lead", product);
}

export function resolveLabelSet(labels: AccountLabels, product: ProductKey): AccountLabels {
  return {
    customer: resolveCustomerLabel(labels, product),
    staff: resolveStaffLabel(labels, product),
    service: resolveEntityLabel(labels, "service", product),
    appointment: resolveEntityLabel(labels, "appointment", product),
    order: resolveEntityLabel(labels, "order", product),
    lead: resolveLeadLabel(labels, product),
  };
}
