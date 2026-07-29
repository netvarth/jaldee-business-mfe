import { mapInvoiceItem, todayIsoDate } from "./invoiceFormModel";

export function mapInvoiceDetail(
  invoiceData: any,
  catalogItems: any[],
  defaultLocationId: string,
  defaultLocationName: string,
) {
  const locationId = String(invoiceData.locationUid || invoiceData.locationId || defaultLocationId);
  const locationName = String(
    invoiceData.locationName ||
      invoiceData.locationDisplayName ||
      invoiceData.locationLabel ||
      defaultLocationName ||
      "Selected Location",
  );
  const items = Array.isArray(invoiceData.detailList)
    ? invoiceData.detailList.map((item: any, index: number) => {
        const mapped = mapInvoiceItem(item, index);
        const catalogItem = mapped.itemUid
          ? catalogItems.find(
              (candidate: any) =>
                String(candidate.uid ?? candidate.id ?? candidate.itemUid ?? candidate.value) === mapped.itemUid,
            )
          : undefined;
        mapped.discountApplicable =
          catalogItem?.discountApplicable !== undefined
            ? Boolean(catalogItem.discountApplicable)
            : mapped.discountApplicable ?? true;
        return mapped;
      })
    : [];

  return {
    categoryId: String(invoiceData.categoryId || ""),
    statusId: String(invoiceData.statusId || ""),
    locationId,
    locationName,
    invoiceNum: String(invoiceData.invoiceNum || invoiceData.invoiceId || ""),
    referenceNo: String(invoiceData.referenceNo || ""),
    invoiceDate: invoiceData.invoiceDate
      ? new Date(invoiceData.invoiceDate).toISOString().slice(0, 10)
      : todayIsoDate(),
    dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString().slice(0, 10) : "",
    invoiceLabel: String(invoiceData.invoiceLabel || ""),
    consumerUid: String(invoiceData.consumerUid || invoiceData.consumerId || ""),
    consumerName: String(invoiceData.consumerName || invoiceData.customerName || ""),
    consumerPhone: String(invoiceData.consumerPhone || ""),
    billedToAddress: String(invoiceData.billedToAddress || invoiceData.consumerGstAddress || ""),
    notesForProvider: String(invoiceData.notesForProvider || ""),
    notesForCustomer: String(invoiceData.notesForCustomer || invoiceData.description || ""),
    termsConditions: String(invoiceData.termsConditions || ""),
    items,
  };
}
