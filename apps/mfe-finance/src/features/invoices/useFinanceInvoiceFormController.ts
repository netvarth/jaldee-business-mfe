import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
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
import { buildInvoiceSubmissionPayload, validateInvoiceSubmission } from "./invoiceSubmission";
import { loadInvoiceFormOptions } from "./invoiceFormLoader";
import { fetchCouponOptions, fetchDiscountOptions, fetchInvoiceTemplates } from "./invoiceAdjustmentLoader";
import { fetchInvoiceTemplate, mapTemplateItems } from "./invoiceTemplateDetail";
import { buildCouponMutationPayload, buildDiscountMutationPayload, resolveTenantUid } from "./invoiceAdjustmentPayloads";
import { createInvoiceCategory, fetchNextInvoiceNumber } from "./invoiceReferenceService";
import { saveInvoiceItem } from "./invoiceItemBuilder";
import { useInvoiceAdjustmentDetails } from "./useInvoiceAdjustmentDetails";


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

  async function openTemplateChooser() {
    setShowTemplateChooser(true);
    setTemplateSearch("");
    setFormError("");
    await loadInvoiceTemplates();
  }

  function openSaveTemplateDialog() {
    if (items.length === 0) {
      setFormError("Add at least one item before saving as template.");
      return;
    }
    setTemplateNameInput(invoiceLabel.trim() || "Invoice Template");
    setShowSaveTemplateDialog(true);
    setFormError("");
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
    setSelectedDiscountDetail, setDiscountAmountInput, setFormError,
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
        setConsumerOptions(nextConsumerOptions);
        setLocationOptions(nextLocationOptions);
        setCategoryId((current) => current || nextCategoryOptions[0]?.value || "");
        setStatusId((current) => current || nextStatusOptions[0]?.value || "");
        setLocationId((current) => current || nextLocationOptions[0]?.value || defaultLocationId);
        setConsumerUid((current) => current || preselectedConsumerUid || "");
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
      const tenantUid = resolveTenantUid(mfeProps.account);
      const discountValueNum = discountAmountInput.trim() ? Number(discountAmountInput) : activeDiscount?.discountValue ?? 0;
      await financeApi.invoices.applyDiscountInDetail(discountDialogItem.detailUid, buildDiscountMutationPayload({
        tenantUid: activeDiscount?.tenantUid || tenantUid || undefined,
        ...activeDiscount,
        value: discountValueNum,
        uid: activeDiscount?.uid || selectedDiscountId,
      }));
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
      const tenantUid = resolveTenantUid(mfeProps.account);
      const discountValueNum = invoiceDiscountAmountInput.trim() ? Number(invoiceDiscountAmountInput) : activeDiscount?.discountValue ?? 0;
      await financeApi.invoices.applyDiscount(id, buildDiscountMutationPayload({
        tenantUid: activeDiscount?.tenantUid || tenantUid || undefined,
        ...activeDiscount,
        value: discountValueNum,
        uid: activeDiscount?.uid || selectedInvoiceDiscountId,
      }));
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
      const tenantUid = resolveTenantUid(mfeProps.account);
      await financeApi.invoices.applyCoupon(id, buildCouponMutationPayload({
        ...activeCoupon,
        uid: couponUid,
        tenantUid: activeCoupon?.tenantUid || tenantUid || undefined,
        name: couponName,
        code: couponCode,
      }));
      resetCouponDialog();
      navigateToInvoiceList();
    } catch (error) {
      console.error("[mfe-finance] Failed to apply invoice-level coupon", error);
      setFormError(error instanceof Error ? error.message : "Could not apply invoice-level coupon.");
      setCouponSubmitting(false);
    }
  }

  async function handleConfirmSaveTemplate() {
    if (!templateNameInput.trim()) {
      setFormError("Template name is required.");
      return;
    }

    setTemplateSaving(true);
    setFormError("");
    try {
      await financeApi.invoices.createTemplate(buildInvoiceTemplatePayload(templateNameInput));
      setShowSaveTemplateDialog(false);
      setTemplateNameInput("");
      await loadInvoiceTemplates();
    } catch (error) {
      console.error("[mfe-finance] Failed to save invoice template", error);
      setFormError(error instanceof Error ? error.message : "Could not save invoice template.");
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
      setTermsConditions(String(template.termsConditions ?? ""));
      setItems(mapTemplateItems(template));
      setShowTemplateChooser(false);
    } catch (error) {
      console.error("[mfe-finance] Failed to use invoice template", error);
      setFormError(error instanceof Error ? error.message : "Could not load invoice template.");
    }
  }

  async function handlePreviewTemplate(templateUid: string) {
    try {
      setPreviewTemplate(await fetchInvoiceTemplate(templateUid));
      setShowTemplatePreviewDialog(true);
    } catch (error) {
      console.error("[mfe-finance] Failed to preview invoice template", error);
      setFormError(error instanceof Error ? error.message : "Could not preview invoice template.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const validationError = validateInvoiceSubmission({
      consumerName,
      categoryId,
      locationId,
      itemCount: items.length,
    });
    if (validationError) {
      setFormError(validationError);
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
    setPreviewTemplate, formError, setFormError, submitting, setSubmitting, loading, setLoading, preselectedConsumerUid,
    selectedCatalogOption, selectedConsumerOption, selectedDiscountOption, selectedInvoiceDiscountOption, selectedCouponOption, filteredInvoiceTemplates, nextInvoiceRequest, resetItemBuilder,
    openNewItemBuilder, openItemEditor, handleSaveItem, resetDiscountDialog, loadDiscountOptions, loadCouponOptions, loadInvoiceTemplates, handleDiscountChange,
    handleInvoiceDiscountChange, handleCouponChange, openDiscountDialog, openInvoiceDiscountDialog, openCouponDialog, openTemplateChooser, openSaveTemplateDialog, resetInvoiceDiscountDialog,
    resetCouponDialog, buildInvoiceTemplatePayload, loadInvoiceDetail, handleCreateCategory, handleApplyItemDiscount, handleRemoveItemDiscount, handleApplyInvoiceDiscount, handleApplyCoupon,
    handleConfirmSaveTemplate, handleUseTemplate, handlePreviewTemplate, handleSubmit,
  };
}
