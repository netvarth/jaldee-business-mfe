export function createInvoiceTemplatePayload(
  templateName: string,
  {
    locationId,
    categoryOptions,
    categoryId,
    invoiceLabel,
    notesForProvider,
    notesForCustomer,
    termsConditions,
    items,
    includeDetailList,
  }: any,
) {
  const selectedCategoryOption = Array.isArray(categoryOptions)
    ? categoryOptions.find((option: any) => option.value === categoryId)
    : null;
  const normalizedCategoryId = Number(selectedCategoryOption?.categoryId ?? categoryId);
  const detailList = Array.isArray(items)
    ? items.map((item: any) => ({
        ...(item.itemUid ? { itemUid: String(item.itemUid) } : {}),
        itemType: item.itemType === "FINANCE_ITEM" ? "FINANCE_ITEM" : "ADHOC_ITEM",
        ...(item.itemType === "FINANCE_ITEM"
          ? { itemName: String(item.name || "").trim() }
          : { itemName: String(item.name || "").trim() }),
        quantity: Number(item.qty || 1),
        price: Number(item.price || 0),
      }))
    : [];

  return {
    sourceService: "FINANCE_SERVICE",
    feature: "FINANCE",
    featureModule: "FINANCE_INVOICE",
    templateName: templateName.trim(),
    allowToUseOtherUsers: true,
    ...(String(locationId ?? "").trim() ? { locationUid: String(locationId).trim() } : {}),
    ...(Number.isFinite(normalizedCategoryId) && normalizedCategoryId > 0
      ? { categoryId: normalizedCategoryId }
      : {}),
    ...(String(invoiceLabel ?? "").trim() ? { invoiceLabel: String(invoiceLabel).trim() } : {}),
    ...(String(notesForProvider ?? "").trim() ? { notesForProvider: String(notesForProvider).trim() } : {}),
    ...(String(notesForCustomer ?? "").trim() ? { notesForCustomer: String(notesForCustomer).trim() } : {}),
    ...(String(termsConditions ?? "").trim() ? { termsConditions: String(termsConditions).trim() } : {}),
    ...(includeDetailList && detailList.length ? { detailList } : {}),
  };
}
