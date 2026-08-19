export function createInvoiceTemplatePayload(
  templateName: string,
  {
    locationId,
    categoryOptions,
    categoryId,
    statusOptions,
    statusId,
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
  const selectedStatusOption = Array.isArray(statusOptions)
    ? statusOptions.find((option: any) => option.value === statusId)
    : null;
  const normalizedCategoryUid = String(
    selectedCategoryOption?.uid ??
    selectedCategoryOption?.categoryUid ??
    selectedCategoryOption?.value ??
    categoryId ??
    ""
  ).trim();
  const normalizedStatusUid = String(
    selectedStatusOption?.uid ??
    selectedStatusOption?.statusUid ??
    selectedStatusOption?.value ??
    statusId ??
    ""
  ).trim();
  const detailList = Array.isArray(items)
    ? items
      .filter((item: any) => String(item?.name ?? "").trim())
      .map((item: any) => ({
        ...(item.itemUid ? { itemUid: String(item.itemUid) } : {}),
        itemType: item.itemType === "FINANCE_ITEM" ? "FINANCE_ITEM" : "ADHOC_ITEM",
        itemName: String(item.name || "").trim(),
        quantity: Number(item.qty || 1),
        price: Number(item.price || 0),
      }))
    : [];

  return {
    sourceService: "FINANCE_SERVICE",
    feature: "FINANCE",
    featureModule: "FINANCE_INVOICE",
    templateName: templateName.trim(),
    allowToUseOtherUsers: false,
    ...(String(locationId ?? "").trim() ? { locationUid: String(locationId).trim() } : {}),
    ...(normalizedCategoryUid ? { categoryUid: normalizedCategoryUid } : {}),
    ...(normalizedStatusUid ? { statusUid: normalizedStatusUid } : {}),
    ...(String(invoiceLabel ?? "").trim() ? { invoiceLabel: String(invoiceLabel).trim() } : {}),
    ...(String(notesForProvider ?? "").trim() ? { notesForProvider: String(notesForProvider).trim() } : {}),
    ...(String(notesForCustomer ?? "").trim() ? { notesForCustomer: String(notesForCustomer).trim() } : {}),
    ...(String(termsConditions ?? "").trim() ? { termsConditions: String(termsConditions).trim() } : {}),
    ...(includeDetailList !== false ? { detailList } : {}),
  };
}
