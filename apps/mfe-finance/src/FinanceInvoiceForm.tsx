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
    handleConfirmSaveTemplate, handleUseTemplate, handlePreviewTemplate, handleSubmit, handleRemoveItemCoupon,
    invoiceDiscount, invoiceCoupon, invoiceTotalAmount, invoiceNetTotal, invoiceAmountDue, invoiceTotalDiscount, invoiceTotalCoupon, invoiceTotalTax,
    handleRemoveInvoiceDiscount, handleRemoveInvoiceCoupon,
  } = useFinanceInvoiceFormController();

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
                                {isEditing && !item.couponId ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start font-normal"
                                    disabled={!item.detailUid}
                                    onClick={() => void openCouponDialog(item)}
                                  >
                                    Apply Coupon
                                  </Button>
                                ) : null}
                                {isEditing && !!item.couponId ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start font-normal"
                                    disabled={!item.detailUid || !item.couponId}
                                    onClick={() => {
                                      setOpenItemActionId(null);
                                      void handleRemoveItemCoupon(item);
                                    }}
                                  >
                                    Remove Coupon
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
                variant="outline"
                className="border-indigo-600 text-indigo-700 hover:bg-indigo-50"
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

                  {/* Net Total Row */}
                  <span className="font-bold text-slate-800">Net Total</span>
                  <span className="font-bold text-slate-950 text-right">{formatCurrency(invoiceNetTotal)}</span>
                  <div className="w-7" />

                  {/* Amount Due Card */}
                  <div className="col-span-3 rounded-lg bg-indigo-50/50 border border-indigo-100 p-3.5 mt-2">
                    <div className="grid grid-cols-[1fr_auto_28px] items-center">
                      <span className="text-base font-bold text-indigo-900">Amount Due</span>
                      <span className="text-lg font-extrabold text-indigo-700 text-right">{formatCurrency(invoiceAmountDue)}</span>
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
                <Button type="button" variant="outline" data-testid="finance-invoice-template-choose" onClick={() => void openTemplateChooser()}>
                  Choose Template
                </Button>
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
            onChange={(event) => setTemplateNameInput(event.target.value)}
            placeholder="Enter template name"
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

      <Dialog open={showTemplateChooser} onClose={() => setShowTemplateChooser(false)} title={`Invoice Templates (${invoiceTemplates.length})`} size="xl">
        <div className="grid gap-5 pt-2">
          <Input
            label="Search Template"
            value={templateSearch}
            onChange={(event) => setTemplateSearch(event.target.value)}
            placeholder="Search Template"
          />
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                  <th className="px-4 py-3">Template Name</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {templateLoading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">Loading templates...</td>
                  </tr>
                ) : filteredInvoiceTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">No templates found.</td>
                  </tr>
                ) : (
                  filteredInvoiceTemplates.map((template) => (
                    <tr key={template.uid}>
                      <td className="px-4 py-4 font-medium text-slate-900">{template.templateName}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button type="button" onClick={() => void handleUseTemplate(template.uid)}>
                            Use Template
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void handlePreviewTemplate(template.uid)}>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Dialog>

      <Dialog open={showTemplatePreviewDialog} onClose={() => setShowTemplatePreviewDialog(false)} title={previewTemplate?.templateName || "Template Preview"} size="lg">
        <div className="grid gap-4 pt-2">
          <Input label="Template Name" value={String(previewTemplate?.templateName ?? "")} disabled />
          <Input label="Subject" value={String(previewTemplate?.invoiceLabel ?? "")} disabled />
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                  <th className="px-4 py-3">Procedure/Item</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {Array.isArray(previewTemplate?.detailList) && previewTemplate.detailList.length > 0 ? (
                  previewTemplate.detailList.map((detail: any, index: number) => (
                    <tr key={detail.uid ?? `preview-detail-${index}`}>
                      <td className="px-4 py-3">{String(detail.itemName ?? detail.name ?? "-")}</td>
                      <td className="px-4 py-3 text-center">{Number(detail.quantity ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(detail.price ?? detail.netRate ?? 0))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No template items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowTemplatePreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </>
  );
}
