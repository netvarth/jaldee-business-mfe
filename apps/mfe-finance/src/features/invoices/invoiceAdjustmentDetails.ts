import { financeApi } from "../../lib/financeApi";
import type { CouponDetail, DiscountDetail } from "./invoiceFormModel";

export async function fetchDiscountDetail(
  uid: string,
  fallback: any,
  includeMetadata = false,
): Promise<DiscountDetail> {
  const response = await financeApi.discounts.detail<any>(uid);
  const data = response.data ?? {};
  return {
    uid: String(data.uid ?? data.id ?? uid),
    name: String(data.name ?? fallback?.label ?? "Discount"),
    discountType: String(data.discountType ?? data.discType ?? fallback?.discountType ?? "PREDEFINED"),
    calculationType: String(data.calculationType ?? fallback?.calculationType ?? "FIXED_AMOUNT"),
    discountValue: Number(data.discountValue ?? fallback?.discountValue ?? 0),
    ...(includeMetadata
      ? {
          description: String(data.description ?? fallback?.description ?? ""),
          tenantUid: String(data.tenantUid ?? fallback?.tenantUid ?? ""),
          status: String(data.status ?? fallback?.status ?? "ACTIVE"),
        }
      : {}),
  };
}

export async function fetchCouponDetail(uid: string, fallback: any): Promise<CouponDetail> {
  const response = await financeApi.coupons.detail<any>(uid);
  const data = response.data ?? {};
  return {
    uid: String(data.uid ?? data.couponId ?? data.id ?? uid),
    code: String(data.couponCode ?? data.code ?? fallback?.code ?? ""),
    name: String(data.name ?? fallback?.label ?? "Coupon"),
    discountType: String(data.discountType ?? fallback?.discountType ?? "PREDEFINED"),
    calculationType: String(data.calculationType ?? fallback?.calculationType ?? "FIXED_AMOUNT"),
    discountValue: Number(data.discountValue ?? data.discount ?? data.value ?? fallback?.discountValue ?? 0),
    description: String(data.description ?? fallback?.description ?? ""),
    feature: String(data.feature ?? fallback?.feature ?? "FINANCE"),
    subFeature: String(data.subFeature ?? fallback?.subFeature ?? "BASE_CRM"),
    featureModule: String(data.featureModule ?? fallback?.featureModule ?? "BASE_CRM_CORE"),
    tenantUid: String(data.tenantUid ?? fallback?.tenantUid ?? ""),
    status: String(data.couponStatus ?? data.status ?? fallback?.status ?? "ACTIVE"),
    published: Boolean(data.published ?? fallback?.published),
    publishedDate: String(data.publishedDate ?? fallback?.publishedDate ?? ""),
    startDate: String(data.startDate ?? fallback?.startDate ?? ""),
    endDate: String(data.endDate ?? fallback?.endDate ?? ""),
    maxDiscountValue: Number(data.maxDiscountValue ?? fallback?.maxDiscountValue ?? data.discountValue ?? 0),
    termsConditions: String(data.termsConditions ?? fallback?.termsConditions ?? ""),
    timezone: String(data.timezone ?? fallback?.timezone ?? "Asia/Calcutta"),
    discountedAmount: Number(data.discountedAmount ?? fallback?.discountedAmount ?? data.discountValue ?? 0),
    rules: Array.isArray(data.rules) ? data.rules : fallback?.rules ?? [],
  };
}
