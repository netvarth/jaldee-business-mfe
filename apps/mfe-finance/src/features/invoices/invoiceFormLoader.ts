import { financeApi } from "../../lib/financeApi";
import {
  formatCurrency,
  readArrayPayload,
  readString,
  type ConsumerOption,
  type FinanceCatalogOption,
} from "./invoiceFormModel";

export async function loadInvoiceFormOptions(
  defaultLocationId: string,
  defaultLocationName: string,
) {
  const [customersResult, categoriesResult, statusesResult, itemsResult] =
    await Promise.allSettled([
      financeApi.customers.search<any>({ page: 0, size: 200, view: "SUMMARY" }),
      financeApi.categories.search<any>({
        page: 0,
        size: 20,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: { field: "categoryType", operator: "IN", values: ["Invoice"] },
        view: "SUMMARY",
      }),
      financeApi.statuses.search<any>({
        page: 0,
        size: 20,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: { field: "categoryType", operator: "IN", values: ["Invoice"] },
        view: "SUMMARY",
      }),
      financeApi.items.list<any[]>(),
    ]);

  const data = (result: PromiseSettledResult<any>) =>
    result.status === "fulfilled" ? result.value?.data : undefined;
  const customers = readArrayPayload(data(customersResult));
  const categories = readArrayPayload(data(categoriesResult));
  const statuses = readArrayPayload(data(statusesResult));
  const financeItems = readArrayPayload(data(itemsResult));

  const categoryOptions = categories
    .map((item: any) => {
      const numericCategoryId = Number(item.categoryId ?? item.id ?? 0);
      const fallbackValue = String(item.uid ?? item.encId ?? item.id ?? item.categoryId ?? "");
      return {
        value:
          Number.isFinite(numericCategoryId) && numericCategoryId > 0
            ? String(numericCategoryId)
            : fallbackValue,
        label: String(item.name ?? item.categoryName ?? "Category"),
        categoryId:
          Number.isFinite(numericCategoryId) && numericCategoryId > 0
            ? numericCategoryId
            : undefined,
      };
    })
    .filter((item) => item.value && item.label.trim());
  const statusOptions = statuses.map((item: any) => ({
    value: String(item.id ?? item.uid ?? item.statusId),
    label: String(item.name ?? item.statusName ?? "Status"),
  }));
  const locationOptions = defaultLocationId
    ? [{ value: defaultLocationId, label: defaultLocationName || "Selected Location" }]
    : [];
  const consumerOptions = customers
    .map((item: any, index: number): ConsumerOption | null => {
      const uid = String(item.uid ?? item.consumerUid ?? item.id ?? item.userId ?? `consumer-${index}`);
      const label = readString(
        item.name,
        item.consumerName,
        [item.firstName, item.lastName].filter(Boolean).join(" "),
        item.displayName,
      );
      if (!uid || !label) return null;
      const phone = readString(
        item.consumerPhone, item.mobile, item.mobileNo, item.phoneNo,
        item.phone, item.primaryPhone,
      );
      const email = readString(item.consumerEmail, item.email, item.primaryEmail);
      return {
        value: uid,
        label,
        consumerUid: uid,
        consumerType: readString(item.consumerType, item.type, item.consumerSnapshot?.consumerType) || "NONE",
        phone,
        email,
        address: readString(
          item.billedToAddress, item.consumerGstAddress, item.address,
          item.addressLine1, item.location,
        ),
        description: [phone, email].filter(Boolean).join(" | ") || undefined,
      };
    })
    .filter(Boolean) as ConsumerOption[];
  const catalogOptions = financeItems
    .map((item: any, index: number): FinanceCatalogOption | null => {
      const label = String(item.displayName || item.name || item.itemName || "").trim();
      if (!label) return null;
      const price = Number(item.amount ?? item.price ?? 0);
      const uid = String(item.uid ?? item.id ?? item.itemId ?? label ?? index);
      const code = String(item.code || "").trim();
      return {
        value: uid,
        label,
        description: `Finance Item${code ? ` | ${code}` : ""}${price > 0 ? ` | ${formatCurrency(price)}` : ""}`,
        price,
        itemUid: uid,
        itemType: "FINANCE_ITEM",
        discountApplicable: item.discountApplicable !== undefined
          ? Boolean(item.discountApplicable)
          : true,
      };
    })
    .filter(Boolean) as FinanceCatalogOption[];

  return { categoryOptions, statusOptions, locationOptions, consumerOptions, catalogOptions };
}
