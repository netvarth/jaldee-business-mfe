import type { FinanceCatalogOption, InvoiceItem } from "./invoiceFormModel";

type ItemBuilderInput = {
  editingItemId: string | null;
  catalogValue: string;
  name: string;
  quantity: number;
  price: number;
  date: string;
  catalogOptions: FinanceCatalogOption[];
};

export function saveInvoiceItem(current: InvoiceItem[], input: ItemBuilderInput) {
  const normalizedName = input.name.trim();
  if (!normalizedName) return current;
  const selected = input.catalogOptions.find((entry) => entry.value === input.catalogValue);

  if (input.editingItemId) {
    return current.map((item) => {
      if (item.id !== input.editingItemId) return item;
      const discountAmount = item.discountAmount ?? 0;
      const afterDiscount = Math.max(input.price * input.quantity - discountAmount, 0);
      return {
        ...item,
        itemUid: selected?.itemUid ?? item.itemUid,
        itemType: selected?.itemType ?? item.itemType,
        name: normalizedName,
        qty: input.quantity,
        price: input.price,
        date: input.date,
        discountApplicable: selected?.discountApplicable ?? item.discountApplicable,
        rateEditable: selected?.rateEditable ?? item.rateEditable,
        afterDiscount,
        totalAmount: afterDiscount + (item.taxAmount ?? 0),
      };
    });
  }

  const matchingIndex = current.findIndex((item) => {
    const sameCatalog =
      Boolean(item.itemUid && selected?.itemUid) && item.itemUid === selected?.itemUid;
    const sameAdhoc = !item.itemUid && !selected?.itemUid && item.name.trim() === normalizedName;
    return (sameCatalog || sameAdhoc) && item.price === input.price && item.date === input.date;
  });
  if (matchingIndex >= 0) {
    return current.map((item, index) => {
      if (index !== matchingIndex) return item;
      const quantity = item.qty + input.quantity;
      const afterDiscount = Math.max(
        input.price * quantity - (item.discountAmount ?? 0),
        0,
      );
      return {
        ...item,
        qty: quantity,
        afterDiscount,
        totalAmount: afterDiscount + (item.taxAmount ?? 0),
      };
    });
  }

  const total = input.price * input.quantity;
  return [
    ...current,
    {
      id: `item-${Date.now()}`,
      itemUid: selected?.itemUid,
      itemType: selected?.itemType || "ADHOC_ITEM",
      name: normalizedName,
      qty: input.quantity,
      price: input.price,
      date: input.date,
      afterDiscount: total,
      totalAmount: total,
      discountApplicable: selected?.discountApplicable,
      rateEditable: selected?.rateEditable,
    },
  ];
}
