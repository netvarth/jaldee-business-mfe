export function createInvoiceTemplatePayload(
  templateName: string,
  {
    categoryOptions,
    categoryId,
    invoiceLabel,
    notesForCustomer,
    notesForProvider,
    termsConditions,
    items,
  }: any,
) {
  const selectedCategoryOption = Array.isArray(categoryOptions)
    ? categoryOptions.find((option: any) => option.value === categoryId)
    : null;
  const normalizedCategoryId = Number(selectedCategoryOption?.categoryId ?? categoryId);

  return {
    templateName: templateName.trim(),
    ...(invoiceLabel.trim() ? { invoiceLabel: invoiceLabel.trim() } : {}),
    ...(Number.isFinite(normalizedCategoryId) && normalizedCategoryId > 0
      ? { categoryId: normalizedCategoryId }
      : {}),
    ...(notesForProvider.trim() ? { notesForProvider: notesForProvider.trim() } : {}),
    ...(notesForCustomer.trim() ? { notesForCustomer: notesForCustomer.trim() } : {}),
    ...(termsConditions.trim() ? { termsAndConditions: termsConditions.trim() } : {}),
    details: items.map((item: any) => {
      if (item.itemType === "ADHOC_ITEM") {
        return {
          itemType: "ADHOC_ITEM",
          itemName: item.name,
          quantity: Number(item.qty || 1),
          price: Number(item.price || 0),
        };
      }

      return {
        itemType: item.itemType,
        ...(Number(item.itemUid) > 0 ? { itemId: Number(item.itemUid) } : {}),
        quantity: Number(item.qty || 1),
        price: Number(item.price || 0),
      };
    }),
  };
}
