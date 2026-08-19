import { financeApi } from "../../lib/financeApi";
import { todayIsoDate, type InvoiceItem } from "./invoiceFormModel";

export async function fetchInvoiceTemplate(templateUid: string) {
  const response = await financeApi.invoices.templateById<any>(templateUid);
  return response.data ?? {};
}

export function mapTemplateItems(template: any): InvoiceItem[] {
  const detailList = Array.isArray(template.detailList)
    ? template.detailList
    : Array.isArray(template.details)
      ? template.details
      : [];

  return detailList.map((detail: any, index: number) => ({
    id: String(detail.uid ?? detail.detailUid ?? `template-item-${Date.now()}-${index}`),
    detailUid: detail.uid ? String(detail.uid) : detail.detailUid ? String(detail.detailUid) : undefined,
    itemUid: detail.itemUid ? String(detail.itemUid) : detail.itemId ? String(detail.itemId) : undefined,
    itemType:
      detail.itemType === "FINANCE_ITEM"
        ? "FINANCE_ITEM"
        : detail.itemType === "SERVICE_ITEM"
          ? "FINANCE_ITEM"
        : detail.itemType === "SERVICE"
          ? "SERVICE"
          : "ADHOC_ITEM",
    name: String(detail.itemName ?? detail.name ?? "Template Item"),
    qty: Number(detail.quantity ?? 1),
    price: Number(detail.price ?? detail.netRate ?? 0),
    date:
      typeof detail.processedDate === "string" && detail.processedDate
        ? detail.processedDate.slice(0, 10)
        : todayIsoDate(),
    afterDiscount: Number(detail.taxableAmount ?? detail.netTotal ?? 0),
    taxAmount: Number(detail.taxTotal ?? 0),
    totalAmount: Number(detail.netTotal ?? 0),
    discountApplicable: true,
  }));
}
