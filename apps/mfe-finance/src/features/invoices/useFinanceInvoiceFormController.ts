import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { getReadableApiError } from "@jaldee/api-client";
import { financeApi } from "../../lib/financeApi";

import {
  InvoiceItem,
  FinanceCatalogOption,
  LocationOption,
  DiscountOption,
  DiscountDetail,
  CouponOption,
  CouponDetail,
  ConsumerOption,
  InvoiceTemplateSummary,
  todayIsoDate,
  readString,
} from "./invoiceFormModel";
import { createInvoiceTemplatePayload } from "./invoiceTemplatePayload";
import { mapInvoiceDetail } from "./invoiceDetailMapper";
import { buildInvoiceSubmissionPayload, buildInvoiceUpdatePayload, validateInvoiceSubmission } from "./invoiceSubmission";
import { loadInvoiceFormOptions } from "./invoiceFormLoader";
import { fetchCouponOptions, fetchDiscountOptions, fetchInvoiceTemplates } from "./invoiceAdjustmentLoader";
import { fetchInvoiceTemplate, mapTemplateItems } from "./invoiceTemplateDetail";
import { fetchCouponDetail } from "./invoiceAdjustmentDetails";
import { buildCouponMutationPayload, buildDiscountMutationPayload, resolveTenantUid } from "./invoiceAdjustmentPayloads";
import { createInvoiceCategory, fetchNextInvoiceNumber } from "./invoiceReferenceService";
import { saveInvoiceItem } from "./invoiceItemBuilder";
import { useInvoiceAdjustmentDetails } from "./useInvoiceAdjustmentDetails";

function toFinanceErrorMessage(error: unknown, fallbackMessage: string) {
  return getReadableApiError(error, fallbackMessage).message;
}

export function useFinanceInvoiceFormController() {
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
  const [invoiceDiscount, setInvoiceDiscount] = useState<DiscountDetail | null>(null);
  const [invoiceCoupon, setInvoiceCoupon] = useState<CouponDetail | null>(null);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState<number>(0);
  const [invoiceNetTotal, setInvoiceNetTotal] = useState<number>(0);
  const [invoiceAmountDue, setInvoiceAmountDue] = useState<number>(0);
  const [invoiceTotalDiscount, setInvoiceTotalDiscount] = useState<number>(0);
  const [invoiceTotalCoupon, setInvoiceTotalCoupon] = useState<number>(0);
  const [invoiceTotalTax, setInvoiceTotalTax] = useState<number>(0);

  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [consumerOptions, setConsumerOptions] = useState<ConsumerOption[]>([]);
  const [financeCatalogOptions, setFinanceCatalogOptions] = useState<FinanceCatalogOption[]>([]);
  const [discountOptions, setDiscountOptions] = useState<DiscountOption[]>([]);
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplateSummary[]>([]);

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showItemBuilder, setShowItemBuilder] = useState(false);
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
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showTemplatePreviewDialog, setShowTemplatePreviewDialog] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [originalInvoice, setOriginalInvoice] = useState<Record<string, unknown> | null>(null);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  function clearFormError() {
    setFormError("");
  }

  function clearFormSuccess() {
    setFormSuccess("");
  }

  function reportFormError(message: string, title = "Invoice") {
    setFormSuccess("");
    setFormError(message);
    mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
      intent: "error",
      title,
      message,
    });
  }

  function reportFormSuccess(message: string, title = "Invoice") {
    setFormError("");
    setFormSuccess(message);
    setTimeout(() => {
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title,
        message,
      });
    }, 0);
  }

  const preselectedConsumerUid = String(searchParams.get("consumerUid") || "");

  useEffect(() => {
    const totalQtyPrice = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalTax = items.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0);
    const itemDiscounts = items.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
    const totalItemsAmount = items.reduce((sum, item) => sum + (item.totalAmount ?? (item.price * item.qty)), 0);

    if (!isEditing || !id) {
      setInvoiceTotalAmount(totalQtyPrice);
      setInvoiceNetTotal(totalItemsAmount);
      setInvoiceAmountDue(totalItemsAmount);
      setInvoiceTotalDiscount(itemDiscounts);
      setInvoiceTotalTax(totalTax);
    }
    setAmount(String(totalItemsAmount));
  }, [items, isEditing, id]);

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
  const filteredInvoiceTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) {
      return invoiceTemplates;
    }
    return invoiceTemplates.filter((template) =>
      [template.templateName, template.description ?? ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [invoiceTemplates, templateSearch]);

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
    const isUpdatingItem = Boolean(editingItemId);
    setItems((current) => saveInvoiceItem(current, {
      editingItemId,
      catalogValue: newItemCatalogValue,
      name: newItemName,
      quantity: newItemQty,
      price: newItemPrice,
      date: newItemDate,
      catalogOptions: financeCatalogOptions,
    }));
    resetItemBuilder();
    setShowItemBuilder(false);
    reportFormSuccess(
      isUpdatingItem ? "Item updated successfully." : "Item added successfully.",
      "Invoice Item"
    );
  }

  function handleDeleteItem(itemId: string) {
    setItems((current) => current.filter((entry) => entry.id !== itemId));
    reportFormSuccess("Item deleted successfully.", "Invoice Item");
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
      const nextDiscountOptions = await fetchDiscountOptions();
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
      setCouponOptions(await fetchCouponOptions());
    } catch (error) {
      console.error("[mfe-finance] Failed to load coupon options", error);
      setCouponOptions([]);
    } finally {
      setCouponOptionsLoading(false);
    }
  }

  async function loadInvoiceTemplates() {
    setTemplateLoading(true);
    try {
      setInvoiceTemplates(await fetchInvoiceTemplates());
    } catch (error) {
      console.error("[mfe-finance] Failed to load invoice templates", error);
      setInvoiceTemplates([]);
    } finally {
      setTemplateLoading(false);
    }
  }

  function handleDiscountChange(value: string) {
    setSelectedDiscountId(value);
    setSelectedDiscountDetail(null);
    setDiscountAmountInput("");
    clearFormError();
  }

  function handleInvoiceDiscountChange(value: string) {
    setSelectedInvoiceDiscountId(value);
    setSelectedInvoiceDiscountDetail(null);
    setInvoiceDiscountAmountInput("");
    clearFormError();
  }

  function handleCouponChange(value: string) {
    setSelectedCouponId(value);
    setSelectedCouponDetail(null);
    clearFormError();
  }

  async function openDiscountDialog(item: InvoiceItem) {
    setOpenItemActionId(null);
    setDiscountDialogItem(item);
    setSelectedDiscountId("");
    setSelectedDiscountDetail(null);
    setDiscountAmountInput("");
    setDiscountPrivateNote("");
    setDiscountDisplayNote("");
    clearFormError();
    await loadDiscountOptions();
  }

  async function openInvoiceDiscountDialog() {
    if (!isEditing || !id) {
      reportFormError("Save the invoice first, then apply invoice-level discount.");
      return;
    }
    setShowInvoiceDiscountDialog(true);
    setSelectedInvoiceDiscountId("");
    setSelectedInvoiceDiscountDetail(null);
    setInvoiceDiscountAmountInput("");
    clearFormError();
    await loadDiscountOptions();
  }

  async function openCouponDialog() {
    if (!isEditing || !id) {
      reportFormError("Save the invoice first, then apply invoice-level coupon.");
      return;
    }
    setOpenItemActionId(null);
    setShowInvoiceCouponDialog(true);
    setSelectedCouponId("");
    setSelectedCouponDetail(null);
    clearFormError();
    await loadCouponOptions();
  }

  async function openTemplateChooser() {
    setShowTemplateChooser(true);
    setTemplateSearch("");
    clearFormError();
    await loadInvoiceTemplates();
  }

  function openSaveTemplateDialog() {
    if (items.length === 0) {
      reportFormError("Add at least one item before saving as template.");
      return;
    }
    setTemplateNameInput(invoiceLabel.trim() || "Invoice Template");
    setShowSaveTemplateDialog(true);
    clearFormError();
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

  function buildInvoiceTemplatePayload(templateName: string) {
    return createInvoiceTemplatePayload(templateName, {
      mfeProps, locationOptions, locationId, defaultLocationName,
      categoryOptions, categoryId, statusOptions, statusId,
      consumerName, consumerPhone, selectedConsumerOption, nextInvoiceRequest,
      invoiceNum, consumerUid, invoiceLabel, notesForCustomer,
      referenceNo, notesForProvider, termsConditions, items,
    });
  }

  useInvoiceAdjustmentDetails({
    selectedDiscountId, discountDialogItem, discountOptions, setDiscountLoading,
    setSelectedDiscountDetail, setDiscountAmountInput, setFormError: reportFormError,
    selectedInvoiceDiscountId, showInvoiceDiscountDialog, setInvoiceDiscountLoading,
    setSelectedInvoiceDiscountDetail, setInvoiceDiscountAmountInput,
    couponOptions, selectedCouponId, showInvoiceCouponDialog, setCouponLoading,
    setSelectedCouponDetail,
  });
  async function loadInvoiceDetail(invoiceId: string, catalogItems?: any[]) {
    const invoiceRes = await financeApi.invoices.detailGeneral<any>(invoiceId);
    const invoiceData = invoiceRes.data;
    if (!invoiceData) {
      return;
    }

    const detail = mapInvoiceDetail(
      invoiceData,
      catalogItems?.length ? catalogItems : financeCatalogOptions,
      defaultLocationId,
      defaultLocationName,
    );
    setCategoryId(detail.categoryId);
    setStatusId(detail.statusId);
    setLocationId(detail.locationId);
    setLocationOptions((current) => {
      if (!detail.locationId) {
        return current;
      }
      if (current.some((option) => option.value === detail.locationId)) {
        return current;
      }
      return [...current, { value: detail.locationId, label: detail.locationName }];
    });
    setInvoiceNum(detail.invoiceNum);
    setReferenceNo(detail.referenceNo);
    setInvoiceDate(detail.invoiceDate);
    setDueDate(detail.dueDate);
    setInvoiceLabel(detail.invoiceLabel);
    setConsumerUid(detail.consumerUid);
    setConsumerName(detail.consumerName);
    setConsumerPhone(detail.consumerPhone);
    setBilledToAddress(detail.billedToAddress);
    setNotesForProvider(detail.notesForProvider);
    setNotesForCustomer(detail.notesForCustomer);
    setTermsConditions(detail.termsConditions);
    setItems(detail.items);

    const netTotal = Number(
      invoiceData.netTotal ??
      invoiceData.netTotalAfterDiscount ??
      invoiceData.defaultCurrencyAmount ??
      invoiceData.amountDue ??
      0
    );
    const totalDiscount = Number(
      invoiceData.totalDiscount ??
      invoiceData.discountTotal ??
      invoiceData.netDiscountTotal ??
      0
    );
    const totalTax = Number(
      invoiceData.totalTax ??
      invoiceData.taxTotal ??
      (Number(invoiceData.cgst ?? 0) + Number(invoiceData.sgst ?? 0) + Number(invoiceData.igst ?? 0) + Number(invoiceData.cess ?? 0)) ??
      0
    );
    const totalCoupon = Number(
      invoiceData.totalCoupon ??
      invoiceData.couponTotal ??
      invoiceData.sharedCouponTotal ??
      0
    );
    const totalAmount = Number(
      invoiceData.totalAmount ??
      invoiceData.defaultCurrencyAmount ??
      (netTotal + totalDiscount)
    );
    const amountDue = Number(
      invoiceData.amountDue ??
      invoiceData.netRate ??
      invoiceData.netRateBeforeRounding ??
      netTotal
    );

    setInvoiceTotalAmount(totalAmount);
    setInvoiceNetTotal(netTotal);
    setInvoiceAmountDue(amountDue);
    setInvoiceTotalDiscount(totalDiscount);
    setInvoiceTotalCoupon(totalCoupon);
    setInvoiceTotalTax(totalTax);
    setOriginalInvoice({
      categoryId: Number(invoiceData.categoryId ?? 0) || null,
      statusId: Number(invoiceData.statusId ?? 0) || null,
      invoiceId: String(invoiceData.invoiceId ?? invoiceData.invoiceNum ?? "").trim() || null,
      invoiceNum: String(invoiceData.invoiceNum ?? invoiceData.invoiceId ?? "").trim() || null,
      invoiceLabel: String(invoiceData.invoiceLabel ?? "").trim() || null,
      referenceNo: String(invoiceData.referenceNo ?? "").trim() || null,
      consumerUid: String(invoiceData.consumerUid ?? invoiceData.consumerId ?? "").trim() || null,
      consumerName: String(invoiceData.consumerName ?? invoiceData.customerName ?? "").trim() || null,
      consumerPhone: String(invoiceData.consumerPhone ?? "").trim() || null,
      consumerType: String(invoiceData.consumerType ?? "NONE"),
      locationUid: String(invoiceData.locationUid ?? invoiceData.locationId ?? "").trim() || null,
      locationId: String(invoiceData.locationId ?? invoiceData.locationUid ?? "").trim() || null,
      locationName: String(invoiceData.locationName ?? invoiceData.locationDisplayName ?? invoiceData.locationLabel ?? "").trim() || null,
      detailList: detail.items.map((item) => ({
        uid: item.detailUid || null,
        itemUid: item.itemUid || null,
        itemName: item.name,
        itemType: item.itemType,
        itemNature: "SINGLE_ITEM",
        quantity: Number(item.qty),
        price: Number(item.price),
        netTotal: Number(item.price * item.qty),
        netTotalAfterDiscount: Number(item.afterDiscount ?? item.price * item.qty),
        netRate: Number(item.price),
        discountAmount: Number(item.discountAmount ?? 0),
        sourceService: "FINANCE_SERVICE",
        feature: "FINANCE",
        subFeature: "FINANCE",
        featureModule: "FINANCE_INVOICE",
        locationUid: detail.locationId || null,
        processedDate: item.date ? new Date(item.date).toISOString() : null,
      })),
    });

    const appliedDiscount =
      invoiceData.discount ??
      invoiceData.appliedDiscount ??
      invoiceData.discountDetail ??
      invoiceData.discountDto ??
      invoiceData.discounts?.[0] ??
      invoiceData.discountList?.[0];
    if (appliedDiscount) {
      setInvoiceDiscount({
        ...appliedDiscount,
        uid: appliedDiscount.uid || appliedDiscount.id || "",
        name: appliedDiscount.name || "Discount",
        discountValue: Number(appliedDiscount.discountValue ?? appliedDiscount.discountedAmount ?? 0),
        calculationType: appliedDiscount.calculationType || "FIXED_PCT",
        discountType: appliedDiscount.discountType || "PREDEFINED",
      });
    } else {
      setInvoiceDiscount(null);
    }

    const appliedCoupon =
      invoiceData.coupon ??
      invoiceData.appliedCoupon ??
      invoiceData.couponDetail ??
      invoiceData.couponDto ??
      invoiceData.coupons?.[0] ??
      invoiceData.couponList?.[0];
    if (appliedCoupon) {
      setInvoiceCoupon({
        ...appliedCoupon,
        uid: appliedCoupon.uid || appliedCoupon.id || "",
        code: appliedCoupon.code || appliedCoupon.couponCode || "",
        name: appliedCoupon.name || appliedCoupon.couponName || "Coupon",
        discountValue: Number(appliedCoupon.discountValue ?? appliedCoupon.discountedAmount ?? appliedCoupon.amount ?? 0),
        calculationType: appliedCoupon.calculationType || "FIXED_PCT",
        discountType: "PREDEFINED",
      });
    } else {
      setInvoiceCoupon(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        const {
          categoryOptions: nextCategoryOptions,
          statusOptions: nextStatusOptions,
          locationOptions: nextLocationOptions,
          consumerOptions: nextConsumerOptions,
          catalogOptions: financeItemOptions,
        } = await loadInvoiceFormOptions(defaultLocationId, defaultLocationName);

        if (!active) return;
        setCategoryOptions(nextCategoryOptions);
        setStatusOptions(nextStatusOptions);

        let finalConsumerOptions = [...nextConsumerOptions];
        if (preselectedConsumerUid && !nextConsumerOptions.some((option) => option.value === preselectedConsumerUid)) {
          try {
            const res = await financeApi.customers.detail<any>(preselectedConsumerUid);
            const customerObj = res.data;
            if (customerObj) {
              const phone = String(customerObj.consumerPhone || customerObj.mobile || customerObj.mobileNo || customerObj.phoneNo || customerObj.phone || customerObj.primaryPhone || "");
              const email = String(customerObj.consumerEmail || customerObj.email || customerObj.primaryEmail || "");
              const label = String(customerObj.name || customerObj.consumerName || [customerObj.firstName, customerObj.lastName].filter(Boolean).join(" ") || customerObj.displayName || "Selected Consumer");
              const extraOption = {
                value: preselectedConsumerUid,
                label,
                consumerUid: preselectedConsumerUid,
                consumerType: String(customerObj.consumerType || customerObj.type || customerObj.consumerSnapshot?.consumerType || "NONE"),
                phone,
                email,
                address: String(customerObj.billedToAddress || customerObj.consumerGstAddress || customerObj.address || customerObj.addressLine1 || customerObj.location || ""),
                description: [phone, email].filter(Boolean).join(" | ") || undefined,
              };
              finalConsumerOptions.push(extraOption);
            }
          } catch (err) {
            console.error("[mfe-finance] Failed to load preselected consumer details", err);
          }
        }

        setConsumerOptions(finalConsumerOptions);
        setLocationOptions(nextLocationOptions);
        setCategoryId((current) => {
          if (current) {
            return current;
          }
          const preferredCategory =
            nextCategoryOptions.find((option: any) => Number(option.categoryId ?? option.value) > 0) ??
            nextCategoryOptions[0];
          return preferredCategory?.value || "";
        });
        setStatusId((current) => current || nextStatusOptions[0]?.value || "");
        setLocationId((current) => current || nextLocationOptions[0]?.value || defaultLocationId);
        setConsumerUid((current) => current || preselectedConsumerUid || "");
        setFinanceCatalogOptions(financeItemOptions);
        await loadDiscountOptions();
        await loadInvoiceTemplates();

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
        const nextInvoiceNumber = await fetchNextInvoiceNumber(nextInvoiceRequest);
        if (!active) return;
        if (nextInvoiceNumber) {
          setInvoiceNum(nextInvoiceNumber);
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
      const createdOption = await createInvoiceCategory(newCategoryName);
      if (createdOption) {
        setCategoryOptions((current) => [...current, createdOption]);
        setCategoryId(createdOption.value);
      }
      setNewCategoryName("");
      setShowCategoryDialog(false);
    } catch (error) {
      console.error("[mfe-finance] Failed to create category", error);
      reportFormError(error instanceof Error ? error.message : "Could not create category.");
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
      reportFormError("Discount amount is required for on-demand discount.");
      return;
    }

    clearFormError();
    setDiscountSubmitting(true);
    try {
      const tenantUid = resolveTenantUid(mfeProps.account);
      const discountValueNum = discountAmountInput.trim() ? Number(discountAmountInput) : activeDiscount?.discountValue ?? 0;
      await financeApi.invoices.applyDiscountInDetail(discountDialogItem.detailUid, buildDiscountMutationPayload({
        tenantUid: activeDiscount?.tenantUid || tenantUid || undefined,
        ...activeDiscount,
        value: discountValueNum,
        uid: activeDiscount?.uid || selectedDiscountId,
      }));
      resetDiscountDialog();
      if (id) {
        await loadInvoiceDetail(id);
      } else {
        navigateToInvoiceList();
      }
    } catch (error) {
      console.error("[mfe-finance] Failed to apply item-level discount", error);
      reportFormError(toFinanceErrorMessage(error, "Could not apply item-level discount."));
      setDiscountSubmitting(false);
    }
  }

  async function handleRemoveItemDiscount(item: InvoiceItem) {
    if (!id || !item.detailUid || !item.discountId) {
      return;
    }

    clearFormError();
    try {
      const tenantUid = resolveTenantUid(mfeProps.account);
      const discountValueNum = Number(item.discountValue ?? 0);
      const discountedAmount = Number(item.discountAmount ?? discountValueNum);
      await financeApi.invoices.removeDiscountFromDetail(item.detailUid, buildDiscountMutationPayload({
        tenantUid: tenantUid || undefined,
        name: item.discountName || "",
        calculationType: item.calculationType,
        discountType: item.discountType,
        value: discountValueNum,
        status: "INACTIVE",
        uid: item.discountId,
        discountedAmount,
      }));
      await loadInvoiceDetail(id);
    } catch (error) {
      console.error("[mfe-finance] Failed to remove item-level discount", error);
      reportFormError(toFinanceErrorMessage(error, "Could not remove item-level discount."));
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
      reportFormError("Discount amount is required for on-demand discount.");
      return;
    }

    setInvoiceDiscountSubmitting(true);
    clearFormError();
    try {
      const tenantUid = resolveTenantUid(mfeProps.account);
      const discountValueNum = invoiceDiscountAmountInput.trim() ? Number(invoiceDiscountAmountInput) : activeDiscount?.discountValue ?? 0;
      await financeApi.invoices.applyDiscount(id, buildDiscountMutationPayload({
        tenantUid: activeDiscount?.tenantUid || tenantUid || undefined,
        ...activeDiscount,
        value: discountValueNum,
        uid: activeDiscount?.uid || selectedInvoiceDiscountId,
      }));
      resetInvoiceDiscountDialog();
      if (id) {
        await loadInvoiceDetail(id);
      } else {
        navigateToInvoiceList();
      }
    } catch (error) {
      console.error("[mfe-finance] Failed to apply invoice-level discount", error);
      reportFormError(toFinanceErrorMessage(error, "Could not apply invoice-level discount."));
      setInvoiceDiscountSubmitting(false);
    }
  }

  async function handleApplyCoupon() {
    if (!id || !selectedCouponId) {
      return;
    }

    setCouponSubmitting(true);
    clearFormError();
    try {
      const activeCoupon =
        selectedCouponDetail ??
        await fetchCouponDetail(selectedCouponId, selectedCouponOption ?? null);
      const couponUid = activeCoupon?.uid || selectedCouponOption?.value || selectedCouponId;
      const couponCode = activeCoupon?.code || "";
      const couponName = activeCoupon?.name || selectedCouponOption?.label || "";

      if (!couponUid || !couponCode) {
        reportFormError("Selected coupon is incomplete. Reload coupon details and try again.");
        setCouponSubmitting(false);
        return;
      }

      const tenantUid = resolveTenantUid(mfeProps.account);
      const payload = buildCouponMutationPayload({
        ...activeCoupon,
        uid: couponUid,
        tenantUid: activeCoupon?.tenantUid || tenantUid || undefined,
        name: couponName,
        code: couponCode,
      });

      await financeApi.invoices.applyCoupon(id, payload);
      resetCouponDialog();
      if (id) {
        await loadInvoiceDetail(id);
      } else {
        navigateToInvoiceList();
      }
    } catch (error) {
      console.error("[mfe-finance] Failed to apply coupon", error);
      reportFormError(toFinanceErrorMessage(error, "Could not apply coupon."));
      setCouponSubmitting(false);
    }
  }

  async function handleRemoveInvoiceDiscount() {
    if (!id) {
      return;
    }
    clearFormError();
    try {
      const tenantUid = resolveTenantUid(mfeProps.account);
      await financeApi.invoices.removeDiscount(id, buildDiscountMutationPayload({
        ...invoiceDiscount,
        tenantUid: tenantUid || undefined,
        status: "INACTIVE",
        uid: invoiceDiscount?.uid || "",
      }));
      await loadInvoiceDetail(id);
    } catch (error) {
      console.error("[mfe-finance] Failed to remove invoice-level discount", error);
      reportFormError(toFinanceErrorMessage(error, "Could not remove invoice-level discount."));
    }
  }

  async function handleRemoveInvoiceCoupon() {
    if (!id) {
      return;
    }
    clearFormError();
    try {
      const tenantUid = resolveTenantUid(mfeProps.account);
      await financeApi.invoices.removeCoupon(id, buildCouponMutationPayload({
        ...invoiceCoupon,
        tenantUid: tenantUid || undefined,
        status: "INACTIVE",
        couponStatus: "INACTIVE",
        uid: invoiceCoupon?.uid || "",
      }));
      await loadInvoiceDetail(id);
    } catch (error) {
      console.error("[mfe-finance] Failed to remove invoice-level coupon", error);
      reportFormError(toFinanceErrorMessage(error, "Could not remove invoice-level coupon."));
    }
  }

  async function handleConfirmSaveTemplate() {
    const selectedCategoryOption = categoryOptions.find((option: any) => option.value === categoryId);
    const normalizedCategoryId = Number(selectedCategoryOption?.categoryId ?? categoryId);

    if (!templateNameInput.trim()) {
      reportFormError("Template name is required.");
      return;
    }
    if (!Number.isFinite(normalizedCategoryId) || normalizedCategoryId <= 0) {
      reportFormError("Invoice category is required to save a template.");
      return;
    }

    setTemplateSaving(true);
    clearFormError();
    try {
      await financeApi.invoices.createTemplate(buildInvoiceTemplatePayload(templateNameInput));
      setShowSaveTemplateDialog(false);
      setTemplateNameInput("");
      await loadInvoiceTemplates();
    } catch (error) {
      console.error("[mfe-finance] Failed to save invoice template", error);
      reportFormError(toFinanceErrorMessage(error, "Could not save invoice template."));
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleUseTemplate(templateUid: string) {
    try {
      const template = await fetchInvoiceTemplate(templateUid);
      if (template.categoryId) {
        setCategoryId(String(template.categoryId));
      }
      if (template.statusId) {
        setStatusId(String(template.statusId));
      }
      setInvoiceLabel(String(template.invoiceLabel ?? ""));
      setReferenceNo(String(template.referenceNo ?? ""));
      setNotesForCustomer(String(template.notesForCustomer ?? template.description ?? ""));
      setNotesForProvider(String(template.notesForProvider ?? ""));
      setTermsConditions(String(template.termsConditions ?? template.termsAndConditions ?? ""));
      setItems(mapTemplateItems(template));
      setShowTemplateChooser(false);
    } catch (error) {
      console.error("[mfe-finance] Failed to use invoice template", error);
      reportFormError(toFinanceErrorMessage(error, "Could not load invoice template."));
    }
  }

  async function handlePreviewTemplate(templateUid: string) {
    try {
      setPreviewTemplate(await fetchInvoiceTemplate(templateUid));
      setShowTemplatePreviewDialog(true);
    } catch (error) {
      console.error("[mfe-finance] Failed to preview invoice template", error);
      reportFormError(toFinanceErrorMessage(error, "Could not preview invoice template."));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFormError();

    const validationError = validateInvoiceSubmission({
      consumerName,
      categoryId,
      locationId,
      itemCount: items.length,
    });
    if (validationError) {
      reportFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildInvoiceSubmissionPayload({
        amount, categoryId, statusId, invoiceNum, invoiceDate, dueDate,
        invoiceLabel, referenceNo, selectedConsumerOption, consumerUid,
        consumerName, consumerPhone, billedToAddress, notesForProvider,
        notesForCustomer, termsConditions, locationId, locationOptions,
        currentLocation: mfeProps.location, items,
      });

      if (isEditing && id) {
        const updatePayload = buildInvoiceUpdatePayload({
          ...payload,
          invoiceDate,
          dueDate,
          invoiceLabel,
          referenceNo,
          selectedConsumerOption,
          consumerUid,
          consumerName,
          consumerPhone,
          billedToAddress,
          notesForProvider,
          notesForCustomer,
          termsConditions,
          locationId,
          locationOptions,
          currentLocation: mfeProps.location,
          items,
          originalInvoice,
        });
        await financeApi.invoices.updateGeneral(id, updatePayload);
        mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
          intent: "success",
          title: "Update Invoice",
          message: "Invoice updated successfully.",
        });
      } else {
        await financeApi.invoices.createGeneral(payload);
        mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
          intent: "success",
          title: "Create Invoice",
          message: "Invoice created successfully.",
        });
      }

      navigateToInvoiceList();
    } catch (error) {
      console.error("[mfe-finance] Failed to save invoice", error);
      const msg = toFinanceErrorMessage(error, "Could not save invoice.");
      reportFormError(msg, isEditing ? "Update Invoice" : "Create Invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return {
    mfeProps, navigate, searchParams, isEditing, navigateToInvoiceList, defaultLocationId, defaultLocationName, categoryId,
    setCategoryId, statusId, setStatusId, locationId, setLocationId, invoiceNum, setInvoiceNum, referenceNo,
    setReferenceNo, invoiceDate, setInvoiceDate, dueDate, setDueDate, invoiceLabel, setInvoiceLabel, consumerUid,
    setConsumerUid, consumerName, setConsumerName, consumerPhone, setConsumerPhone, billedToAddress, setBilledToAddress, notesForProvider,
    setNotesForProvider, notesForCustomer, setNotesForCustomer, termsConditions, setTermsConditions, amount, setAmount, categoryOptions,
    setCategoryOptions, statusOptions, setStatusOptions, locationOptions, setLocationOptions, consumerOptions, setConsumerOptions, financeCatalogOptions,
    setFinanceCatalogOptions, discountOptions, setDiscountOptions, couponOptions, setCouponOptions, invoiceTemplates, setInvoiceTemplates, items,
    setItems, editingItemId, setEditingItemId, showItemBuilder, setShowItemBuilder, newItemCatalogValue, setNewItemCatalogValue, newItemName,
    setNewItemName, newItemQty, setNewItemQty, newItemPrice, setNewItemPrice, newItemDate, setNewItemDate, showCategoryDialog,
    setShowCategoryDialog, newCategoryName, setNewCategoryName, creatingCategory, setCreatingCategory, openItemActionId, setOpenItemActionId, discountDialogItem,
    setDiscountDialogItem, selectedDiscountId, setSelectedDiscountId, selectedDiscountDetail, setSelectedDiscountDetail, discountAmountInput, setDiscountAmountInput, discountPrivateNote,
    setDiscountPrivateNote, discountDisplayNote, setDiscountDisplayNote, discountSubmitting, setDiscountSubmitting, discountLoading, setDiscountLoading, discountOptionsLoading,
    setDiscountOptionsLoading, showInvoiceDiscountDialog, setShowInvoiceDiscountDialog, showInvoiceCouponDialog, setShowInvoiceCouponDialog, selectedInvoiceDiscountId, setSelectedInvoiceDiscountId, selectedInvoiceDiscountDetail,
    setSelectedInvoiceDiscountDetail, invoiceDiscountAmountInput, setInvoiceDiscountAmountInput, invoiceDiscountSubmitting, setInvoiceDiscountSubmitting, invoiceDiscountLoading, setInvoiceDiscountLoading, selectedCouponId,
    setSelectedCouponId, selectedCouponDetail, setSelectedCouponDetail, couponLoading, setCouponLoading, couponOptionsLoading, setCouponOptionsLoading, couponSubmitting,
    setCouponSubmitting, showTemplateChooser, setShowTemplateChooser, showSaveTemplateDialog, setShowSaveTemplateDialog, showTemplatePreviewDialog, setShowTemplatePreviewDialog, templateSearch,
    setTemplateSearch, templateNameInput, setTemplateNameInput, templateLoading, setTemplateLoading, templateSaving, setTemplateSaving, previewTemplate,
    setPreviewTemplate, formError, setFormError, formSuccess, submitting, setSubmitting, loading, setLoading, preselectedConsumerUid,
    selectedCatalogOption, selectedConsumerOption, selectedDiscountOption, selectedInvoiceDiscountOption, selectedCouponOption, filteredInvoiceTemplates, nextInvoiceRequest, resetItemBuilder,
    openNewItemBuilder, openItemEditor, handleSaveItem, handleDeleteItem, resetDiscountDialog, loadDiscountOptions, loadCouponOptions, loadInvoiceTemplates, handleDiscountChange,
    handleInvoiceDiscountChange, handleCouponChange, openDiscountDialog, openInvoiceDiscountDialog, openCouponDialog, openTemplateChooser, openSaveTemplateDialog, resetInvoiceDiscountDialog,
    resetCouponDialog, buildInvoiceTemplatePayload, loadInvoiceDetail, handleCreateCategory, handleApplyItemDiscount, handleRemoveItemDiscount, handleApplyInvoiceDiscount, handleApplyCoupon,
    handleConfirmSaveTemplate, handleUseTemplate, handlePreviewTemplate, handleSubmit,
    invoiceDiscount, invoiceCoupon, invoiceTotalAmount, invoiceNetTotal, invoiceAmountDue, invoiceTotalDiscount, invoiceTotalCoupon, invoiceTotalTax,
    handleRemoveInvoiceDiscount, handleRemoveInvoiceCoupon,
  };
}
