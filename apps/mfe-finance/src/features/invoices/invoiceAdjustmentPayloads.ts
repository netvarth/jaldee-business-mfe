export function resolveTenantUid(account: unknown) {
  const record = (account ?? {}) as Record<string, unknown>;
  return String(record.tenantUid ?? record.uid ?? record.id ?? "");
}

export function buildDiscountMutationPayload(input: any) {
  const value = Number(input.value ?? input.discountValue ?? 0);
  return {
    tenantUid: input.tenantUid || undefined,
    name: input.name || "",
    description: input.description || undefined,
    calculationType: input.calculationType || "FIXED_AMOUNT",
    discountType: input.discountType || "PREDEFINED",
    discountValue: value,
    status: input.status || "ACTIVE",
    uid: input.uid,
    discountedAmount: Number(input.discountedAmount ?? value),
  };
}

export function buildCouponMutationPayload(input: any) {
  const amount = Number(input.amount ?? input.discountValue ?? 0);
  const payload: Record<string, unknown> = {
    uid: input.uid,
    tenantUid: input.tenantUid || undefined,
    name: input.name || "",
    description: input.description || undefined,
    calculationType: input.calculationType || "FIXED_AMOUNT",
    amount,
    couponStatus: input.couponStatus || input.status || undefined,
    couponCode: input.couponCode || input.code || "",
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    published: input.published,
    publishedDate: input.publishedDate || undefined,
    maxDiscountValue: Number(input.maxDiscountValue ?? amount),
    termsConditions: input.termsConditions || undefined,
    timezone: input.timezone || "Asia/Calcutta",
    sourceService: "API_GATEWAY",
    feature: input.feature || undefined,
    subFeature: input.subFeature || undefined,
    featureModule: input.featureModule || undefined,
    rules: input.rules ?? [],
    discountedAmount: Number(input.discountedAmount ?? amount),
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
