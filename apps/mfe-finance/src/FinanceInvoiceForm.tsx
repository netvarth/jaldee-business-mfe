import { useEffect, useMemo, useRef, useState } from "react";
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
import { financeApi } from "./lib/financeApi";
import { PageShell } from "./components/FinancePageLayout";

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
  readArrayPayload,
  mapDiscountOptions,
  mapCouponOptions,
  todayIsoDate,
  formatCurrency,
  formatDisplayDate,
  readString,
  mapInvoiceItem,
} from "./features/invoices/invoiceFormModel";

import { useFinanceInvoiceFormController } from "./features/invoices/useFinanceInvoiceFormController";

export default function FinanceInvoiceForm() {
  const {
    mfeProps, navigate, searchParams, isEditing, navigateToInvoiceList, defaultLocationId, defaultLocationName, categoryId,
    setCategoryId, statusId, setStatusId, locationId, setLocationId, invoiceNum, setInvoiceNum, referenceNo,
    setReferenceNo, invoiceDate, setInvoiceDate, dueDate, setDueDate, invoiceLabel, setInvoiceLabel, consumerUid,
    setConsumerUid, consumerName, setConsumerName, consumerPhone, setConsumerPhone, billedToAddress, setBilledToAddress, notesForProvider,
    setNotesForProvider, notesForCustomer, setNotesForCustomer, termsConditions, setTermsConditions, amount, setAmount, categoryOptions,
    setCategoryOptions, statusOptions, setStatusOptions, locationOptions, setLocationOptions, sequenceDetailOptions, selectedSequenceDetailUid, setSelectedSequenceDetailUid, consumerOptions, setConsumerOptions, financeCatalogOptions,
    setFinanceCatalogOptions, discountOptions, setDiscountOptions, couponOptions, setCouponOptions, invoiceTemplates, setInvoiceTemplates, items,
    setItems, editingItemId, setEditingItemId, showItemBuilder, setShowItemBuilder, newItemCatalogValue, setNewItemCatalogValue, newItemName,
    setNewItemName, newItemQty, setNewItemQty, newItemPrice, setNewItemPrice, newItemDate, setNewItemDate, showCategoryDialog,
    setShowCategoryDialog, newCategoryName, setNewCategoryName, creatingCategory, setCreatingCategory, openItemActionId, setOpenItemActionId, discountDialogItem,
    setDiscountDialogItem, selectedDiscountId, setSelectedDiscountId, selectedDiscountDetail, setSelectedDiscountDetail, discountAmountInput, setDiscountAmountInput, discountPrivateNote,
    setDiscountPrivateNote, discountDisplayNote, setDiscountDisplayNote, discountSubmitting, setDiscountSubmitting, discountLoading, setDiscountLoading, discountOptionsLoading,
    setDiscountOptionsLoading, showInvoiceDiscountDialog, setShowInvoiceDiscountDialog, showInvoiceCouponDialog, setShowInvoiceCouponDialog, selectedInvoiceDiscountId, setSelectedInvoiceDiscountId, selectedInvoiceDiscountDetail,
    setSelectedInvoiceDiscountDetail, invoiceDiscountAmountInput, setInvoiceDiscountAmountInput, invoiceDiscountSubmitting, setInvoiceDiscountSubmitting, invoiceDiscountLoading, setInvoiceDiscountLoading, selectedCouponId,
    setSelectedCouponId, selectedCouponDetail, setSelectedCouponDetail, couponLoading, setCouponLoading, couponOptionsLoading, setCouponOptionsLoading, couponSubmitting,
    setCouponSubmitting, showTemplateChooser, setShowTemplateChooser, showSaveTemplateDialog, setShowSaveTemplateDialog, showEditTemplateDialog, setShowEditTemplateDialog, showTemplatePreviewDialog, setShowTemplatePreviewDialog, templateSearch,
    setTemplateSearch, templateNameInput, setTemplateNameInput, editingTemplateUid, templateEditSubject, setTemplateEditSubject, templateEditNotesForProvider, setTemplateEditNotesForProvider, templateEditNotesForCustomer, setTemplateEditNotesForCustomer, templateEditTermsConditions, setTemplateEditTermsConditions, templateEditItems, deletingTemplateUid, deletingTemplateName, deleteTemplateSubmitting, templateLoading, setTemplateLoading, templateSaving, setTemplateSaving, previewTemplate,
    setPreviewTemplate, formError, setFormError, formSuccess, submitting, setSubmitting, loading, setLoading, preselectedConsumerUid,
    selectedCatalogOption, selectedConsumerOption, selectedDiscountOption, selectedInvoiceDiscountOption, selectedCouponOption, filteredInvoiceTemplates, nextInvoiceRequest, resetItemBuilder,
    openNewItemBuilder, openItemEditor, handleSaveItem, handleDeleteItem, resetDiscountDialog, loadDiscountOptions, loadCouponOptions, loadInvoiceTemplates, handleDiscountChange,
    handleInvoiceDiscountChange, handleCouponChange, openDiscountDialog, openInvoiceDiscountDialog, openCouponDialog, openTemplateChooser, openSaveTemplateDialog, resetInvoiceDiscountDialog,
    resetCouponDialog, buildInvoiceTemplatePayload, loadInvoiceDetail, handleCreateCategory, handleApplyItemDiscount, handleRemoveItemDiscount, handleApplyInvoiceDiscount, handleApplyCoupon,
    handleConfirmSaveTemplate, openEditTemplateDialog, closeEditTemplateDialog, addTemplateEditItem, removeTemplateEditItem, handleUpdateTemplate, openDeleteTemplateDialog, resetDeleteTemplateDialog, handleDeleteTemplate, handleUseTemplate, handlePreviewTemplate, handleSubmit,
    invoiceDiscount, invoiceCoupon, invoiceTotalAmount, invoiceNetTotal, invoiceAmountDue, invoiceTotalDiscount, invoiceTotalCoupon, invoiceTotalTax,
    handleRemoveInvoiceDiscount, handleRemoveInvoiceCoupon, handleSequenceDetailFieldFocus,
  } = useFinanceInvoiceFormController();
  const [templateChooserPage, setTemplateChooserPage] = useState(1);
  const [templateDraftMode, setTemplateDraftMode] = useState<"idle" | "add" | "edit">("idle");
  const [templateDraftEditingItemId, setTemplateDraftEditingItemId] = useState("");
  const [templateDraftCatalogValue, setTemplateDraftCatalogValue] = useState("");
  const [templateDraftQty, setTemplateDraftQty] = useState(1);
  const [templateDraftPrice, setTemplateDraftPrice] = useState(0);
  const [isTemplateItemDropdownOpen, setIsTemplateItemDropdownOpen] = useState(false);
  const [showBillingAddress, setShowBillingAddress] = useState(Boolean(String(billedToAddress || "").trim()));
  const templateItemDropdownRef = useRef<HTMLDivElement | null>(null);
  const templateChooserPageSize = 10;
  const previewTemplateDetails = Array.isArray(previewTemplate?.detailList)
    ? previewTemplate.detailList
    : Array.isArray(previewTemplate?.details)
      ? previewTemplate.details
      : [];
  const previewTemplateSubject = String(previewTemplate?.invoiceLabel ?? previewTemplate?.subject ?? "");
  const previewTemplateNotesForProvider = String(
    previewTemplate?.notesForProvider ?? previewTemplate?.notes ?? previewTemplate?.privateNote ?? ""
  );
  const previewTemplateNotesForCustomer = String(
    previewTemplate?.notesForCustomer ?? previewTemplate?.customerNote ?? previewTemplate?.sharedNote ?? ""
  );
  const previewTemplateTermsConditions = String(
    previewTemplate?.termsConditions ?? previewTemplate?.termsAndConditions ?? ""
  );
  const templateChooserTotalPages = Math.max(1, Math.ceil(filteredInvoiceTemplates.length / templateChooserPageSize));
  const paginatedInvoiceTemplates = useMemo(
    () => filteredInvoiceTemplates.slice((templateChooserPage - 1) * templateChooserPageSize, templateChooserPage * templateChooserPageSize),
    [filteredInvoiceTemplates, templateChooserPage]
  );
  const selectedTemplateDraftOption = useMemo(
    () => financeCatalogOptions.find((option) => option.value === templateDraftCatalogValue),
    [financeCatalogOptions, templateDraftCatalogValue]
  );
  const selectedEditingInvoiceItem = useMemo(
    () => items.find((item) => item.id === editingItemId) || null,
    [items, editingItemId]
  );
  const canEditSelectedItemRate = useMemo(
    () => selectedCatalogOption?.rateEditable ?? selectedEditingInvoiceItem?.rateEditable ?? true,
    [selectedCatalogOption, selectedEditingInvoiceItem]
  );
  const selectedTemplateDraftEditingItem = useMemo(
    () => templateEditItems.find((item) => item.id === templateDraftEditingItemId) || null,
    [templateEditItems, templateDraftEditingItemId]
  );
  const canEditTemplateDraftRate = useMemo(
    () => selectedTemplateDraftOption?.rateEditable ?? selectedTemplateDraftEditingItem?.rateEditable ?? true,
    [selectedTemplateDraftOption, selectedTemplateDraftEditingItem]
  );
  const financeCatalogNameOptions = useMemo(
    () => financeCatalogOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
    [financeCatalogOptions]
  );
  const templateItemColumns = "minmax(0,1.8fr) 90px 110px 110px 90px";
  const templateDraftColumns = "minmax(0,1.8fr) 90px 110px 110px 90px";

  useEffect(() => {
    setTemplateChooserPage(1);
  }, [templateSearch, showTemplateChooser]);

  useEffect(() => {
    if (!showEditTemplateDialog) {
      setTemplateDraftMode("idle");
      setTemplateDraftEditingItemId("");
      setTemplateDraftCatalogValue("");
      setTemplateDraftQty(1);
      setTemplateDraftPrice(0);
    }
  }, [showEditTemplateDialog]);

  useEffect(() => {
    if (!isTemplateItemDropdownOpen) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (!templateItemDropdownRef.current?.contains(target)) {
        setIsTemplateItemDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    };
  }, [isTemplateItemDropdownOpen]);

  useEffect(() => {
    if (templateChooserPage > templateChooserTotalPages) {
      setTemplateChooserPage(templateChooserTotalPages);
    }
  }, [templateChooserPage, templateChooserTotalPages]);

  useEffect(() => {
    if (String(billedToAddress || "").trim()) {
      setShowBillingAddress(true);
    }
  }, [billedToAddress]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading invoice form...</div>;
  }

  return (
    <>
      <PageShell
        title={isEditing ? "Edit Invoice" : "Create Invoice"}
        subtitle={isEditing ? "Modify an existing invoice." : "Issue new billing manually."}
        back={{ label: "Back to Invoices", href: "/invoice" }}
        onNavigate={navigateToInvoiceList}
      >
        <SectionCard className="border-slate-200 shadow-sm">
          <form className="grid gap-6" data-testid="finance-invoice-form" onSubmit={handleSubmit}>
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
                />
              </div>
              <Input label="Customer Name *" value={consumerName} onChange={(event) => setConsumerName(event.target.value)} required />
              <Input label="Customer Phone" value={consumerPhone} onChange={(event) => setConsumerPhone(event.target.value)} />
            </div>

            {!showBillingAddress ? (
              <button
                type="button"
                className="w-fit text-sm font-semibold text-[var(--color-primary)]"
                onClick={() => setShowBillingAddress(true)}
              >
                + Billing Address
              </button>
            ) : (
              <Textarea
                label="Billing Address"
                value={billedToAddress}
                onChange={(event) => setBilledToAddress(event.target.value)}
                placeholder="Add customer billing address"
              />
            )}

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
                    setSelectedSequenceDetailUid("");
                    setInvoiceNum("");
                  }
                }}
                options={[{ value: "", label: "Select location" }, ...locationOptions]}
              />

              <Select
                label="Sequence Detail"
                value={selectedSequenceDetailUid}
                onFocus={() => {
                  void handleSequenceDetailFieldFocus();
                }}
                onChange={(event) => {
                  setSelectedSequenceDetailUid(event.target.value);
                  if (!isEditing) {
                    setInvoiceNum("");
                  }
                }}
                options={[
                  {
                    value: "",
                    label: sequenceDetailOptions.length ? "Select sequence detail" : "No sequence details available",
                  },
                  ...sequenceDetailOptions,
                ]}
              />

              <Input
                label="Invoice#"
                value={invoiceNum}
                onFocus={() => {
                  void handleSequenceDetailFieldFocus();
                }}
                onChange={(event) => setInvoiceNum(event.target.value)}
              />
              <Input label="Referral Number" value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Referral Number" />

              <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
              <Input label="Due Date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>

            {invoiceTemplates.length > 0 ? (
              <div className="flex justify-start">
                <Button type="button" data-testid="finance-invoice-template-choose" onClick={() => void openTemplateChooser()}>
                  Choose Invoice Template
                </Button>
              </div>
            ) : null}

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
                <div className="flex items-center gap-2">
                  {/* <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-xl bg-cyan-100 text-cyan-900 hover:bg-cyan-200 font-semibold"
                  onClick={openNewItemBuilder}
                >
                  + Add Procedure/Item
                </Button> */}
                  {isEditing && (
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
                        <Button variant="ghost" size="sm" className="justify-start font-normal" onClick={() => void openInvoiceDiscountDialog()}>
                          Apply Discount
                        </Button>
                        <Button variant="ghost" size="sm" className="justify-start font-normal" onClick={() => void openCouponDialog()}>
                          Apply Coupon
                        </Button>
                      </div>
                    </Popover>
                  )}
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-slate-200 bg-white md:hidden">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    No items added yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <div key={item.id} className="space-y-3 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{formatDisplayDate(item.date)}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.discountApplicable === false && (
                                <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                                  Discount Disabled
                                </span>
                              )}
                              {item.couponCode && (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                  Coupon: {item.couponCode}
                                </span>
                              )}
                            </div>
                          </div>
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
                                className="h-8 w-8 shrink-0 p-0"
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
                                  handleDeleteItem(item.id);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </Popover>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <div className="text-xs text-slate-500">Price</div>
                            <div className="font-medium text-slate-900">{formatCurrency(item.price)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Qty</div>
                            <div className="font-medium text-slate-900">{item.qty}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Discount</div>
                            <div className="font-medium text-slate-900">{formatCurrency(item.discountAmount ?? 0)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">After Discount</div>
                            <div className="font-medium text-slate-900">{formatCurrency(item.afterDiscount ?? item.price * item.qty)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Tax</div>
                            <div className="font-medium text-slate-900">{formatCurrency(item.taxAmount ?? 0)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Total</div>
                            <div className="font-semibold text-slate-900">{formatCurrency(item.totalAmount ?? item.price * item.qty)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-5 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                <table className="w-full min-w-[850px] border-collapse text-left">
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
                            {item.couponCode && (
                              <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                Coupon: {item.couponCode}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">{formatDisplayDate(item.date)}</td>
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
                                    handleDeleteItem(item.id);
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
                      options={financeCatalogNameOptions}
                      value={newItemCatalogValue}
                      onValueChange={(value) => {
                        setNewItemCatalogValue(value);
                        const option = financeCatalogOptions.find((entry) => entry.value === value);
                        if (!option) return;
                        setNewItemName(option.label);
                        setNewItemPrice(option.price ?? 0);
                      }}
                      id="invoice-item-picker"
                    />
                  </div>

                  <Input label="Qty" type="number" min="1" value={newItemQty} onChange={(event) => setNewItemQty(Number(event.target.value) || 1)} />
                  <Input
                    label="Price (INR)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItemPrice}
                    disabled={!canEditSelectedItemRate}
                    onChange={(event) => setNewItemPrice(Number(event.target.value) || 0)}
                  />
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
                        setShowItemBuilder(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                className="px-4"
                onClick={openNewItemBuilder}
              >
                Add Procedure/Item
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Input
                  label="Your Notes"
                  value={notesForProvider}
                  onChange={(event) => setNotesForProvider(event.target.value)}
                  placeholder="Private Note"
                />
                <Input
                  label="Patient Notes"
                  value={notesForCustomer}
                  onChange={(event) => setNotesForCustomer(event.target.value)}
                  placeholder="Shared with patient"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-5 space-y-4 text-sm text-slate-600 shadow-sm self-start">
                <div className="grid grid-cols-[1fr_auto_28px] items-center gap-y-3.5">
                  
                  {/* Total Amount Row */}
                  <span className="font-semibold text-slate-700">Total Amount</span>
                  <span className="font-bold text-slate-900 text-right">{formatCurrency(invoiceTotalAmount)}</span>
                  <div className="w-7" />

                  {/* Net Total Row */}
                  <span className="font-bold text-slate-800">Net Total</span>
                  <span className="font-bold text-slate-950 text-right">{formatCurrency(invoiceNetTotal)}</span>
                  <div className="w-7" />

                  {/* Invoice Level Discount Row */}
                  {invoiceDiscount && (
                    <>
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100 w-fit">
                        Discount: {invoiceDiscount.name}
                      </span>
                      <span className="font-bold text-rose-600 text-right">
                        (-) {formatCurrency(invoiceTotalDiscount)}
                      </span>
                      <button
                        type="button"
                        className="flex items-center justify-center h-7 w-7 rounded-lg text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition"
                        onClick={() => void handleRemoveInvoiceDiscount()}
                        aria-label="Remove invoice discount"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Invoice Level Coupon Row */}
                  {invoiceCoupon && (
                    <>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 w-fit">
                        Coupon: {invoiceCoupon.code}
                      </span>
                      <span className="font-bold text-emerald-600 text-right">
                        (-) {formatCurrency(invoiceTotalCoupon)}
                      </span>
                      <button
                        type="button"
                        className="flex items-center justify-center h-7 w-7 rounded-lg text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600 transition"
                        onClick={() => void handleRemoveInvoiceCoupon()}
                        aria-label="Remove invoice coupon"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Total Tax Row */}
                  {invoiceTotalTax > 0 && (
                    <>
                      <span className="font-semibold text-slate-700">Total Tax</span>
                      <span className="font-bold text-slate-900 text-right">{formatCurrency(invoiceTotalTax)}</span>
                      <div className="w-7" />
                    </>
                  )}

                  {/* Divider */}
                  <div className="col-span-3 border-b border-slate-200/60 my-1" />

                  {/* Amount Due Card */}
                  <div className="col-span-3 mt-2 rounded-lg border border-[color:var(--color-primary-soft,#dbeafe)] bg-[color:var(--color-primary-softest,#eff6ff)] p-3.5">
                    <div className="grid grid-cols-[1fr_auto_28px] items-center">
                      <span className="text-base font-bold text-[var(--color-primary)]">Amount Due</span>
                      <span className="text-lg font-extrabold text-[var(--color-primary)] text-right">{formatCurrency(invoiceAmountDue)}</span>
                      <div className="w-7" />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <Input
              label="Terms & Conditions"
              value={termsConditions}
              onChange={(event) => setTermsConditions(event.target.value)}
              placeholder="Terms and condition"
            />

            {formSuccess ? (
              <div className="rounded-[var(--radius-control)] bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {formSuccess}
              </div>
            ) : null}

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
                <Button type="submit" data-testid="finance-invoice-submit" disabled={submitting}>
                  {submitting ? "Saving..." : isEditing ? "Update Invoice" : "Save"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" data-testid="finance-invoice-template-save" onClick={openSaveTemplateDialog} disabled={items.length === 0}>
                  Save As Template
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      </PageShell>

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

      <Dialog open={showSaveTemplateDialog} onClose={() => setShowSaveTemplateDialog(false)} title="Save Invoice Template" size="md">
        <div className="grid gap-5 pt-2">
          <Input
            label="Template Name *"
            value={templateNameInput}
            onChange={(event) => setTemplateNameInput(event.target.value.slice(0, 25))}
            placeholder="Enter template name"
            maxLength={25}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleConfirmSaveTemplate()} disabled={templateSaving || !templateNameInput.trim()}>
              {templateSaving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={showTemplateChooser} onClose={() => setShowTemplateChooser(false)} title={`Invoice Templates (${invoiceTemplates.length})`} size="lg">
        <div className="grid gap-5 pt-2">
          <div className="flex items-center gap-0">
            <Input
              label=""
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="Search Template"
              containerClassName="flex-1"
              className="rounded-r-none border-r-0"
            />
            <Button
              type="button"
              className="h-[38px] rounded-l-none px-5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
              aria-label="Search template"
            >
              <Icon name="search" className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_340px] border-b border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-800">
              <div>Template Name</div>
              <div>Actions</div>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
              {templateLoading ? (
                <div className="p-8 text-center text-slate-500">Loading templates...</div>
              ) : filteredInvoiceTemplates.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No templates found.</div>
              ) : (
                paginatedInvoiceTemplates.map((template) => (
                  <div
                    key={template.uid}
                    className="grid grid-cols-[minmax(0,1fr)_340px] items-center px-4 py-3 hover:bg-slate-50/50 transition"
                  >
                    <div className="truncate pr-4 text-sm font-medium text-slate-800" title={template.templateName}>
                      {template.templateName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 min-w-[118px] rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                        onClick={() => void handleUseTemplate(template.uid)}
                      >
                        Use Template
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 min-w-[62px] rounded-md border-slate-200 px-4 text-sm font-medium text-slate-700"
                        onClick={() => void handlePreviewTemplate(template.uid)}
                      >
                        View
                      </Button>
                      <Popover
                        placement="bottom"
                        align="end"
                        trigger={(
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 w-14 rounded-md border-slate-200 p-0"
                            aria-label={`Actions for ${template.templateName}`}
                          >
                            <Icon name="moreVertical" className="h-4 w-4 rotate-90" />
                          </Button>
                        )}
                      >
                        <div className="grid min-w-[180px] p-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start font-normal text-slate-700"
                            onClick={() => void openEditTemplateDialog(template.uid)}
                            icon={<Icon name="pencil" className="h-4 w-4 text-slate-500" />}
                          >
                            Edit Template
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="justify-start font-normal text-slate-700"
                            onClick={() => openDeleteTemplateDialog(template.uid, template.templateName)}
                            icon={<Icon name="trash" className="h-4 w-4 text-slate-500" />}
                          >
                            Delete Template
                          </Button>
                        </div>
                      </Popover>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!templateLoading && filteredInvoiceTemplates.length > 0 ? (
              <div className="flex items-center justify-center gap-2 border-t border-slate-200 px-4 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-w-[40px] px-2 text-slate-500"
                  onClick={() => setTemplateChooserPage(1)}
                  disabled={templateChooserPage === 1}
                >
                  {"<<"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-w-[40px] px-2 text-slate-500"
                  onClick={() => setTemplateChooserPage((current) => Math.max(1, current - 1))}
                  disabled={templateChooserPage === 1}
                >
                  {"<"}
                </Button>
                <div className="flex h-10 min-w-[40px] items-center justify-center rounded-full bg-indigo-50 px-4 text-sm font-semibold text-indigo-700">
                  {templateChooserPage}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-w-[40px] px-2 text-slate-500"
                  onClick={() => setTemplateChooserPage((current) => Math.min(templateChooserTotalPages, current + 1))}
                  disabled={templateChooserPage >= templateChooserTotalPages}
                >
                  {">"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 min-w-[40px] px-2 text-slate-500"
                  onClick={() => setTemplateChooserPage(templateChooserTotalPages)}
                  disabled={templateChooserPage >= templateChooserTotalPages}
                >
                  {">>"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Dialog>

      <Dialog open={showTemplatePreviewDialog} onClose={() => setShowTemplatePreviewDialog(false)} title={previewTemplate?.templateName || "Template"} size="lg">
        <div className="max-h-[82vh] overflow-y-auto pt-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="grid gap-5">
              <Input label="Subject" value={previewTemplateSubject} disabled />

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
                <div className="grid grid-cols-[minmax(0,1.6fr)_140px_140px_140px] gap-3 border-b border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-800">
                  <div>Item Details</div>
                  <div>Quantity</div>
                  <div>Rate</div>
                  <div>Amount</div>
                </div>
                <div className="bg-white">
                  {previewTemplateDetails.length > 0 ? (
                    previewTemplateDetails.map((detail: any, index: number) => {
                      const quantity = Number(detail.quantity ?? detail.qty ?? 0);
                      const price = Number(detail.price ?? detail.netRate ?? detail.rate ?? 0);
                      return (
                        <div
                          key={detail.uid ?? `preview-detail-${index}`}
                          className="grid grid-cols-[minmax(0,1.6fr)_140px_140px_140px] gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0"
                        >
                          <Input value={String(detail.itemName ?? detail.name ?? "")} disabled />
                          <Input value={String(quantity)} disabled />
                          <Input value={String(price)} disabled />
                          <div className="flex items-center text-sm font-semibold text-slate-900">
                            {formatCurrency(quantity * price)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">No template items found.</div>
                  )}
                </div>
              </div>

              <Input label="Your Notes" value={previewTemplateNotesForProvider} disabled />
              <Input label="Notes For Customer" value={previewTemplateNotesForCustomer} disabled />
              <Input label="Terms & Conditions" value={previewTemplateTermsConditions} disabled />
            </div>
          </div>
        </div>
      </Dialog>

      {/* Edit Invoice Template Dialog */}
      <Dialog open={showEditTemplateDialog} onClose={() => { setIsTemplateItemDropdownOpen(false); closeEditTemplateDialog(); }} title="Edit Invoice Template" size="lg">
        <div className="max-h-[86vh] overflow-y-auto pt-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="grid gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Template Name</label>
                <Input
                  value={templateNameInput}
                  onChange={(event) => setTemplateNameInput(event.target.value.slice(0, 25))}
                  placeholder="hjh"
                  maxLength={25}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Subject</label>
                <Input
                  value={templateEditSubject}
                  onChange={(event) => setTemplateEditSubject(event.target.value)}
                  placeholder="Let your patient know what this invoice is for"
                />
              </div>

              {/* Procedure / Item Section Container */}
              <div className="rounded-xl border border-slate-200 bg-[#f0f4f8] p-5">
                {templateDraftMode !== "idle" ? (
                  <div className="mb-5 pb-4 border-b border-slate-200">
                    <div
                      className="grid gap-3 items-end"
                      style={{ gridTemplateColumns: templateDraftColumns }}
                    >
                      <div ref={templateItemDropdownRef} className="relative min-w-0">
                        <label className="block text-sm font-bold text-slate-800 mb-1.5 truncate">
                          Procedure/Item <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (templateDraftMode === "edit") {
                              return;
                            }
                            setIsTemplateItemDropdownOpen(!isTemplateItemDropdownOpen);
                          }}
                          className="flex h-10 w-full items-center justify-between rounded border border-slate-300 bg-white px-3.5 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          disabled={templateDraftMode === "edit"}
                        >
                          <span className={selectedTemplateDraftOption ? "text-slate-900 font-medium truncate" : "text-slate-400 truncate"}>
                            {selectedTemplateDraftOption?.label || "Choose Procedure/Item"}
                          </span>
                          {templateDraftMode === "edit" ? null : (
                            <Icon name="chevronDown" className="ml-1 h-4 w-4 shrink-0 text-slate-400" />
                          )}
                        </button>
                        {isTemplateItemDropdownOpen && templateDraftMode !== "edit" ? (
                          <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                            {financeCatalogOptions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-slate-500">No matching items found</div>
                            ) : (
                              financeCatalogOptions.map((option) => (
                                <div
                                  key={option.value}
                                  className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                                  onClick={() => {
                                    setTemplateDraftCatalogValue(option.value);
                                    setTemplateDraftPrice(Number(option.price ?? 0));
                                    setIsTemplateItemDropdownOpen(false);
                                  }}
                                >
                                  {option.label}
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1.5 text-center">Qty</label>
                        <Input
                          type="number"
                          min="1"
                          className="text-center"
                          value={String(templateDraftQty)}
                          onChange={(event) => setTemplateDraftQty(Math.max(Number(event.target.value) || 1, 1))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-1.5 text-center">Price(₹)</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-center"
                          value={String(templateDraftPrice)}
                          disabled={!canEditTemplateDraftRate}
                          onChange={(event) => setTemplateDraftPrice(Math.max(Number(event.target.value) || 0, 0))}
                        />
                      </div>

                      <div>
                        <Button
                          type="button"
                          className="h-10 w-full rounded bg-[#312e81] px-2 font-bold uppercase text-xs text-white hover:bg-[#2e2a72] disabled:opacity-50 transition-colors shadow-sm"
                          onClick={() => {
                            if (!selectedTemplateDraftOption) return;
                            addTemplateEditItem({
                              editingItemId: templateDraftMode === "edit" ? templateDraftEditingItemId : null,
                              catalogValue: selectedTemplateDraftOption.value,
                              name: selectedTemplateDraftOption.label,
                              quantity: templateDraftQty,
                              price: templateDraftPrice,
                            });
                            setTemplateDraftMode("idle");
                            setTemplateDraftEditingItemId("");
                            setTemplateDraftCatalogValue("");
                            setTemplateDraftQty(1);
                            setTemplateDraftPrice(0);
                            setIsTemplateItemDropdownOpen(false);
                          }}
                          disabled={!selectedTemplateDraftOption}
                        >
                          {templateDraftMode === "edit" ? "CHANGE" : "ADD"}
                        </Button>
                      </div>

                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-full rounded bg-slate-200 border-none px-2 font-bold uppercase text-xs text-slate-700 hover:bg-slate-300 transition-colors"
                          onClick={() => {
                            setTemplateDraftMode("idle");
                            setTemplateDraftEditingItemId("");
                            setTemplateDraftCatalogValue("");
                            setTemplateDraftQty(1);
                            setTemplateDraftPrice(0);
                            setIsTemplateItemDropdownOpen(false);
                          }}
                        >
                          CANCEL
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Table Header inside Procedure/Item Card */}
                <div
                  className="grid gap-3 border-b border-slate-300 pb-3 text-xs font-bold uppercase tracking-wider text-slate-900"
                  style={{ gridTemplateColumns: templateItemColumns }}
                >
                  <div className="min-w-0" />
                  <div className="text-center">QUANTITY</div>
                  <div className="text-center">RATE</div>
                  <div className="text-left">AMOUNT</div>
                  <div />
                </div>

                {/* Table Rows inside Procedure/Item Card */}
                <div className="divide-y divide-slate-200">
                  {templateEditItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">
                      No procedure/items added yet. Click "+ Add Procedure/Item" below.
                    </div>
                  ) : (
                    templateEditItems.map((item) => {
                      const matchingOption = financeCatalogOptions.find(
                        (entry) => entry.value === item.itemUid || entry.itemUid === item.itemUid || entry.label === item.name
                      );
                      const displayName = String(item.name || matchingOption?.label || "-");
                      const totalAmt = Number(item.qty) * Number(item.price);

                      return (
                        <div
                          key={item.id}
                          className="grid gap-3 items-center py-3"
                          style={{ gridTemplateColumns: templateItemColumns }}
                        >
                          <div className="truncate font-semibold text-slate-800 text-sm" title={displayName}>
                            {displayName}
                          </div>
                          <Input value={String(item.qty)} disabled className="bg-white text-center font-medium" />
                          <Input value={String(item.price)} disabled className="bg-white text-center font-medium" />
                          <div className="font-bold text-slate-900 text-sm">
                            {formatCurrency(totalAmt)}
                          </div>
                          <div className="flex justify-center">
                            <Popover
                              placement="bottom"
                              align="end"
                              trigger={(
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 w-full p-0 text-slate-700 hover:bg-transparent font-bold shadow-none"
                                  aria-label={`Actions for ${displayName}`}
                                >
                                  <span className="text-lg font-semibold leading-none">...</span>
                                </Button>
                              )}
                            >
                              <div className="grid min-w-[150px] p-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start font-normal text-slate-700"
                                  onClick={() => {
                                    setTemplateDraftMode("edit");
                                    setTemplateDraftEditingItemId(item.id);
                                    setTemplateDraftCatalogValue(matchingOption?.value ?? "");
                                    setTemplateDraftQty(Math.max(Number(item.qty) || 1, 1));
                                    setTemplateDraftPrice(Math.max(Number(item.price) || 0, 0));
                                    setIsTemplateItemDropdownOpen(false);
                                  }}
                                  icon={<Icon name="pencil" className="h-4 w-4 text-slate-500" />}
                                >
                                  Edit Item
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start font-normal text-slate-700"
                                  onClick={() => {
                                    void removeTemplateEditItem(item.id);
                                  }}
                                  icon={<Icon name="trash" className="h-4 w-4 text-slate-500" />}
                                >
                                  Delete Item
                                </Button>
                              </div>
                            </Popover>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Procedure/Item Button */}
                <div className="pt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setTemplateDraftMode("add");
                      setTemplateDraftEditingItemId("");
                      setTemplateDraftCatalogValue("");
                      setTemplateDraftQty(1);
                      setTemplateDraftPrice(0);
                      setIsTemplateItemDropdownOpen(false);
                    }}
                    icon={<Icon name="plus" className="h-4 w-4" />}
                    className="rounded px-4"
                  >
                    Add Procedure/Item
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Your Notes</label>
                <Input
                  value={templateEditNotesForProvider}
                  onChange={(event) => setTemplateEditNotesForProvider(event.target.value)}
                  placeholder="Private Note"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Notes For Customer</label>
                <Input
                  value={templateEditNotesForCustomer}
                  onChange={(event) => setTemplateEditNotesForCustomer(event.target.value)}
                  placeholder="Shared with patient"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Terms & Conditions</label>
                <Input
                  value={templateEditTermsConditions}
                  onChange={(event) => setTemplateEditTermsConditions(event.target.value)}
                  placeholder="Terms and condition"
                />
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  className="min-w-[200px] rounded-md bg-[#059669] px-6 py-3 text-sm font-bold text-white hover:bg-[#047857] shadow transition-colors"
                  onClick={() => void handleUpdateTemplate()}
                  disabled={templateSaving || !templateNameInput.trim()}
                >
                  {templateSaving ? "Updating..." : "Update Invoice Template"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Delete Invoice Template Dialog */}
      <Dialog open={Boolean(deletingTemplateUid)} onClose={resetDeleteTemplateDialog} title="Delete Invoice Template" size="sm">
        <div className="grid gap-5 pt-2">
          <div className="text-sm text-slate-600">
            Delete template <span className="font-semibold text-slate-900">{deletingTemplateName || "this template"}</span>?
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetDeleteTemplateDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteTemplate()}
              disabled={deleteTemplateSubmitting}
            >
              {deleteTemplateSubmitting ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </>
  );
}
