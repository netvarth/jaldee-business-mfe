import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import {
  Button,
  Combobox,
  Dialog,
  DialogFooter,
  Icon,
  Input,
  PageHeader,
  Popover,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import type { ComboboxOption } from "@jaldee/design-system";
import { financeApi } from "./lib/financeApi";

interface InvoiceItem {
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
  discountValue?: number;
  privateNote?: string;
  displayNote?: string;
  discountAmount?: number;
  afterDiscount?: number;
  taxAmount?: number;
  totalAmount?: number;
}

interface FinanceCatalogOption extends ComboboxOption {
  itemUid?: string;
  itemType?: "FINANCE_ITEM";
  price?: number;
}

interface LocationOption {
  value: string;
  label: string;
}

interface DiscountOption {
  value: string;
  label: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
}

interface DiscountDetail {
  uid: string;
  name: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
}

interface ConsumerOption extends ComboboxOption {
  consumerUid: string;
  phone?: string;
  email?: string;
  address?: string;
}

function readArrayPayload(value: any): any[] {
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

function mapDiscountOptions(items: any[]): DiscountOption[] {
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
    }))
    .filter((item: DiscountOption) => item.value);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function mapInvoiceItem(item: any, index: number): InvoiceItem {
  const appliedDiscount =
    item.discount ??
    item.appliedDiscount ??
    item.discountDetail ??
    item.discountDto ??
    item.discounts?.[0] ??
    item.discountList?.[0];
  const qty = Number(item.quantity || 1);
  const price = Number(item.price || 0);
  const discountAmount = Number(item.discountAmount || appliedDiscount?.discountAmount || 0);
  const afterDiscount = Number(item.netTotalAfterDiscount || item.afterDiscount || price * qty - discountAmount);
  const taxAmount = Number(item.taxAmount || item.totalTax || 0);
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
    discountValue: Number(appliedDiscount?.discountValue ?? item.discountValue ?? 0),
    privateNote: readString(appliedDiscount?.privateNote, item.privateNote) || undefined,
    displayNote: readString(appliedDiscount?.displayNote, item.displayNote) || undefined,
    discountAmount,
    afterDiscount,
    taxAmount,
    totalAmount: Number(item.total || afterDiscount + taxAmount),
  };
}

export default function FinanceInvoiceForm() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const navigateToInvoiceList = () => {
    navigate("..", { relative: "path", replace: true });
  };

  const defaultLocationId = String(mfeProps.location?.id ?? "");
  const defaultLocationName = String(mfeProps.location?.name || mfeProps.location?.place || "");

  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [dueDate, setDueDate] = useState("");
  const [invoiceLabel, setInvoiceLabel] = useState("");
  const [consumerUid, setConsumerUid] = useState("");
  const [consumerName, setConsumerName] = useState("");
  const [consumerPhone, setConsumerPhone] = useState("");
  const [billedToAddress, setBilledToAddress] = useState("");
  const [notesForProvider, setNotesForProvider] = useState("");
  const [notesForCustomer, setNotesForCustomer] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [amount, setAmount] = useState("0");

  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [consumerOptions, setConsumerOptions] = useState<ConsumerOption[]>([]);
  const [financeCatalogOptions, setFinanceCatalogOptions] = useState<FinanceCatalogOption[]>([]);
  const [discountOptions, setDiscountOptions] = useState<DiscountOption[]>([]);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItemCatalogValue, setNewItemCatalogValue] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemDate, setNewItemDate] = useState(todayIsoDate());

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [openItemActionId, setOpenItemActionId] = useState<string | null>(null);
  const [discountDialogItem, setDiscountDialogItem] = useState<InvoiceItem | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [selectedDiscountDetail, setSelectedDiscountDetail] = useState<DiscountDetail | null>(null);
  const [discountAmountInput, setDiscountAmountInput] = useState("");
  const [discountPrivateNote, setDiscountPrivateNote] = useState("");
  const [discountDisplayNote, setDiscountDisplayNote] = useState("");
  const [discountSubmitting, setDiscountSubmitting] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountOptionsLoading, setDiscountOptionsLoading] = useState(false);

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const preselectedConsumerUid = String(searchParams.get("consumerUid") || "");

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.totalAmount ?? item.price * item.qty), 0);
    setAmount(String(total));
  }, [items]);

  const selectedCatalogOption = useMemo(
    () => financeCatalogOptions.find((option) => option.value === newItemCatalogValue),
    [financeCatalogOptions, newItemCatalogValue]
  );
  const selectedConsumerOption = useMemo(
    () => consumerOptions.find((option) => option.value === consumerUid),
    [consumerOptions, consumerUid]
  );
  const selectedDiscountOption = useMemo(
    () => discountOptions.find((option) => option.value === selectedDiscountId),
    [discountOptions, selectedDiscountId]
  );

  const nextInvoiceRequest = useMemo(() => {
    const locationRecord = (mfeProps.location ?? {}) as Record<string, unknown>;
    const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;

    const tenantUid = readString(accountRecord.tenantUid, accountRecord.uid, accountRecord.id);
    const resolvedLocationUid = readString(
      locationRecord.uid,
      locationRecord.locationUid,
      locationRecord.id,
      locationRecord.locationId,
      locationId
    );
    const storeUid = readString(
      locationRecord.storeUid,
      locationRecord.storeId,
      accountRecord.storeUid,
      accountRecord.storeId
    );
    const sequenceDetailUid = readString(
      locationRecord.sequenceDetailUid,
      locationRecord.invoiceSequenceDetailUid,
      locationRecord.financeSequenceDetailUid,
      accountRecord.sequenceDetailUid,
      accountRecord.invoiceSequenceDetailUid,
      accountRecord.financeSequenceDetailUid
    );

    return {
      tenantUid,
      locationUid: resolvedLocationUid,
      storeUid,
      sequenceDetailUid,
    };
  }, [locationId, mfeProps.account, mfeProps.location]);

  function resetItemBuilder() {
    setNewItemCatalogValue("");
    setNewItemName("");
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemDate(todayIsoDate());
  }

  function resetDiscountDialog() {
    setDiscountDialogItem(null);
    setSelectedDiscountId("");
    setSelectedDiscountDetail(null);
    setDiscountAmountInput("");
    setDiscountPrivateNote("");
    setDiscountDisplayNote("");
    setDiscountSubmitting(false);
    setDiscountLoading(false);
  }

  async function loadDiscountOptions() {
    setDiscountOptionsLoading(true);
    try {
      const [tenantDiscountsResponse, billDiscountsResponse] = await Promise.allSettled([
        financeApi.discounts.list<any>({
          page: 0,
          size: 1000,
          sort: [
            {
              field: "createdAt",
              direction: "DESC",
            },
          ],
          view: "SUMMARY",
        }),
        financeApi.discounts.listBill<any>(),
      ]);

      const tenantDiscounts = tenantDiscountsResponse.status === "fulfilled"
        ? readArrayPayload(tenantDiscountsResponse.value?.data)
        : [];
      const billDiscounts = billDiscountsResponse.status === "fulfilled"
        ? readArrayPayload(billDiscountsResponse.value?.data)
        : [];

      const merged = [...tenantDiscounts, ...billDiscounts];
      const nextDiscountOptions = mapDiscountOptions(
        merged.filter((item, index, array) => {
          const value = String(
            item?.uid ??
            item?.id ??
            item?.discountId ??
            item?.discountUid ??
            item?.code ??
            ""
          );
          if (!value) {
            return false;
          }
          return array.findIndex((entry) => String(
            entry?.uid ??
            entry?.id ??
            entry?.discountId ??
            entry?.discountUid ??
            entry?.code ??
            ""
          ) === value) === index;
        })
      );

      if (nextDiscountOptions.length === 0) {
        console.warn("[mfe-finance] No discount options returned from tenant or bill discount endpoints");
      }

      setDiscountOptions(nextDiscountOptions);
    } catch (error) {
      console.error("[mfe-finance] Failed to load discount options", error);
      setDiscountOptions([]);
    } finally {
      setDiscountOptionsLoading(false);
    }
  }

  function handleDiscountChange(value: string) {
    setSelectedDiscountId(value);
    setSelectedDiscountDetail(null);
    setDiscountAmountInput("");
    setFormError("");
  }

  async function openDiscountDialog(item: InvoiceItem) {
    setOpenItemActionId(null);
    setDiscountDialogItem(item);
    setSelectedDiscountId("");
    setSelectedDiscountDetail(null);
    setDiscountAmountInput("");
    setDiscountPrivateNote("");
    setDiscountDisplayNote("");
    setFormError("");
    await loadDiscountOptions();
  }

  useEffect(() => {
    let active = true;

    async function loadSelectedDiscount() {
      if (!selectedDiscountId || !discountDialogItem) {
        return;
      }

      const fallbackOption = discountOptions.find((option) => option.value === selectedDiscountId);

      setDiscountLoading(true);
      try {
        const response = await financeApi.discounts.detail<any>(selectedDiscountId);
        const data = response.data ?? {};
        if (!active) {
          return;
        }
        const detail: DiscountDetail = {
          uid: String(data.uid ?? data.id ?? selectedDiscountId),
          name: String(data.name ?? fallbackOption?.label ?? "Discount"),
          discountType: String(data.discountType ?? data.discType ?? fallbackOption?.discountType ?? "PREDEFINED"),
          calculationType: String(data.calculationType ?? fallbackOption?.calculationType ?? "FIXED_AMOUNT"),
          discountValue: Number(data.discountValue ?? fallbackOption?.discountValue ?? 0),
        };
        setSelectedDiscountDetail(detail);
        if (detail.discountType.toUpperCase() !== "ONDEMAND") {
          setDiscountAmountInput(String(detail.discountValue));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("[mfe-finance] Failed to load discount detail", error);
        setFormError(error instanceof Error ? error.message : "Could not load discount details.");
      } finally {
        if (active) {
          setDiscountLoading(false);
        }
      }
    }

    void loadSelectedDiscount();
    return () => {
      active = false;
    };
  }, [selectedDiscountId, discountDialogItem, discountOptions]);

  async function loadInvoiceDetail(invoiceId: string) {
    const invoiceRes = await financeApi.invoices.detailGeneral<any>(invoiceId);
    const invoiceData = invoiceRes.data;
    if (!invoiceData) {
      return;
    }

    setCategoryId(String(invoiceData.categoryId || ""));
    setStatusId(String(invoiceData.statusId || ""));
    setLocationId(String(invoiceData.locationUid || invoiceData.locationId || defaultLocationId));
    setInvoiceNum(String(invoiceData.invoiceNum || invoiceData.invoiceId || ""));
    setReferenceNo(String(invoiceData.referenceNo || ""));
    setInvoiceDate(invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toISOString().slice(0, 10) : todayIsoDate());
    setDueDate(invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString().slice(0, 10) : "");
    setInvoiceLabel(String(invoiceData.invoiceLabel || ""));
    setConsumerUid(String(invoiceData.consumerUid || invoiceData.consumerId || ""));
    setConsumerName(String(invoiceData.consumerName || invoiceData.customerName || ""));
    setConsumerPhone(String(invoiceData.consumerPhone || ""));
    setBilledToAddress(String(invoiceData.billedToAddress || invoiceData.consumerGstAddress || ""));
    setNotesForProvider(String(invoiceData.notesForProvider || ""));
    setNotesForCustomer(String(invoiceData.notesForCustomer || invoiceData.description || ""));
    setTermsConditions(String(invoiceData.termsConditions || ""));

    if (Array.isArray(invoiceData.detailList)) {
      setItems(invoiceData.detailList.map(mapInvoiceItem));
    } else {
      setItems([]);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        const [customersResult, categoriesResult, statusesResult, itemsResult, locationsResult] = await Promise.allSettled([
          financeApi.customers.search<any>({
            page: 0,
            size: 200,
            view: "SUMMARY",
          }),
          financeApi.categories.search<any>({
            page: 0,
            size: 20,
            sort: [
              {
                field: "createdAt",
                direction: "DESC",
              },
            ],
            filters: {
              field: "categoryType",
              operator: "IN",
              values: ["Invoice"],
            },
            view: "SUMMARY",
          }),
          financeApi.statuses.search<any>({
            page: 0,
            size: 20,
            sort: [
              {
                field: "createdAt",
                direction: "DESC",
              },
            ],
            filters: {
              field: "categoryType",
              operator: "IN",
              values: ["Invoice"],
            },
            view: "SUMMARY",
          }),
          financeApi.items.list<any[]>(),
          financeApi.locations.provider<any[]>(),
        ]);

        if (!active) return;

        const customersResponse = customersResult.status === "fulfilled" ? customersResult.value : null;
        const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
        const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
        const itemsResponse = itemsResult.status === "fulfilled" ? itemsResult.value : null;
        const locationsResponse = locationsResult.status === "fulfilled" ? locationsResult.value : null;

        const customers = readArrayPayload(customersResponse?.data);
        const categories = Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : Array.isArray(categoriesResponse?.data)
            ? categoriesResponse.data
            : Array.isArray(categoriesResponse?.data?.data?.content)
              ? categoriesResponse.data.data.content
              : Array.isArray(categoriesResponse?.data?.data)
                ? categoriesResponse.data.data
                : [];
        const statuses = Array.isArray(statusesResponse?.data?.content)
          ? statusesResponse.data.content
          : Array.isArray(statusesResponse?.data)
            ? statusesResponse.data
            : [];
        const financeItems = Array.isArray(itemsResponse?.data?.content)
          ? itemsResponse.data.content
          : Array.isArray(itemsResponse?.data)
            ? itemsResponse.data
            : [];
        const locations = Array.isArray(locationsResponse?.data) ? locationsResponse.data : [];

        const nextCategoryOptions = categories.map((item: any) => ({
          value: String(item.categoryId ?? item.uid ?? item.id),
          label: String(item.name ?? item.categoryName ?? "Category"),
        }));
        const nextStatusOptions = statuses.map((item: any) => ({
          value: String(item.id ?? item.uid ?? item.statusId),
          label: String(item.name ?? item.statusName ?? "Status"),
        }));
        const nextLocationOptions = locations.map((location: any) => ({
          value: String(location.id ?? location.uid ?? location.locationId),
          label: String(location.place ?? location.name ?? location.locationName ?? "Location"),
        }));
        const nextConsumerOptions: ConsumerOption[] = customers
          .map((item: any, index: number) => {
            const uid = String(item.uid ?? item.consumerUid ?? item.id ?? item.userId ?? `consumer-${index}`);
            const label = readString(
              item.name,
              item.consumerName,
              [item.firstName, item.lastName].filter(Boolean).join(" "),
              item.displayName
            );
            if (!uid || !label) {
              return null;
            }
            const phone = readString(
              item.consumerPhone,
              item.mobile,
              item.mobileNo,
              item.phoneNo,
              item.phone,
              item.primaryPhone
            );
            const email = readString(item.consumerEmail, item.email, item.primaryEmail);
            const address = readString(
              item.billedToAddress,
              item.consumerGstAddress,
              item.address,
              item.addressLine1,
              item.location
            );
            return {
              value: uid,
              label,
              consumerUid: uid,
              phone,
              email,
              address,
              description: [phone, email].filter(Boolean).join(" | ") || undefined,
            };
          })
          .filter(Boolean) as ConsumerOption[];

        setCategoryOptions(nextCategoryOptions);
        setStatusOptions(nextStatusOptions);
        setConsumerOptions(nextConsumerOptions);
        setLocationOptions(
          nextLocationOptions.length > 0
            ? nextLocationOptions
            : defaultLocationId
              ? [{ value: defaultLocationId, label: defaultLocationName || "Selected Location" }]
              : []
        );

        setCategoryId((current) => current || nextCategoryOptions[0]?.value || "");
        setStatusId((current) => current || nextStatusOptions[0]?.value || "");
        setLocationId((current) => current || nextLocationOptions[0]?.value || defaultLocationId);
        setConsumerUid((current) => current || preselectedConsumerUid || "");

        const financeItemOptions: FinanceCatalogOption[] = financeItems
          .map((item: any, index: number) => {
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
            };
          })
          .filter(Boolean) as FinanceCatalogOption[];

        setFinanceCatalogOptions(financeItemOptions);
        await loadDiscountOptions();

        if (isEditing && id) {
          await loadInvoiceDetail(id);
        }
      } catch (error) {
        if (!active) return;
        console.error("[mfe-finance] Failed to load invoice form data", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFormData();
    return () => {
      active = false;
    };
  }, [defaultLocationId, defaultLocationName, id, isEditing, preselectedConsumerUid]);

  useEffect(() => {
    if (!selectedConsumerOption) {
      return;
    }

    setConsumerName(selectedConsumerOption.label);
    setConsumerPhone((current) => current || selectedConsumerOption.phone || "");
    setBilledToAddress((current) => current || selectedConsumerOption.address || "");
  }, [selectedConsumerOption]);

  useEffect(() => {
    let active = true;

    async function loadNextInvoiceNumber() {
      if (isEditing || !locationId || invoiceNum) {
        return;
      }

      try {
        const response = await financeApi.invoices.nextInvoiceId<any>({
          tenantUid: nextInvoiceRequest.tenantUid || undefined,
          locationUid: nextInvoiceRequest.locationUid || undefined,
          storeUid: nextInvoiceRequest.storeUid || undefined,
          sequenceDetailUid: nextInvoiceRequest.sequenceDetailUid,
        });
        if (!active) return;
        const nextInvoiceNumber = response.data?.invoiceNum || response.data?.invoiceId || response.data?.nextInvoiceNum || response.data;
        if (nextInvoiceNumber != null) {
          setInvoiceNum(String(nextInvoiceNumber));
        }
      } catch (error) {
        if (!active) return;
        console.error("[mfe-finance] Failed to fetch invoice number from /v1/api/tenant/invoice/nextInvoiceNum", error);
      }
    }

    loadNextInvoiceNumber();
    return () => {
      active = false;
    };
  }, [invoiceNum, isEditing, locationId, nextInvoiceRequest]);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await financeApi.categories.create<any>({
        name: newCategoryName.trim(),
        categoryType: "Invoice",
        status: "Enabled",
      });
      const createdId = String(response.data?.categoryId ?? response.data?.uid ?? response.data?.id ?? "");
      if (createdId) {
        const createdOption = { value: createdId, label: newCategoryName.trim() };
        setCategoryOptions((current) => [...current, createdOption]);
        setCategoryId(createdId);
      }
      setNewCategoryName("");
      setShowCategoryDialog(false);
    } catch (error) {
      console.error("[mfe-finance] Failed to create category", error);
      setFormError(error instanceof Error ? error.message : "Could not create category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleApplyItemDiscount() {
    if (!id || !discountDialogItem?.detailUid || !selectedDiscountId) {
      return;
    }

    const activeDiscount = selectedDiscountDetail ?? (
      selectedDiscountOption
        ? {
            uid: selectedDiscountOption.value,
            name: selectedDiscountOption.label,
            discountType: selectedDiscountOption.discountType,
            calculationType: selectedDiscountOption.calculationType,
            discountValue: selectedDiscountOption.discountValue,
          }
        : null
    );

    if (activeDiscount?.discountType?.toUpperCase() === "ONDEMAND" && !discountAmountInput.trim()) {
      setFormError("Discount amount is required for on-demand discount.");
      return;
    }

    setFormError("");
    setDiscountSubmitting(true);
    try {
      await financeApi.invoices.applyDiscountInDetail(discountDialogItem.detailUid, {
        id: selectedDiscountId,
        discountValue: discountAmountInput.trim() ? Number(discountAmountInput) : activeDiscount?.discountValue ?? "",
        privateNote: discountPrivateNote.trim() || "",
        displayNote: discountDisplayNote.trim() || "",
      });
      await loadInvoiceDetail(id);
      resetDiscountDialog();
    } catch (error) {
      console.error("[mfe-finance] Failed to apply item-level discount", error);
      setFormError(error instanceof Error ? error.message : "Could not apply item-level discount.");
      setDiscountSubmitting(false);
    }
  }

  async function handleRemoveItemDiscount(item: InvoiceItem) {
    if (!id || !item.detailUid || !item.discountId) {
      return;
    }

    setFormError("");
    try {
      await financeApi.invoices.removeDiscountFromDetail(item.detailUid, {
        id: item.discountId,
        discountValue: item.discountType?.toUpperCase() === "ONDEMAND" ? item.discountValue ?? "" : "",
        privateNote: item.privateNote ?? "",
        displayNote: item.displayNote ?? "",
      });
      await loadInvoiceDetail(id);
    } catch (error) {
      console.error("[mfe-finance] Failed to remove item-level discount", error);
      setFormError(error instanceof Error ? error.message : "Could not remove item-level discount.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!consumerName.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    if (!categoryId) {
      setFormError("Invoice category is required.");
      return;
    }
    if (!locationId) {
      setFormError("Location is required.");
      return;
    }
    if (items.length === 0) {
      setFormError("At least one invoice item must be added.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedLocation = locationOptions.find((option) => option.value === locationId);
      const payload: any = {
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        invoiceId: invoiceNum.trim() || undefined,
        invoiceNum: invoiceNum.trim() || undefined,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        invoiceLabel: invoiceLabel.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        consumerUid: consumerUid || undefined,
        consumerName: consumerName.trim(),
        consumerPhone: consumerPhone.trim() || undefined,
        billedToAddress: billedToAddress.trim() || undefined,
        notesForProvider: notesForProvider.trim() || undefined,
        notesForCustomer: notesForCustomer.trim() || undefined,
        termsConditions: termsConditions.trim() || undefined,
        description: notesForCustomer.trim() || undefined,
        netTotal: parsedAmount,
        netTotalAfterDiscount: parsedAmount,
        amountDue: parsedAmount,
        locationUid: locationId || undefined,
        locationId,
        locationName: selectedLocation?.label || mfeProps.location?.name || mfeProps.location?.place || undefined,
        partyType: "B2C",
        supplyType: "INTRA_STATE",
        autoGenerated: false,
        sourceService: "API_GATEWAY",
        feature: "BASE_CRM",
        subFeature: "BASE_CRM",
        featureModule: "BASE_CRM_CORE",
        detailList: items.map((item) => ({
          uid: item.detailUid || undefined,
          itemUid: item.itemUid || undefined,
          itemName: item.name,
          itemType: item.itemType,
          itemNature: "SINGLE_ITEM",
          quantity: item.qty,
          price: item.price,
          netTotal: item.price * item.qty,
          netTotalAfterDiscount: item.afterDiscount ?? item.price * item.qty,
          netRate: item.price,
          discountAmount: item.discountAmount ?? 0,
          sourceService: "API_GATEWAY",
          feature: "BASE_CRM",
          subFeature: "BASE_CRM",
          featureModule: "BASE_CRM_CORE",
          locationUid: locationId || undefined,
          processedDate: new Date(item.date).toISOString(),
        })),
      };

      if (isEditing && id) {
        await financeApi.invoices.updateGeneral(id, payload);
      } else {
        await financeApi.invoices.createGeneral(payload);
      }

      navigateToInvoiceList();
    } catch (error) {
      console.error("[mfe-finance] Failed to save invoice", error);
      setFormError(error instanceof Error ? error.message : "Could not save invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading invoice form...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isEditing ? "Edit Invoice" : "Create Invoice"}
        subtitle={isEditing ? "Modify an existing invoice." : "Issue new billing manually."}
        actions={<Button variant="outline" onClick={navigateToInvoiceList}>Back</Button>}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Combobox
                label="Finance Consumer"
                placeholder="Choose finance consumer"
                searchPlaceholder="Search finance consumer"
                emptyMessage="No finance consumers found"
                options={consumerOptions}
                value={consumerUid}
                onValueChange={(value) => {
                  setConsumerUid(value);
                  const option = consumerOptions.find((entry) => entry.value === value);
                  if (!option) {
                    return;
                  }
                  setConsumerName(option.label);
                  setConsumerPhone(option.phone || "");
                  setBilledToAddress(option.address || "");
                }}
                hint={selectedConsumerOption?.description ?? "Select a finance consumer to auto-fill customer details."}
              />
            </div>
            <Input label="Customer Name *" value={consumerName} onChange={(event) => setConsumerName(event.target.value)} required />
            <Input label="Customer Phone" value={consumerPhone} onChange={(event) => setConsumerPhone(event.target.value)} />
          </div>

          <button type="button" className="w-fit text-sm font-semibold text-indigo-700">
            + Billing Address
          </button>

          <Textarea
            label="Billing Address"
            value={billedToAddress}
            onChange={(event) => setBilledToAddress(event.target.value)}
            placeholder="Add customer billing address"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Invoice Category</label>
              <div className="flex items-center">
                <Select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="rounded-r-none border-r-0"
                  containerClassName="flex-1"
                  options={[{ value: "", label: "Select category" }, ...categoryOptions]}
                />
                <Button
                  type="button"
                  className="h-[38px] rounded-l-none px-3"
                  onClick={() => setShowCategoryDialog(true)}
                >
                  +
                </Button>
              </div>
            </div>

            <Select
              label="Location"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                if (!isEditing) {
                  setInvoiceNum("");
                }
              }}
              options={[{ value: "", label: "Select location" }, ...locationOptions]}
            />

            <Input label="Invoice#" value={invoiceNum} onChange={(event) => setInvoiceNum(event.target.value)} />
            <Input label="Referral Number" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Referral Number" />

            <Input label="Invoice Date *" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
            <Input label="Due Date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>

          <Input
            label="Subject"
            value={invoiceLabel}
            onChange={(event) => setInvoiceLabel(event.target.value)}
            placeholder="Let your customer know what this invoice is for"
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <th className="px-4 py-3">Procedure/Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No items added yet. Please add at least one item below.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.qty}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.totalAmount ?? item.price * item.qty)}</td>
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3 text-center">
                          <Popover
                            portal
                            placement="bottom"
                            align="end"
                            open={openItemActionId === item.id}
                            onOpenChange={(open) => setOpenItemActionId(open ? item.id : null)}
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                icon={<Icon name="moreVertical" className="h-4 w-4" />}
                                aria-label={`Actions for ${item.name}`}
                              />
                            }
                          >
                            <div className="grid min-w-[180px] p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start font-normal"
                                disabled={!isEditing || !item.detailUid}
                                onClick={() => void openDiscountDialog(item)}
                              >
                                Apply Discount
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start font-normal"
                                disabled={!isEditing || !item.detailUid || !item.discountId}
                                onClick={() => {
                                  setOpenItemActionId(null);
                                  void handleRemoveItemDiscount(item);
                                }}
                              >
                                Remove Discount
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start font-normal text-rose-600"
                                onClick={() => {
                                  setOpenItemActionId(null);
                                  setItems((current) => current.filter((entry) => entry.id !== item.id));
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </Popover>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_120px_1.4fr_1.6fr_auto] lg:items-end">
              <div className="min-w-0">
                <Combobox
                  label="Procedure/Item *"
                  placeholder="Choose Procedure/Item"
                  searchPlaceholder="Search finance items"
                  emptyMessage="No matching finance item found"
                  options={financeCatalogOptions}
                  value={newItemCatalogValue}
                  onValueChange={(value) => {
                    setNewItemCatalogValue(value);
                    const option = financeCatalogOptions.find((entry) => entry.value === value);
                    if (!option) return;
                    setNewItemName(option.label);
                    setNewItemPrice(option.price ?? 0);
                  }}
                  hint={selectedCatalogOption?.description ?? "Choose a finance item to auto-fill price."}
                  id="invoice-item-picker"
                />
              </div>

              <Input label="Qty" type="number" min="1" value={newItemQty} onChange={(event) => setNewItemQty(Number(event.target.value) || 1)} />
              <Input label="Price (INR)" type="number" min="0" step="0.01" value={newItemPrice} onChange={(event) => setNewItemPrice(Number(event.target.value) || 0)} />
              <Input label="Date" type="date" value={newItemDate} onChange={(event) => setNewItemDate(event.target.value)} />

              <div className="flex gap-2 lg:pb-[2px]">
                <Button
                  type="button"
                  onClick={() => {
                    if (!newItemName.trim()) {
                      return;
                    }
                    setItems((current) => [
                      ...current,
                      {
                        id: `item-${Date.now()}`,
                        itemUid: selectedCatalogOption?.itemUid,
                        itemType: selectedCatalogOption?.itemType || "ADHOC_ITEM",
                        name: newItemName.trim(),
                        qty: newItemQty,
                        price: newItemPrice,
                        date: newItemDate,
                        totalAmount: newItemPrice * newItemQty,
                      },
                    ]);
                    resetItemBuilder();
                  }}
                >
                  Add
                </Button>
                <Button type="button" variant="outline" onClick={resetItemBuilder}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Your Notes" value={notesForProvider} onChange={(event) => setNotesForProvider(event.target.value)} placeholder="Private Note" />
            <Input label="Patient Notes" value={notesForCustomer} onChange={(event) => setNotesForCustomer(event.target.value)} placeholder="Shared with patient" />
          </div>

          <Input
            label="Terms & Conditions"
            value={termsConditions}
            onChange={(event) => setTermsConditions(event.target.value)}
            placeholder="Terms and condition"
          />

          <Input
            label="Total Amount"
            type="text"
            value={formatCurrency(Number(amount))}
            readOnly
            disabled
            className="bg-slate-50 font-semibold"
          />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={navigateToInvoiceList}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isEditing ? "Update Invoice" : "Save"}
              </Button>
            </div>
            <Button type="button" variant="outline" disabled>
              Save As Template
            </Button>
          </div>
        </form>
      </SectionCard>

      <Dialog open={showCategoryDialog} onClose={() => setShowCategoryDialog(false)} title="Create Invoice Category" size="md">
        <div className="space-y-5 pt-2">
          <Input
            label="Category Name"
            placeholder="Enter category name"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <Input label="Category Type" value="Invoice" disabled />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleCreateCategory} disabled={creatingCategory || !newCategoryName.trim()}>
              {creatingCategory ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={Boolean(discountDialogItem)} onClose={resetDiscountDialog} title="Apply Item Discount" size="md">
        <div className="grid gap-5 pt-2">
          <Input label="Procedure/Item" value={discountDialogItem?.name || ""} disabled />
          <Select
            label="Discount *"
            value={selectedDiscountId}
            onChange={(event) => void handleDiscountChange(event.target.value)}
            options={[
              { value: "", label: discountOptionsLoading ? "Loading discounts..." : "Select discount" },
              ...discountOptions.map((option) => ({ value: option.value, label: option.label })),
            ]}
          />
          {!discountOptionsLoading && discountOptions.length === 0 ? (
            <div className="text-sm text-slate-500">No discounts found. Create a discount and reopen this dialog.</div>
          ) : null}
          {discountLoading ? (
            <div className="text-sm text-slate-500">Loading discount details...</div>
          ) : null}
          {selectedDiscountDetail?.discountType?.toUpperCase() === "ONDEMAND" ? (
            <Input
              label="Discount Amount *"
              type="number"
              min="0"
              step="0.01"
              value={discountAmountInput}
              onChange={(event) => setDiscountAmountInput(event.target.value)}
            />
          ) : selectedDiscountDetail ? (
            <Input
              label={selectedDiscountDetail.calculationType === "FIXED_PCT" ? "Discount Percentage" : "Discount Value"}
              value={String(selectedDiscountDetail.discountValue)}
              disabled
            />
          ) : null}
          <Input
            label="Private Note"
            value={discountPrivateNote}
            onChange={(event) => setDiscountPrivateNote(event.target.value)}
          />
          <Input
            label="Display Note"
            value={discountDisplayNote}
            onChange={(event) => setDiscountDisplayNote(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetDiscountDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyItemDiscount()}
              disabled={
                discountSubmitting ||
                discountLoading ||
                !selectedDiscountId ||
                (selectedDiscountDetail?.discountType?.toUpperCase() === "ONDEMAND" && !discountAmountInput.trim())
              }
            >
              {discountSubmitting ? "Applying..." : "Apply Discount"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
