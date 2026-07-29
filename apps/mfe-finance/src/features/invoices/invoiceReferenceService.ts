import { financeApi } from "../../lib/financeApi";

export async function createInvoiceCategory(name: string) {
  const label = name.trim();
  const response = await financeApi.categories.create<any>({
    name: label,
    categoryType: "Invoice",
    status: "Enabled",
  });
  const value = String(response.data?.categoryId ?? response.data?.uid ?? response.data?.id ?? "");
  return value ? { value, label } : null;
}

export async function fetchNextInvoiceNumber(request: any) {
  const response = await financeApi.invoices.nextInvoiceId<any>({
    tenantUid: request.tenantUid || undefined,
    locationUid: request.locationUid || undefined,
    storeUid: request.storeUid || undefined,
    sequenceDetailUid: request.sequenceDetailUid,
  });
  const value =
    response.data?.invoiceNum ||
    response.data?.invoiceId ||
    response.data?.nextInvoiceNum ||
    response.data;
  return value == null ? "" : String(value);
}
