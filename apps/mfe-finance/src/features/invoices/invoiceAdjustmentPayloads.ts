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
  const amount = Number(input.discountValue ?? 0);
  const publishedDate = input.publishedDate || new Date().toISOString();
  return {
    uid: input.uid,
    tenantUid: input.tenantUid || undefined,
    name: input.name || "",
    description: input.description || undefined,
    calculationType: input.calculationType || "FIXED_AMOUNT",
    amount,
    couponStatus: input.status || "INACTIVE",
    couponCode: input.code || "",
    startDate: publishedDate,
    endDate: publishedDate,
    published: Boolean(input.published),
    publishedDate,
    maxDiscountValue: Number(input.maxDiscountValue ?? amount),
    termsConditions: input.termsConditions || undefined,
    timezone: input.timezone || "Asia/Calcutta",
    sourceService: "API_GATEWAY",
    feature: input.feature || "BASE_CRM",
    subFeature: input.subFeature || "BASE_CRM",
    featureModule: input.featureModule || "BASE_CRM_CORE",
    rules: input.rules ?? [],
    discountedAmount: Number(input.discountedAmount ?? amount),
  };
}
