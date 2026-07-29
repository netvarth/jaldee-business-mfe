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
  calculationType?: string;
  discountValue?: number;
  privateNote?: string;
  displayNote?: string;
  discountAmount?: number;
  afterDiscount?: number;
  taxAmount?: number;
  totalAmount?: number;
  discountApplicable?: boolean;
}

interface FinanceCatalogOption extends ComboboxOption {
  itemUid?: string;
  itemType?: "FINANCE_ITEM";
  price?: number;
  discountApplicable?: boolean;
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
  description?: string;
  tenantUid?: string;
  status?: string;
}

interface DiscountDetail {
  uid: string;
  name: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  tenantUid?: string;
  status?: string;
}

interface CouponOption {
  value: string;
  label: string;
  code: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  feature?: string;
  status?: string;
}

interface CouponDetail {
  uid: string;
  code: string;
  name: string;
  discountType: string;
  calculationType: string;
  discountValue: number;
  description?: string;
  feature?: string;
  status?: string;
}

interface ConsumerOption extends ComboboxOption {
  consumerUid: string;
  consumerType?: string;
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
      description: String(item.description ?? ""),
      tenantUid: String(item.tenantUid ?? ""),
      status: String(item.status ?? "ACTIVE"),
    }))
    .filter((item: DiscountOption) => item.value);
}

function mapCouponOptions(items: any[]): CouponOption[] {
  return items
    .map((item: any) => ({
      value: String(item.uid ?? item.couponId ?? item.id ?? item.code ?? ""),
      label: String(item.name ?? item.displayName ?? item.couponCode ?? item.code ?? "Coupon"),
      code: String(item.couponCode ?? item.code ?? item.name ?? ""),
      discountType: String(item.discountType ?? item.type ?? "PREDEFINED"),
      calculationType: String(item.calculationType ?? "FIXED_AMOUNT"),
      discountValue: Number(item.discountValue ?? item.discount ?? item.value ?? item.amount ?? 0),
      description: String(item.description ?? ""),
      feature: String(item.feature ?? item.featureModule ?? "FINANCE"),
      status: String(item.status ?? "ACTIVE"),
    }))
    .filter((item: CouponOption) => item.value);
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
  const discountAmount = Number(
    item.discountAmount ??
    item.discountTotal ??
    appliedDiscount?.discountAmount ??
    appliedDiscount?.discountedAmount ??
    appliedDiscount?.discountValue ??
    0,
  );
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
    calculationType: readString(appliedDiscount?.calculationType, appliedDiscount?.calcType, item.calculationType) || undefined,
    discountValue: Number(
      appliedDiscount?.discountValue ??
      appliedDiscount?.discountedAmount ??
      item.discountValue ??
      item.discountTotal ??
      0,
    ),
    privateNote: readString(appliedDiscount?.privateNote, item.privateNote) || undefined,
    displayNote: readString(appliedDiscount?.displayNote, item.displayNote) || undefined,
    discountAmount,
    afterDiscount,
    taxAmount,
    totalAmount: Number(item.total || afterDiscount + taxAmount),
    discountApplicable: item.discountApplicable !== undefined ? Boolean(item.discountApplicable) : undefined,
  };
}

export default function FinanceInvoiceForm() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const navigateToInvoiceList = () => {
    navigate("/invoice", { replace: true });
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
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showItemBuilder, setShowItemBuilder] = useState(true);
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
  const [showInvoiceDiscountDialog, setShowInvoiceDiscountDialog] = useState(false);
  const [showInvoiceCouponDialog, setShowInvoiceCouponDialog] = useState(false);
  const [selectedInvoiceDiscountId, setSelectedInvoiceDiscountId] = useState("");
  const [selectedInvoiceDiscountDetail, setSelectedInvoiceDiscountDetail] = useState<DiscountDetail | null>(null);
  const [invoiceDiscountAmountInput, setInvoiceDiscountAmountInput] = useState("");
  const [invoiceDiscountSubmitting, setInvoiceDiscountSubmitting] = useState(false);
  const [invoiceDiscountLoading, setInvoiceDiscountLoading] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [selectedCouponDetail, setSelectedCouponDetail] = useState<CouponDetail | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponOptionsLoading, setCouponOptionsLoading] = useState(false);
  const [couponSubmitting, setCouponSubmitting] = useState(false);

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
  const selectedInvoiceDiscountOption = useMemo(
    () => discountOptions.find((option) => option.value === selectedInvoiceDiscountId),
    [discountOptions, selectedInvoiceDiscountId]
  );
  const selectedCouponOption = useMemo(
    () => couponOptions.find((option) => option.value === selectedCouponId),
    [couponOptions, selectedCouponId]
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
    setEditingItemId(null);
    setNewItemCatalogValue("");
    setNewItemName("");
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemDate(todayIsoDate());
  }

  function openNewItemBuilder() {
    resetItemBuilder();
    setShowItemBuilder(true);
  }

  function openItemEditor(item?: InvoiceItem) {
    if (!item) {
      resetItemBuilder();
      setShowItemBuilder(true);
      return;
    }

    setShowItemBuilder(true);
    setEditingItemId(item.id);
    setNewItemCatalogValue(item.itemUid || "");
    setNewItemName(item.name);
    setNewItemQty(item.qty);
    setNewItemPrice(item.price);
    setNewItemDate(item.date);
  }

  function handleSaveItem() {
    if (!newItemName.trim()) {
      return;
    }

    const selectedOption = financeCatalogOptions.find((entry) => entry.value === newItemCatalogValue);

    if (editingItemId) {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== editingItemId) {
            return item;
          }

          const nextDiscountAmount = item.discountAmount ?? 0;
          const nextAfterDiscount = Math.max(newItemPrice * newItemQty - nextDiscountAmount, 0);
          const nextTaxAmount = item.taxAmount ?? 0;

          return {
            ...item,
            itemUid: selectedOption?.itemUid ?? item.itemUid,
            itemType: selectedOption?.itemType ?? item.itemType,
            name: newItemName.trim(),
            qty: newItemQty,
            price: newItemPrice,
            date: newItemDate,
            discountApplicable: selectedOption?.discountApplicable ?? item.discountApplicable,
            afterDiscount: nextAfterDiscount,
            totalAmount: nextAfterDiscount + nextTaxAmount,
          };
        })
      );
      resetItemBuilder();
      setShowItemBuilder(false);
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: `item-${Date.now()}`,
        itemUid: selectedOption?.itemUid,
        itemType: selectedOption?.itemType || "ADHOC_ITEM",
        name: newItemName.trim(),
        qty: newItemQty,
        price: newItemPrice,
        date: newItemDate,
        afterDiscount: newItemPrice * newItemQty,
        totalAmount: newItemPrice * newItemQty,
        discountApplicable: selectedOption?.discountApplicable,
      },
    ]);
    resetItemBuilder();
    setShowItemBuilder(false);
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
      const response = await financeApi.discounts.list<any>({
        page: 0,
        size: 1000,
        sort: [
          {
            field: "createdAt",
            direction: "DESC",
          },
        ],
        view: "SUMMARY",
      });

      const tenantDiscounts = readArrayPayload(response?.data);
      const nextDiscountOptions = mapDiscountOptions(
        tenantDiscounts.filter((item, index, array) => {
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
        console.warn("[mfe-finance] No discount options returned from tenant search endpoint");
      }

      setDiscountOptions(nextDiscountOptions);
    } catch (error) {
      console.error("[mfe-finance] Failed to load discount options", error);
      setDiscountOptions([]);
    } finally {
      setDiscountOptionsLoading(false);
    }
  }

  async function loadCouponOptions() {
    setCouponOptionsLoading(true);
    try {
      const response = await financeApi.coupons.list<any>({
        page: 0,
        size: 1000,
        sort: [
          {
            field: "createdAt",
            direction: "DESC",
          },
        ],
      });

      const coupons = readArrayPayload(response?.data);
      setCouponOptions(
        mapCouponOptions(
          coupons.filter((item, index, array) => {
            const value = String(item?.uid ?? item?.couponId ?? item?.id ?? item?.code ?? "");
            if (!value) {
              return false;
            }
            return array.findIndex((entry) => String(entry?.uid ?? entry?.couponId ?? entry?.id ?? entry?.code ?? "") === value) === index;
          })
        )
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to load coupon options", error);
      setCouponOptions([]);
    } finally {
      setCouponOptionsLoading(false);
    }
  }

  function handleDiscountChange(value: string) {
    setSelectedDiscountId(value);
    setSelectedDiscountDetail(null);
    setDiscountAmountInput("");
    setFormError("");
  }

  function handleInvoiceDiscountChange(value: string) {
    setSelectedInvoiceDiscountId(value);
    setSelectedInvoiceDiscountDetail(null);
    setInvoiceDiscountAmountInput("");
    setFormError("");
  }

  function handleCouponChange(value: string) {
    setSelectedCouponId(value);
    setSelectedCouponDetail(null);
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

  async function openInvoiceDiscountDialog() {
    if (!isEditing || !id) {
      setFormError("Save the invoice first, then apply invoice-level discount.");
      return;
    }
    setShowInvoiceDiscountDialog(true);
    setSelectedInvoiceDiscountId("");
    setSelectedInvoiceDiscountDetail(null);
    setInvoiceDiscountAmountInput("");
    setFormError("");
    await loadDiscountOptions();
  }

  async function openCouponDialog() {
    if (!isEditing || !id) {
      setFormError("Save the invoice first, then apply invoice-level coupon.");
      return;
    }
    setShowInvoiceCouponDialog(true);
    setSelectedCouponId("");
    setSelectedCouponDetail(null);
    setFormError("");
    await loadCouponOptions();
  }

  function resetInvoiceDiscountDialog() {
    setShowInvoiceDiscountDialog(false);
    setSelectedInvoiceDiscountId("");
    setSelectedInvoiceDiscountDetail(null);
    setInvoiceDiscountAmountInput("");
    setInvoiceDiscountSubmitting(false);
    setInvoiceDiscountLoading(false);
  }

  function resetCouponDialog() {
    setShowInvoiceCouponDialog(false);
    setSelectedCouponId("");
    setSelectedCouponDetail(null);
    setCouponSubmitting(false);
    setCouponLoading(false);
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

  useEffect(() => {
    let active = true;

    async function loadInvoiceDiscountDetail() {
      if (!selectedInvoiceDiscountId || !showInvoiceDiscountDialog) {
        return;
      }

      const fallbackOption = discountOptions.find((option) => option.value === selectedInvoiceDiscountId);
      setInvoiceDiscountLoading(true);
      try {
        const response = await financeApi.discounts.detail<any>(selectedInvoiceDiscountId);
        const data = response.data ?? {};
        if (!active) {
          return;
        }
        const detail: DiscountDetail = {
          uid: String(data.uid ?? data.id ?? selectedInvoiceDiscountId),
          name: String(data.name ?? fallbackOption?.label ?? "Discount"),
          discountType: String(data.discountType ?? data.discType ?? fallbackOption?.discountType ?? "PREDEFINED"),
          calculationType: String(data.calculationType ?? fallbackOption?.calculationType ?? "FIXED_AMOUNT"),
          discountValue: Number(data.discountValue ?? fallbackOption?.discountValue ?? 0),
          description: String(data.description ?? fallbackOption?.description ?? ""),
          tenantUid: String(data.tenantUid ?? fallbackOption?.tenantUid ?? ""),
          status: String(data.status ?? fallbackOption?.status ?? "ACTIVE"),
        };
        setSelectedInvoiceDiscountDetail(detail);
        if (detail.discountType.toUpperCase() !== "ONDEMAND") {
          setInvoiceDiscountAmountInput(String(detail.discountValue));
        }
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("[mfe-finance] Failed to load invoice-level discount detail", error);
        setFormError(error instanceof Error ? error.message : "Could not load discount details.");
      } finally {
        if (active) {
          setInvoiceDiscountLoading(false);
        }
      }
    }

    void loadInvoiceDiscountDetail();
    return () => {
      active = false;
    };
  }, [discountOptions, selectedInvoiceDiscountId, showInvoiceDiscountDialog]);

  useEffect(() => {
    let active = true;

    async function loadSelectedCoupon() {
      if (!selectedCouponId || !showInvoiceCouponDialog) {
        return;
      }

      const fallbackOption = couponOptions.find((option) => option.value === selectedCouponId);
      setCouponLoading(true);
      try {
        const response = await financeApi.coupons.detail<any>(selectedCouponId);
        const data = response.data ?? {};
        if (!active) {
          return;
        }
        setSelectedCouponDetail({
          uid: String(data.uid ?? data.couponId ?? data.id ?? selectedCouponId),
          code: String(data.couponCode ?? data.code ?? fallbackOption?.code ?? ""),
          name: String(data.name ?? fallbackOption?.label ?? "Coupon"),
          discountType: String(data.discountType ?? fallbackOption?.discountType ?? "PREDEFINED"),
          calculationType: String(data.calculationType ?? fallbackOption?.calculationType ?? "FIXED_AMOUNT"),
          discountValue: Number(data.discountValue ?? data.discount ?? data.value ?? fallbackOption?.discountValue ?? 0),
          description: String(data.description ?? fallbackOption?.description ?? ""),
          feature: String(data.feature ?? data.featureModule ?? fallbackOption?.feature ?? "FINANCE"),
          status: String(data.status ?? fallbackOption?.status ?? "ACTIVE"),
        });
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("[mfe-finance] Failed to load coupon detail", error);
        setFormError(error instanceof Error ? error.message : "Could not load coupon details.");
      } finally {
        if (active) {
          setCouponLoading(false);
        }
      }
    }

    void loadSelectedCoupon();
    return () => {
      active = false;
    };
  }, [couponOptions, selectedCouponId, showInvoiceCouponDialog]);

  async function loadInvoiceDetail(invoiceId: string, catalogItems?: any[]) {
    const invoiceRes = await financeApi.invoices.detailGeneral<any>(invoiceId);
    const invoiceData = invoiceRes.data;
    if (!invoiceData) {
      return;
    }

    const invoiceLocationId = String(invoiceData.locationUid || invoiceData.locationId || defaultLocationId);
    const invoiceLocationName = String(
      invoiceData.locationName ||
      invoiceData.locationDisplayName ||
      invoiceData.locationLabel ||
      defaultLocationName ||
      "Selected Location"
    );

    setCategoryId(String(invoiceData.categoryId || ""));
    setStatusId(String(invoiceData.statusId || ""));
    setLocationId(invoiceLocationId);
    setLocationOptions((current) => {
      if (!invoiceLocationId) {
        return current;
      }
      if (current.some((option) => option.value === invoiceLocationId)) {
        return current;
      }
      return [...current, { value: invoiceLocationId, label: invoiceLocationName }];
    });
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

    const itemsSource = catalogItems && catalogItems.length > 0 ? catalogItems : financeCatalogOptions;

    if (Array.isArray(invoiceData.detailList)) {
      setItems(
        invoiceData.detailList.map((item: any, index: number) => {
          const mapped = mapInvoiceItem(item, index);
          if (mapped.itemUid) {
            const catalogItem = itemsSource.find((ci: any) => String(ci.uid ?? ci.id ?? ci.itemUid ?? ci.value) === mapped.itemUid);
            if (catalogItem) {
              mapped.discountApplicable = catalogItem.discountApplicable !== undefined ? Boolean(catalogItem.discountApplicable) : true;
            }
          }
          if (mapped.discountApplicable === undefined) {
            mapped.discountApplicable = true;
          }
          return mapped;
        })
      );
    } else {
      setItems([]);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        const [customersResult, categoriesResult, statusesResult, itemsResult] = await Promise.allSettled([
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
        ]);

        if (!active) return;

        const customersResponse = customersResult.status === "fulfilled" ? customersResult.value : null;
        const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
        const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
        const itemsResponse = itemsResult.status === "fulfilled" ? itemsResult.value : null;

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

        const nextCategoryOptions = categories.map((item: any) => ({
          value: String(item.categoryId ?? item.uid ?? item.id),
          label: String(item.name ?? item.categoryName ?? "Category"),
        }));
        const nextStatusOptions = statuses.map((item: any) => ({
          value: String(item.id ?? item.uid ?? item.statusId),
          label: String(item.name ?? item.statusName ?? "Status"),
        }));
        const nextLocationOptions =
          defaultLocationId
            ? [{ value: defaultLocationId, label: defaultLocationName || "Selected Location" }]
            : [];
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
              consumerType: readString(
                item.consumerType,
                item.type,
                item.consumerSnapshot?.consumerType,
              ) || "NONE",
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
          nextLocationOptions
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
              discountApplicable: item.discountApplicable !== undefined ? Boolean(item.discountApplicable) : true,
            };
          })
          .filter(Boolean) as FinanceCatalogOption[];

        setFinanceCatalogOptions(financeItemOptions);
        await loadDiscountOptions();

        if (isEditing && id) {
          await loadInvoiceDetail(id, financeItemOptions);
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
      const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
      const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
      const discountValueNum = discountAmountInput.trim() ? Number(discountAmountInput) : activeDiscount?.discountValue ?? 0;
      await financeApi.invoices.applyDiscountInDetail(discountDialogItem.detailUid, {
        tenantUid: activeDiscount?.tenantUid || tenantUid || undefined,
        name: activeDiscount?.name || "",
        description: activeDiscount?.description || undefined,
        calculationType: activeDiscount?.calculationType || "FIXED_AMOUNT",
        discountType: activeDiscount?.discountType || "PREDEFINED",
        discountValue: discountValueNum,
        status: activeDiscount?.status || "ACTIVE",
        uid: activeDiscount?.uid || selectedDiscountId,
        discountedAmount: discountValueNum,
      });
      resetDiscountDialog();
      navigateToInvoiceList();
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
      const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
      const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
      const discountValueNum = Number(item.discountValue ?? 0);
      const discountedAmount = Number(item.discountAmount ?? discountValueNum);
      await financeApi.invoices.removeDiscountFromDetail(item.detailUid, {
        tenantUid: tenantUid || undefined,
        name: item.discountName || "",
        description: "",
        calculationType: item.calculationType || "FIXED_AMOUNT",
        discountType: item.discountType || "PREDEFINED",
        discountValue: discountValueNum,
        status: "INACTIVE",
        uid: item.discountId,
        discountedAmount,
      });
      await loadInvoiceDetail(id);
    } catch (error) {
      console.error("[mfe-finance] Failed to remove item-level discount", error);
      setFormError(error instanceof Error ? error.message : "Could not remove item-level discount.");
    }
  }

  async function handleApplyInvoiceDiscount() {
    if (!id || !selectedInvoiceDiscountId) {
      return;
    }

    const activeDiscount = selectedInvoiceDiscountDetail ?? (
      selectedInvoiceDiscountOption
        ? {
            uid: selectedInvoiceDiscountOption.value,
            name: selectedInvoiceDiscountOption.label,
            discountType: selectedInvoiceDiscountOption.discountType,
            calculationType: selectedInvoiceDiscountOption.calculationType,
            discountValue: selectedInvoiceDiscountOption.discountValue,
            description: selectedInvoiceDiscountOption.description,
            tenantUid: selectedInvoiceDiscountOption.tenantUid,
            status: selectedInvoiceDiscountOption.status,
          }
        : null
    );

    if (activeDiscount?.discountType?.toUpperCase() === "ONDEMAND" && !invoiceDiscountAmountInput.trim()) {
      setFormError("Discount amount is required for on-demand discount.");
      return;
    }

    setInvoiceDiscountSubmitting(true);
    setFormError("");
    try {
      const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
      const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
      const discountValueNum = invoiceDiscountAmountInput.trim() ? Number(invoiceDiscountAmountInput) : activeDiscount?.discountValue ?? 0;
      await financeApi.invoices.applyDiscount(id, {
        tenantUid: activeDiscount?.tenantUid || tenantUid || undefined,
        name: activeDiscount?.name || "",
        description: activeDiscount?.description || undefined,
        calculationType: activeDiscount?.calculationType || "FIXED_AMOUNT",
        discountType: activeDiscount?.discountType || "PREDEFINED",
        discountValue: discountValueNum,
        status: activeDiscount?.status || "ACTIVE",
        uid: activeDiscount?.uid || selectedInvoiceDiscountId,
        discountedAmount: discountValueNum,
      });
      resetInvoiceDiscountDialog();
      navigateToInvoiceList();
    } catch (error) {
      console.error("[mfe-finance] Failed to apply invoice-level discount", error);
      setFormError(error instanceof Error ? error.message : "Could not apply invoice-level discount.");
      setInvoiceDiscountSubmitting(false);
    }
  }

  async function handleApplyCoupon() {
    if (!id || !selectedCouponId) {
      return;
    }

    const activeCoupon = selectedCouponDetail ?? selectedCouponOption ?? null;
    const couponUid = selectedCouponDetail?.uid ?? selectedCouponOption?.value ?? selectedCouponId;
    const couponCode = activeCoupon?.code || "";
    const couponName = activeCoupon?.name || selectedCouponOption?.label || "";

    setCouponSubmitting(true);
    setFormError("");
    try {
      await financeApi.invoices.applyCoupon(id, {
        uid: couponUid,
        couponCode,
        code: couponCode,
        name: couponName,
        description: activeCoupon?.description || undefined,
        feature: activeCoupon?.feature || "FINANCE",
        calculationType: activeCoupon?.calculationType || "FIXED_AMOUNT",
        discountType: activeCoupon?.discountType || "PREDEFINED",
        discountValue: activeCoupon?.discountValue ?? 0,
        status: activeCoupon?.status || "ACTIVE",
      });
      resetCouponDialog();
      navigateToInvoiceList();
    } catch (error) {
      console.error("[mfe-finance] Failed to apply invoice-level coupon", error);
      setFormError(error instanceof Error ? error.message : "Could not apply invoice-level coupon.");
      setCouponSubmitting(false);
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
      const resolvedConsumerType = selectedConsumerOption?.consumerType || "NONE";
      const payload: any = {
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        invoiceId: invoiceNum.trim() || undefined,
        invoiceNum: invoiceNum.trim() || undefined,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        invoiceLabel: invoiceLabel.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        consumerType: resolvedConsumerType,
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
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Invoice Actions</div>
                <div className="text-xs text-slate-500">Manage invoice-level item, discount, and coupon actions.</div>
              </div>
              <Popover
                portal
                placement="bottom"
                align="end"
                trigger={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-11 w-11 rounded-xl bg-cyan-100 p-0 text-cyan-900 hover:bg-cyan-200"
                    icon={<Icon name="moreVertical" className="h-4 w-4 rotate-90" />}
                    aria-label="Invoice actions"
                  />
                }
              >
                <div className="grid min-w-[220px] p-1">
                  <Button variant="ghost" size="sm" className="justify-start font-normal" onClick={openNewItemBuilder}>
                    Add Procedure/Item
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start font-normal" onClick={() => void openInvoiceDiscountDialog()}>
                    Apply Discount
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start font-normal" onClick={() => void openCouponDialog()}>
                    Apply Coupon
                  </Button>
                </div>
              </Popover>
            </div>

            <div className="mb-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <th className="px-4 py-3">Procedure/Item</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">After Discount</th>
                    <th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No items added yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.name}
                          {item.discountApplicable === false && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                              Discount Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-center">{item.qty}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.discountAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.afterDiscount ?? item.price * item.qty)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.taxAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.totalAmount ?? item.price * item.qty)}</td>
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
                                onClick={() => {
                                  setOpenItemActionId(null);
                                  openItemEditor(item);
                                }}
                              >
                                Edit
                              </Button>
                              {isEditing && !item.discountId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start font-normal"
                                  disabled={!item.detailUid || item.discountApplicable === false}
                                  onClick={() => void openDiscountDialog(item)}
                                >
                                  Apply Discount
                                </Button>
                              ) : null}
                              {isEditing && !!item.discountId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start font-normal"
                                  disabled={!item.detailUid || !item.discountId}
                                  onClick={() => {
                                    setOpenItemActionId(null);
                                    void handleRemoveItemDiscount(item);
                                  }}
                                >
                                  Remove Discount
                                </Button>
                              ) : null}
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

            {showItemBuilder ? (
              <div className="mb-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4 xl:grid-cols-[minmax(0,2.2fr)_120px_minmax(140px,1.4fr)_minmax(180px,1.6fr)_auto] xl:items-start">
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

                <div className="flex gap-2 xl:self-start xl:pt-[29px]">
                  <Button type="button" onClick={handleSaveItem}>
                    {editingItemId ? "Change" : "Add"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetItemBuilder();
                      setShowItemBuilder(items.length === 0);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="border-indigo-600 text-indigo-700 hover:bg-indigo-50"
              onClick={openNewItemBuilder}
            >
              Add Procedure/Item
            </Button>
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

      <Dialog open={showInvoiceDiscountDialog} onClose={resetInvoiceDiscountDialog} title="Apply Invoice Discount" size="md">
        <div className="grid gap-5 pt-2">
          <Select
            label="Discount *"
            value={selectedInvoiceDiscountId}
            onChange={(event) => handleInvoiceDiscountChange(event.target.value)}
            options={[
              { value: "", label: discountOptionsLoading ? "Loading discounts..." : "Select discount" },
              ...discountOptions.map((option) => ({ value: option.value, label: option.label })),
            ]}
          />
          {!discountOptionsLoading && discountOptions.length === 0 ? (
            <div className="text-sm text-slate-500">No discounts found. Create a discount and reopen this dialog.</div>
          ) : null}
          {invoiceDiscountLoading ? (
            <div className="text-sm text-slate-500">Loading discount details...</div>
          ) : null}
          {selectedInvoiceDiscountDetail?.discountType?.toUpperCase() === "ONDEMAND" ? (
            <Input
              label="Discount Amount *"
              type="number"
              min="0"
              step="0.01"
              value={invoiceDiscountAmountInput}
              onChange={(event) => setInvoiceDiscountAmountInput(event.target.value)}
            />
          ) : selectedInvoiceDiscountDetail ? (
            <Input
              label={selectedInvoiceDiscountDetail.calculationType === "FIXED_PCT" ? "Discount Percentage" : "Discount Value"}
              value={String(selectedInvoiceDiscountDetail.discountValue)}
              disabled
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetInvoiceDiscountDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyInvoiceDiscount()}
              disabled={
                invoiceDiscountSubmitting ||
                invoiceDiscountLoading ||
                !selectedInvoiceDiscountId ||
                (selectedInvoiceDiscountDetail?.discountType?.toUpperCase() === "ONDEMAND" && !invoiceDiscountAmountInput.trim())
              }
            >
              {invoiceDiscountSubmitting ? "Applying..." : "Apply Discount"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={showInvoiceCouponDialog} onClose={resetCouponDialog} title="Apply Invoice Coupon" size="md">
        <div className="grid gap-5 pt-2">
          <Select
            label="Coupon *"
            value={selectedCouponId}
            onChange={(event) => handleCouponChange(event.target.value)}
            options={[
              { value: "", label: couponOptionsLoading ? "Loading coupons..." : "Select coupon" },
              ...couponOptions.map((option) => ({ value: option.value, label: `${option.label}${option.code ? ` (${option.code})` : ""}` })),
            ]}
          />
          {!couponOptionsLoading && couponOptions.length === 0 ? (
            <div className="text-sm text-slate-500">No coupons found. Create a coupon and reopen this dialog.</div>
          ) : null}
          {couponLoading ? (
            <div className="text-sm text-slate-500">Loading coupon details...</div>
          ) : null}
          {selectedCouponDetail ? (
            <>
              <Input label="Coupon Code" value={selectedCouponDetail.code} disabled />
              <Input
                label={selectedCouponDetail.calculationType === "FIXED_PCT" ? "Coupon Percentage" : "Coupon Value"}
                value={String(selectedCouponDetail.discountValue)}
                disabled
              />
            </>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetCouponDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleApplyCoupon()}
              disabled={couponSubmitting || couponLoading || !selectedCouponId}
            >
              {couponSubmitting ? "Applying..." : "Apply Coupon"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
