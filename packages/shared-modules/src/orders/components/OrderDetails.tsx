import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Badge, Button, ConfirmDialog, DataTable, Dialog, DialogFooter, EmptyState, SectionCard, Select, Textarea, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import {
  useApplySalesOrderAdjustment,
  useOrdersBillCoupons,
  useOrdersBillDiscounts,
  useOrdersInvoiceAuditLogs,
  useOrdersInvoiceAuditLogsCount,
  useOrdersOrderDetail,
  useUpdateSalesOrderStatus,
} from "../queries/orders";
import { useApiScope } from "../../useApiScope";
import { buildOrdersDetailHref, buildOrdersInvoiceHref, formatOrdersCurrency, getOrdersStatusVariant, getSalesOrderInvoiceUid } from "../services/orders";
import type { OrdersBillAdjustmentKind, OrdersOrderDetailAddress } from "../types";
import { SharedOrdersLayout } from "./shared";

type AdjustmentFormState = {
  selectedId: string;
  privateNote: string;
  customerNote: string;
};

type OrderAuditLogRow = {
  uid: string;
  date: string;
  action: string;
  type: string;
  description: string;
  user: string;
};

const INITIAL_ADJUSTMENT_FORM: AdjustmentFormState = {
  selectedId: "",
  privateNote: "",
  customerNote: "",
};

export function OrderDetails() {
  const { routeParams, basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const scopedApi = useApiScope();
  const orderId = normalizeOrderRecordId(routeParams?.recordId ?? null);
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = searchParams?.get("returnTo") ?? "";
  const backHref = useMemo(() => resolveInternalReturnToHref(returnTo), [returnTo]);
  const detailQuery = useOrdersOrderDetail(orderId);
  const detail = detailQuery.data ?? null;
  const discountOptionsQuery = useOrdersBillDiscounts({ enabled: false });
  const couponOptionsQuery = useOrdersBillCoupons({ enabled: false });
  const applyAdjustmentMutation = useApplySalesOrderAdjustment(orderId);
  const updateStatusMutation = useUpdateSalesOrderStatus(orderId);
  const invoiceUid = detail?.invoiceUid ?? orderId;
  const totalItems = detail?.items?.length ?? 0;
  const statusLabel = detail ? formatOrderStatus(detail.status) : "";
  const normalizedStatus = String(detail?.status ?? "").trim().toUpperCase();
  const shippingAddress = detail?.shippingAddress ?? detail?.billingAddress ?? null;
  const billingAddress = detail?.billingAddress ?? null;
  const [noteDialogMode, setNoteDialogMode] = useState<"customer" | "staff" | null>(null);
  const [adjustmentDialogMode, setAdjustmentDialogMode] = useState<OrdersBillAdjustmentKind | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(INITIAL_ADJUSTMENT_FORM);
  const [adjustmentDialogError, setAdjustmentDialogError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(10);

  const activeAdjustmentQuery = adjustmentDialogMode === "coupon" ? couponOptionsQuery : discountOptionsQuery;
  const activeAdjustmentOptions = activeAdjustmentQuery.data ?? [];
  const activeAdjustmentSelectOptions = useMemo(
    () => activeAdjustmentOptions.map((option) => ({ value: option.id, label: option.label })),
    [activeAdjustmentOptions]
  );

  async function handleViewInvoice() {
    const resolvedOrderId = orderId ?? "";
    if (!resolvedOrderId) return;

    const returnTo =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : "";

    let resolvedInvoiceUid = "";

    try {
      resolvedInvoiceUid = await getSalesOrderInvoiceUid(scopedApi, resolvedOrderId);
    } catch {
      resolvedInvoiceUid = "";
    }

    const finalInvoiceUid = resolvedInvoiceUid || invoiceUid || resolvedOrderId;
    navigate(buildOrdersInvoiceHref(basePath, finalInvoiceUid, returnTo ? { returnTo } : undefined, product));
  }

  function handlePrintAddress(title: string, address: OrdersOrderDetailAddress) {
    const lines = [
      address.name,
      address.line1,
      address.line2,
      [address.city, address.state].filter(Boolean).join(", "),
      [address.country, address.postalCode].filter(Boolean).join(" "),
      address.phone,
      address.email,
    ]
      .map((line) => String(line ?? "").trim())
      .filter(Boolean);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write("<html><head><title></title>");
    printWindow.document.write("<style>body{font-family:Arial,sans-serif;padding:16px}.heading{font-size:18px;font-weight:bold;margin-bottom:12px}.line{margin:3px 0}</style>");
    printWindow.document.write("</head><body>");
    printWindow.document.write(`<div class="heading">${title}</div>`);
    lines.forEach((line) => printWindow.document.write(`<div class="line">${escapeHtml(line)}</div>`));
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function openNotesDialog(mode: "customer" | "staff") {
    setNoteDialogMode(mode);
  }

  function closeNotesDialog() {
    setNoteDialogMode(null);
  }

  async function openAdjustmentDialog(kind: OrdersBillAdjustmentKind) {
    setAdjustmentDialogMode(kind);
    setAdjustmentForm(INITIAL_ADJUSTMENT_FORM);
    setAdjustmentDialogError(null);

    try {
      if (kind === "discount") {
        await discountOptionsQuery.refetch();
      } else {
        await couponOptionsQuery.refetch();
      }
    } catch {
      // Query state already captures the error.
    }
  }

  function closeAdjustmentDialog() {
    if (applyAdjustmentMutation.isPending) {
      return;
    }

    setAdjustmentDialogMode(null);
    setAdjustmentForm(INITIAL_ADJUSTMENT_FORM);
    setAdjustmentDialogError(null);
  }

  async function handleApplyAdjustment() {
    if (!detail || !adjustmentDialogMode) {
      return;
    }

    const selected = activeAdjustmentOptions.find((option) => option.id === adjustmentForm.selectedId);
    if (!selected) {
      setAdjustmentDialogError(
        adjustmentDialogMode === "discount" ? "Please select a discount." : "Please select a coupon."
      );
      return;
    }

    setAdjustmentDialogError(null);

    await applyAdjustmentMutation.mutateAsync({
      kind: adjustmentDialogMode,
      selected,
      privateNote: adjustmentForm.privateNote,
      customerNote: adjustmentForm.customerNote,
      raw: detail.raw,
    });

    closeAdjustmentDialog();
  }

  async function handleUpdateStatus(status: "ORDER_COMPLETED" | "ORDER_CANCELED") {
    if (!orderId) {
      return;
    }

    await updateStatusMutation.mutateAsync(status);
    navigate(buildOrdersDetailHref(basePath, orderId));
  }

  const noteDialogTitle = noteDialogMode === "staff" ? "Notes from staff member" : "Notes to customer";
  const noteValue = noteDialogMode === "staff" ? detail?.notesFromStaff : detail?.notesToCustomer;
  const adjustmentDialogTitle = adjustmentDialogMode === "coupon" ? "Apply Coupon" : "Apply Discount";
  const adjustmentPlaceholder = adjustmentDialogMode === "coupon" ? "Select coupon" : "Select discount";
  const isAdjustmentLoading = activeAdjustmentQuery.isFetching && !activeAdjustmentOptions.length;
  const hasAdjustmentOptions = activeAdjustmentOptions.length > 0;
  const noAdjustmentsMessage = adjustmentDialogMode === "coupon" ? "No Coupons Available" : "No Discounts Available";
  const canUpdateOrderStatus = normalizedStatus !== "ORDER_COMPLETED" && normalizedStatus !== "ORDER_CANCELED";

  useEffect(() => {
    if (!logsOpen) {
      return;
    }
    setLogsPage(1);
  }, [logsOpen, logsPageSize, invoiceUid]);

  const logFilters = useMemo(() => {
    return {
      from: (logsPage - 1) * logsPageSize,
      count: logsPageSize,
    };
  }, [logsPage, logsPageSize]);

  const auditLogsQuery = useOrdersInvoiceAuditLogs(invoiceUid || null, logFilters, { enabled: logsOpen && Boolean(invoiceUid) });
  const auditLogsCountQuery = useOrdersInvoiceAuditLogsCount(invoiceUid || null, { enabled: logsOpen && Boolean(invoiceUid) });
  const auditLogsTotal = (auditLogsCountQuery.data ?? 0) || 0;
  const auditRows = useMemo<OrderAuditLogRow[]>(() => mapOrderAuditLogs(auditLogsQuery.data), [auditLogsQuery.data]);
  const auditColumns = useMemo<ColumnDef<OrderAuditLogRow>[]>(() => [
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="whitespace-pre-line text-slate-700">{row.date}</span>,
    },
    { key: "action", header: "Action", render: (row) => <span className="text-slate-800">{row.action}</span> },
    { key: "type", header: "Type", render: (row) => <span className="text-slate-800">{row.type}</span> },
    { key: "description", header: "Description", render: (row) => <span className="text-slate-800">{row.description}</span> },
    { key: "user", header: "User", render: (row) => <span className="text-slate-800">{row.user}</span> },
  ], []);

  if (!orderId) {
    return (
      <SharedOrdersLayout title="Order Details" subtitle="Review the selected sales order." backHref={backHref || undefined}>
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState title="Order not selected" description="Choose an order from the grid to open its detail view." />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if (detailQuery.isLoading && !detail) {
    return (
      <SharedOrdersLayout title="Order Details" subtitle="Review the selected sales order." backHref={backHref || undefined}>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500">Loading order details...</div>
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  if ((detailQuery.isError && !detail) || !detail) {
    const message = detailQuery.error instanceof Error ? detailQuery.error.message : "";
    return (
      <SharedOrdersLayout title="Order Details" subtitle="Review the selected sales order." backHref={backHref || undefined}>
        <SectionCard className="border-slate-200 shadow-sm">
          <EmptyState
            title="Order details unavailable"
            description={
              message
                ? `The selected order could not be loaded. ${message}`
                : "The selected order could not be loaded. Return to the grid and try another order."
            }
          />
        </SectionCard>
      </SharedOrdersLayout>
    );
  }

  return (
    <>
      <SharedOrdersLayout
        title={`Order #${detail.orderNumber || detail.id}`}
        subtitle={statusLabel}
        backHref={backHref || undefined}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm">
              Manage Template
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLogsOpen(true)} disabled={!invoiceUid}>
              Log
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 md:grid-cols-[70%_30%] md:items-start">
          <div className="space-y-6">
            <SectionCard className="border-slate-200 shadow-sm" padding={false}>
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed text-sm">
                  <colgroup>
                    <col style={{ width: "48%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Item Name</th>
                      <th className="px-4 py-3 text-center font-medium">Batch</th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Rate ({'\u20B9'})</th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Quantity</th>
                      <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        <div>Total</div>
                        <div className="text-xs font-normal text-slate-500">(Inclusive of all taxes)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.length > 0 ? (
                      detail.items.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 align-middle">
                            <div className="flex min-w-0 items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-md object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                  {(item.name || "I").slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 truncate font-semibold text-slate-900">{item.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center align-middle text-slate-600">
                            {item.batch && item.batch !== "-" ? (
                              <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                                {item.batch}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right align-middle text-slate-700 whitespace-nowrap">{formatOrdersCurrency(item.rate)}</td>
                          <td className="px-4 py-3 text-right align-middle text-slate-700 whitespace-nowrap">{item.quantity}</td>
                          <td className="px-4 py-3 text-right align-middle font-medium text-slate-900 whitespace-nowrap">{formatOrdersCurrency(item.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No line items available for this order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Summary" className="border-slate-200 shadow-sm">
              <div className="flex justify-end">
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-12">
                    <span className="text-slate-600">Total Items</span>
                    <span className="font-semibold text-slate-900">{totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between gap-12 font-semibold">
                    <span>Total</span>
                    <span className="text-slate-900">{formatOrdersCurrency(detail.netTotal || detail.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Payment"
              className="border-slate-200 shadow-sm"
              actions={
                <Button type="button" variant="primary" size="sm" onClick={handleViewInvoice}>
                  View Invoice
                </Button>
              }
            >
              {canUpdateOrderStatus ? (
                <div className="mb-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openAdjustmentDialog("discount")}>
                    Add discount
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openAdjustmentDialog("coupon")}>
                    Add coupon
                  </Button>
                </div>
              ) : null}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <PaymentRow label="Subtotal" value={detail.subtotal} />
                <PaymentRow label="GST" value={detail.taxAmount} />

                {detail.discountLines?.length || detail.couponLines?.length ? (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discounts applied</div>
                    <div className="space-y-2">
                      {(detail.discountLines ?? []).map((line) => (
                        <PaymentRow key={`disc-${line.name}`} label={line.name} value={-1 * line.amount} />
                      ))}
                      {(detail.couponLines ?? []).map((line) => (
                        <PaymentRow key={`coupon-${line.code}`} label={`${line.code} (coupon)`} value={-1 * line.amount} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {detail.discountAmount > 0 ? <PaymentRow label="Discount" value={-1 * detail.discountAmount} /> : null}
                    {detail.couponAmount > 0 ? <PaymentRow label="Coupon" value={-1 * detail.couponAmount} /> : null}
                  </>
                )}
                <PaymentRow label="Net Total" value={detail.netTotal} strong />
                <PaymentRow label="Amount Paid" value={detail.amountPaid} strong />
                <PaymentRow label="Amount Due" value={detail.amountDue} strong />
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => openNotesDialog("customer")}>
                  <span className="inline-flex items-center gap-2">
                    Notes to customer
                    {detail.notesToCustomer ? <span className="text-xs font-semibold text-emerald-600">{"\u2713"}</span> : null}
                  </span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openNotesDialog("staff")}>
                  <span className="inline-flex items-center gap-2">
                    Notes from staff member
                    {detail.notesFromStaff ? <span className="text-xs font-semibold text-emerald-600">{"\u2713"}</span> : null}
                  </span>
                </Button>
              </div>
            </SectionCard>

            <SectionCard className="border-slate-200 shadow-sm">
              {updateStatusMutation.error ? (
                <div className="px-4 pt-4">
                  <Alert variant="danger">
                    {updateStatusMutation.error instanceof Error ? updateStatusMutation.error.message : "Unable to update the order status right now."}
                  </Alert>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={getOrdersStatusVariant(detail.status)}>{statusLabel}</Badge>
                  <span className="text-sm text-slate-600">{detail.placedOn || "Order date unavailable"}</span>
                </div>
                {canUpdateOrderStatus ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelConfirmOpen(true)}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancel Order
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setCompleteConfirmOpen(true)}
                      disabled={updateStatusMutation.isPending}
                    >
                      Complete Order
                    </Button>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-900">Order Labels</div>
                <Button type="button" variant="ghost" size="sm">
                  + Add Label
                </Button>
              </div>
              <div className="mt-3">
                {detail.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detail.labels.map((label) => (
                      <Badge key={label} variant="neutral">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No labels applied.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-900">Assignees</div>
                <Button type="button" variant="ghost" size="sm">
                  Assign user
                </Button>
              </div>
              <div className="mt-3">
                {detail.assignees.length > 0 ? (
                  <div className="space-y-2">
                    {detail.assignees.map((assignee) => (
                      <div key={assignee} className="text-sm text-slate-700">{assignee}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No assigned users yet.</div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-900">Customer Details</div>
              </div>
              <hr className="my-4 border-slate-100" />
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-slate-900">{detail.customer}</div>
                  {detail.customerId ? <div className="text-sm text-slate-500">Id: {detail.customerId}</div> : null}
                </div>
                {shippingAddress?.phone || shippingAddress?.email ? (
                  <div className="text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Contact Information</div>
                    <div className="mt-1 space-y-1 text-slate-600">
                      {shippingAddress?.phone ? <div>{shippingAddress.phone}</div> : null}
                      {shippingAddress?.email ? <div>{shippingAddress.email}</div> : null}
                    </div>
                  </div>
                ) : null}
                <AddressBlock
                  title="Shipping Address"
                  address={shippingAddress}
                  action={
                    shippingAddress ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handlePrintAddress("Shipping Address", shippingAddress)}>
                        Print
                      </Button>
                    ) : null
                  }
                />
                <AddressBlock
                  title="Billing Address"
                  address={billingAddress}
                  action={
                    billingAddress ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => handlePrintAddress("Billing Address", billingAddress)}>
                        Print
                      </Button>
                    ) : null
                  }
                />
              </div>
            </SectionCard>

            <SectionCard className="border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-900">Business Details</div>
              </div>
              <hr className="my-4 border-slate-100" />
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-slate-500">GST No</div>
                  <div className="font-medium text-slate-900">{detail.gstNumber || "-"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Business Name</div>
                  <div className="font-medium text-slate-900">{detail.businessName || "-"}</div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </SharedOrdersLayout>

      <Dialog open={Boolean(noteDialogMode)} onClose={closeNotesDialog} title={noteDialogTitle} description="" size="md">
        {String(noteValue ?? "").trim() ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 whitespace-pre-wrap text-slate-700">
            {String(noteValue).trim()}
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-600">
            No Notes Added
          </div>
        )}
      </Dialog>

      <Dialog open={Boolean(adjustmentDialogMode)} onClose={closeAdjustmentDialog} title={adjustmentDialogTitle} description="" size="md">
        <div className="space-y-4">
          {adjustmentDialogError ? <Alert variant="danger">{adjustmentDialogError}</Alert> : null}
          {applyAdjustmentMutation.error ? (
            <Alert variant="danger">
              {applyAdjustmentMutation.error instanceof Error ? applyAdjustmentMutation.error.message : "Unable to apply the selected item right now."}
            </Alert>
          ) : null}
          {activeAdjustmentQuery.error ? (
            <Alert variant="danger">
              {activeAdjustmentQuery.error instanceof Error ? activeAdjustmentQuery.error.message : "Unable to load the available items right now."}
            </Alert>
          ) : null}

          {isAdjustmentLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading {adjustmentDialogMode ?? "adjustments"}...</div>
          ) : hasAdjustmentOptions ? (
            <>
              <Select
                label=""
                value={adjustmentForm.selectedId}
                onChange={(event) => {
                  setAdjustmentDialogError(null);
                  setAdjustmentForm((current) => ({ ...current, selectedId: event.target.value }));
                }}
                options={activeAdjustmentSelectOptions}
                placeholder={adjustmentPlaceholder}
              />
              <Textarea
                rows={3}
                value={adjustmentForm.privateNote}
                onChange={(event) => {
                  setAdjustmentDialogError(null);
                  setAdjustmentForm((current) => ({ ...current, privateNote: event.target.value }));
                }}
                placeholder="Private note"
              />
              <Textarea
                rows={3}
                value={adjustmentForm.customerNote}
                onChange={(event) => {
                  setAdjustmentDialogError(null);
                  setAdjustmentForm((current) => ({ ...current, customerNote: event.target.value }));
                }}
                placeholder="Notes for customer"
              />
            </>
          ) : (
            <div className="py-4">
              <EmptyState title={noAdjustmentsMessage} description="" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeAdjustmentDialog} disabled={applyAdjustmentMutation.isPending}>
            Cancel
          </Button>
          {hasAdjustmentOptions ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyAdjustment}
              loading={applyAdjustmentMutation.isPending}
              disabled={!adjustmentForm.selectedId}
            >
              Apply
            </Button>
          ) : null}
        </DialogFooter>
      </Dialog>

      <Dialog open={logsOpen} onClose={() => setLogsOpen(false)} title="Logs" description="" size="lg">
        <DataTable
          data={auditRows}
          columns={auditColumns}
          loading={auditLogsQuery.isLoading || auditLogsCountQuery.isLoading}
          emptyMessage={invoiceUid ? "No logs available." : "Logs are unavailable for this order."}
          pagination={{
            page: logsPage,
            pageSize: logsPageSize,
            total: auditLogsTotal || auditRows.length,
            onChange: setLogsPage,
            onPageSizeChange: setLogsPageSize,
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onClose={() => {
          if (updateStatusMutation.isPending) {
            return;
          }
          setCancelConfirmOpen(false);
        }}
        onConfirm={async () => {
          await handleUpdateStatus("ORDER_CANCELED");
          setCancelConfirmOpen(false);
        }}
        title={<span className="text-sm font-semibold text-slate-900">Are you sure you want to cancel this order?</span>}
        description=""
        confirmLabel="Yes"
        cancelLabel="No"
        confirmVariant="danger"
        loading={updateStatusMutation.isPending}
      />

      <ConfirmDialog
        open={completeConfirmOpen}
        onClose={() => {
          if (updateStatusMutation.isPending) {
            return;
          }
          setCompleteConfirmOpen(false);
        }}
        onConfirm={async () => {
          await handleUpdateStatus("ORDER_COMPLETED");
          setCompleteConfirmOpen(false);
        }}
        title={<span className="text-sm font-semibold text-slate-900">Are you sure you want to complete this order?</span>}
        description=""
        confirmLabel="Yes"
        cancelLabel="No"
        confirmVariant="primary"
        loading={updateStatusMutation.isPending}
      />
    </>
  );
}

function normalizeOrderRecordId(recordId: string | null) {
  if (!recordId) {
    return null;
  }

  const suffix = "_sodr";
  let resolved = recordId;

  while (resolved.endsWith(`${suffix}${suffix}`)) {
    resolved = resolved.slice(0, -suffix.length);
  }

  return resolved;
}

function resolveInternalReturnToHref(returnTo: string) {
  const raw = String(returnTo ?? "").trim();
  if (!raw || raw === "#") return "";

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "";

    const href = `${url.pathname}${url.search}${url.hash}`;
    if (typeof window !== "undefined") {
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (href === currentHref) return "";
    }

    return href;
  } catch {
    return "";
  }
}

function formatOrderStatus(status: string) {
  const trimmed = String(status ?? "").trim();
  if (!trimmed) return "-";

  if (trimmed.toUpperCase().startsWith("ORDER_")) {
    const withoutPrefix = trimmed.slice(6);
    const normalized = withoutPrefix
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
    return normalized || trimmed;
  }

  return trimmed;
}

function PaymentRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className={strong ? "font-semibold text-slate-900" : "text-slate-600"}>{label}</div>
      <div className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>{formatOrdersCurrency(value)}</div>
    </div>
  );
}

function AddressBlock({
  title,
  address,
  action,
}: {
  title: string;
  address: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    email: string;
    phone: string;
  } | null;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {action ?? null}
      </div>
      {address ? (
        <div className="space-y-1 text-sm text-slate-600">
          {address.name ? <div>{address.name}</div> : null}
          {address.line1 ? <div>{address.line1}</div> : null}
          {address.line2 ? <div>{address.line2}</div> : null}
          <div>{[address.city, address.state].filter(Boolean).join(", ")}</div>
          <div>{[address.country, address.postalCode].filter(Boolean).join(" ")}</div>
          {address.phone ? <div>{address.phone}</div> : null}
          {address.email ? <div>{address.email}</div> : null}
        </div>
      ) : (
        <div className="text-sm text-slate-500">No address available.</div>
      )}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mapOrderAuditLogs(raw: unknown): OrderAuditLogRow[] {
  const unwrapList = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  const titleCase = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (!text) return "-";

    return text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDateTime = (value: unknown) => {
    if (!value) return "-";

    const rawText = String(value).trim();
    if (!rawText) return "-";

    if (typeof value === "string" && /,\s*\d{1,2}:\d{2}\s*(AM|PM)\b/i.test(rawText)) {
      const lastComma = rawText.lastIndexOf(",");
      if (lastComma > 0) {
        const left = rawText.slice(0, lastComma).trim();
        const right = rawText.slice(lastComma + 1).trim();
        if (left && right) {
          return `${left},\n${right}`;
        }
      }
      return rawText;
    }

    const tryDate = (() => {
      if (typeof value === "number") {
        const ms = value > 10_000_000_000 ? value : value * 1000;
        const d = new Date(ms);
        return Number.isNaN(d.getTime()) ? null : d;
      }

      const numeric = Number(rawText);
      if (Number.isFinite(numeric) && rawText.length >= 10) {
        const ms = numeric > 10_000_000_000 ? numeric : numeric * 1000;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return d;
      }

      const d = new Date(rawText);
      return Number.isNaN(d.getTime()) ? null : d;
    })();

    if (!tryDate) {
      return rawText;
    }

    const date = tryDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const time = tryDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${date},\n${time}`;
  };

  return unwrapList(raw).map((item: any, index: number) => {
    const uid = String(item?.uid ?? item?.id ?? item?.auditUid ?? index);
    const date = formatDateTime(
      item?.dateTime ??
      item?.date ??
      item?.createdDate ??
      item?.createdOn ??
      item?.createdAt ??
      item?.actionDate ??
      item?.auditDate ??
      item?.timestamp ??
      item?.time
    );
    const action = titleCase(
      item?.auditLogAction ?? item?.action ?? item?.auditContext ?? item?.event ?? item?.operation ?? item?.auditType ?? "-"
    );
    const type = titleCase(item?.type ?? item?.objectType ?? item?.entityType ?? item?.module ?? "Order");
    const description = String(item?.description ?? item?.message ?? item?.auditMessage ?? "-").trim() || "-";
    const user = String(item?.user ?? item?.userName ?? item?.username ?? item?.createdBy ?? item?.userId ?? "-").trim() || "-";

    return { uid, date, action, type, description, user };
  });
}
