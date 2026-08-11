import { financeApi } from "../../lib/financeApi";
import {
  mapCouponOptions,
  mapDiscountOptions,
  readArrayPayload,
  type InvoiceTemplateSummary,
} from "./invoiceFormModel";

function uniqueBy(items: any[], readKey: (item: any) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = readKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchDiscountOptions() {
  const response = await financeApi.discounts.list<any>({
    page: 0,
    size: 1000,
    sort: [{ field: "createdAt", direction: "DESC" }],
    view: "SUMMARY",
  });
  const discounts = uniqueBy(readArrayPayload(response?.data), (item) =>
    String(item?.uid ?? item?.id ?? item?.discountId ?? item?.discountUid ?? item?.code ?? ""),
  );
  return mapDiscountOptions(discounts);
}

export async function fetchCouponOptions() {
  const response = await financeApi.coupons.list<any>({
    page: 0,
    size: 1000,
    sort: [{ field: "createdAt", direction: "DESC" }],
  });
  const coupons = uniqueBy(readArrayPayload(response?.data), (item) =>
    String(item?.uid ?? item?.couponId ?? item?.id ?? item?.code ?? ""),
  );
  return mapCouponOptions(coupons);
}

export async function fetchInvoiceTemplates(): Promise<InvoiceTemplateSummary[]> {
  const response = await financeApi.invoices.templateList<any>({
    page: 0,
    size: 100,
  });
  return readArrayPayload(response?.data).map((item: any, index: number) => ({
    uid: String(item.uid ?? item.templateUid ?? `template-${index}`),
    templateName: String(item.templateName ?? item.name ?? item.uid ?? `Template ${index + 1}`),
    description: String(item.description ?? ""),
    status: String(item.status ?? "Enabled"),
    detailList: Array.isArray(item.detailList) ? item.detailList : [],
  }));
}
