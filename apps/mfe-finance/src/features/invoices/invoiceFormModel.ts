import type { ComboboxOption } from "@jaldee/design-system";

export interface InvoiceItem {
  id: string;
  detailUid?: string;
  itemUid?: string;
  itemType: "FINANCE_ITEM" | "SERVICE" | "ADHOC_ITEM";
  name: string;
  qty: number;
  price: number;
  date: string;
  discountId?: string;
  discountName?: string;
  discountType?: string;
  calculationType?: string;
  discountValue?: number;
  privateNote?: string;
  displayNote?: string;
  discountAmount?: number;
  afterDiscount?: number;
  taxAmount?: number;
  totalAmount?: number;
  discountApplicable?: boolean;
  couponId?: string;
  couponName?: string;
  couponCode?: string;
  couponDiscountValue?: number;
  rawCoupon?: any;
}

export interface FinanceCatalogOption extends ComboboxOption {
  itemUid?: string;
  itemType?: "FINANCE_ITEM";
  price?: number;
  discountApplicable?: boolean;
}

export interface LocationOption {
  value: string;
  label: string;
}

export interface SequenceDetailOption {
  value: string;
  label: string;
  isDefault?: boolean;
}

export interface DiscountOption {
  value: string;
  label: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  tenantUid?: string;
  status?: string;
}

export interface DiscountDetail {
  uid: string;
  name: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  tenantUid?: string;
  status?: string;
}

export interface CouponOption {
  value: string;
  label: string;
  code: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  feature?: string;
  subFeature?: string;
  featureModule?: string;
  tenantUid?: string;
  status?: string;
  published?: boolean;
  publishedDate?: string;
  startDate?: string;
  endDate?: string;
  maxDiscountValue?: number;
  termsConditions?: string;
  timezone?: string;
  discountedAmount?: number;
  rules?: unknown[];
}

export interface CouponDetail {
  uid: string;
  code: string;
  name: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  feature?: string;
  subFeature?: string;
  featureModule?: string;
  tenantUid?: string;
  status?: string;
  published?: boolean;
  publishedDate?: string;
  startDate?: string;
  endDate?: string;
  maxDiscountValue?: number;
  termsConditions?: string;
  timezone?: string;
  discountedAmount?: number;
  rules?: unknown[];
}

export interface ConsumerOption extends ComboboxOption {
  consumerUid: string;
  consumerType?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface InvoiceTemplateSummary {
  uid: string;
  templateName: string;
  description?: string;
  status?: string;
  detailList?: any[];
}

export function readArrayPayload(value: any): any[] {
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data?.content)) return value.data.content;
  if (Array.isArray(value?.data?.data?.content)) return value.data.data.content;
  if (Array.isArray(value?.data?.content?.content)) return value.data.content.content;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value)) return value;
  return [];
}

export function mapDiscountOptions(items: any[]): DiscountOption[] {
  return items
    .map((item: any) => ({
      value: String(
        item.uid ??
        item.id ??
        item.discountId ??
        item.discountUid ??
        item.code ??
        ""
      ),
      label: String(item.name ?? item.discountName ?? item.displayName ?? item.label ?? "Discount"),
      discountType: String(item.discountType ?? item.discType ?? item.type ?? "PREDEFINED"),
      calculationType: String(item.calculationType ?? item.calcType ?? "FIXED_AMOUNT"),
      discountValue: Number(item.discountValue ?? item.value ?? item.amount ?? 0),
      description: String(item.description ?? ""),
      tenantUid: String(item.tenantUid ?? ""),
      status: String(item.status ?? "ACTIVE"),
    }))
    .filter((item: DiscountOption) => item.value);
}

export function mapCouponOptions(items: any[]): CouponOption[] {
  return items
    .map((item: any) => ({
      value: String(item.uid ?? item.couponId ?? item.id ?? item.code ?? ""),
      label: String(item.name ?? item.displayName ?? item.couponCode ?? item.code ?? "Coupon"),
      code: String(item.couponCode ?? item.code ?? ""),
      discountType: String(item.discountType ?? item.type ?? "PREDEFINED"),
      calculationType: String(item.calculationType ?? "FIXED_AMOUNT"),
      discountValue: Number(item.discountValue ?? item.discount ?? item.value ?? item.amount ?? 0),
      description: String(item.description ?? ""),
      feature: String(item.feature ?? "FINANCE"),
      subFeature: String(item.subFeature ?? item.feature ?? "BASE_CRM"),
      featureModule: String(item.featureModule ?? "BASE_CRM_CORE"),
      tenantUid: String(item.tenantUid ?? ""),
      status: String(item.couponStatus ?? item.status ?? "ACTIVE"),
      published: Boolean(item.published),
      publishedDate: typeof item.publishedDate === "string" ? item.publishedDate : undefined,
      startDate: typeof item.startDate === "string" ? item.startDate : undefined,
      endDate: typeof item.endDate === "string" ? item.endDate : undefined,
      maxDiscountValue: Number(item.maxDiscountValue ?? item.discountValue ?? item.amount ?? 0),
      termsConditions: String(item.termsConditions ?? ""),
      timezone: String(item.timezone ?? "Asia/Calcutta"),
      discountedAmount: Number(item.discountedAmount ?? item.discountValue ?? item.amount ?? 0),
      rules: Array.isArray(item.rules) ? item.rules : [],
    }))
    .filter((item: CouponOption) => item.value);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function mapInvoiceItem(item: any, index: number): InvoiceItem {
  const appliedDiscount =
    item.discount ??
    item.appliedDiscount ??
    item.discountDetail ??
    item.discountDto ??
    item.discounts?.[0] ??
    item.discountList?.[0];
  const appliedCoupon =
    item.coupon ??
    item.appliedCoupon ??
    item.couponDetail ??
    item.couponDto ??
    item.coupons?.[0] ??
    item.couponList?.[0];
  const qty = Number(item.quantity || 1);
  const price = Number(item.price || 0);
  const discountAmount = Number(
    item.discountAmount ??
    item.discountTotal ??
    appliedDiscount?.discountAmount ??
    appliedDiscount?.discountedAmount ??
    appliedDiscount?.discountValue ??
    0,
  );
  const afterDiscount = Number(item.netTotalAfterDiscount || item.afterDiscount || price * qty - discountAmount);
  const taxAmount = Number(item.taxAmount ?? item.taxTotal ?? item.totalTax ?? 0);
  return {
    id: String(item.uid || item.itemUid || `loaded-item-${index}`),
    detailUid: item.uid ? String(item.uid) : undefined,
    itemUid: item.itemUid ? String(item.itemUid) : undefined,
    itemType:
      item.itemType === "FINANCE_ITEM"
        ? "FINANCE_ITEM"
        : item.itemType === "SERVICE"
          ? "SERVICE"
          : "ADHOC_ITEM",
    name: String(item.itemName || item.name || "Service Item"),
    qty,
    price,
    date: item.processedDate ? new Date(item.processedDate).toISOString().slice(0, 10) : todayIsoDate(),
    discountId: readString(appliedDiscount?.id, appliedDiscount?.uid, item.discountId, item.discountUid) || undefined,
    discountName: readString(appliedDiscount?.name, item.discountName) || undefined,
    discountType: readString(appliedDiscount?.discountType, appliedDiscount?.discType, item.discountType) || undefined,
    calculationType: readString(appliedDiscount?.calculationType, appliedDiscount?.calcType, item.calculationType) || undefined,
    discountValue: Number(
      appliedDiscount?.discountValue ??
      appliedDiscount?.discountedAmount ??
      item.discountValue ??
      item.discountTotal ??
      0,
    ),
    privateNote: readString(appliedDiscount?.privateNote, item.privateNote) || undefined,
    displayNote: readString(appliedDiscount?.displayNote, item.displayNote) || undefined,
    discountAmount,
    afterDiscount,
    taxAmount,
    totalAmount: Number(item.total ?? item.netTotal ?? afterDiscount + taxAmount),
    discountApplicable: item.discountApplicable !== undefined ? Boolean(item.discountApplicable) : undefined,
    couponId: readString(appliedCoupon?.id, appliedCoupon?.uid, item.couponId, item.couponUid) || undefined,
    couponName: readString(appliedCoupon?.name, item.couponName) || undefined,
    couponCode: readString(appliedCoupon?.code, appliedCoupon?.couponCode, item.couponCode) || undefined,
    couponDiscountValue: Number(
      appliedCoupon?.discountValue ??
      appliedCoupon?.discountedAmount ??
      item.couponDiscountValue ??
      item.couponValue ??
      0,
    ),
    rawCoupon: appliedCoupon,
  };
}
