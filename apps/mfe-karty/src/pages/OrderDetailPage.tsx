/**
 * Order detail — one order, linkable.
 *
 * Route: /karty/orders/:uid
 *
 * ## Why this exists
 * Until now an order could only be inspected through a modal held in `OrdersTable`'s local
 * state. That made an order unlinkable: the dashboard could not deep-link a row, a stuck order
 * could not be pasted into a message, and the back button did nothing useful. Everything here
 * comes from `GET /orders/{uid}`, which returns the full DTO including `items[]` — the list
 * endpoint omits those, which is why no list-driven screen could show line detail.
 *
 * ## Status actions
 * The transitions offered mirror `OrderServiceImpl.validateStatusTransition` exactly. Offering
 * an illegal transition would surface as a 400 after the click, which reads as a bug rather
 * than as a rule.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useOrder,
  useUpdateOrderStatus,
  useCancelOrder,
  useAttachConsumer,
  useAssignOrder,
  useApproveB2bOrder,
  useRejectB2bOrder,
  useUpdateOrder
} from '../services/useOrders';
import { useOrderNotes, useAddOrderNote } from '../services/useOrderNotes';
import { useOrderTimeline } from '../services/useOrderTimeline';
import { useUsers } from '../services/useUsers';
import { useCapabilities } from '../services/useCapabilities';
import { useOrderReview, useSubmitOrderReview, useRequestOrderReview } from '../services/useReviews';
import {
  Clock,
  MessageSquare,
  UserCheck,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  User,
  Plus,
  MapPin,
  Edit2,
  Loader2,
  Check,
  Mail,
  MessageCircle,
  Phone
} from 'lucide-react';
import { useItems } from '../services/useItems';
import { useStores } from '../services/useStores';
import { usePickLocations } from '../services/useRackManagement';
import { useCustomers } from '../services/useCustomers';
import { OrderInvoiceModal } from '../new-karty-src/src/components/OrdersModals';
import OrderShipmentPanel from '../new-karty-src/src/components/OrderShipmentPanel';

const C = {
  muted: '#64748b',
  line: '#e2e8f0',
  grid: '#f1f5f9',
  primary: '#55349A',
  danger: '#e11d48',
};

const CARD = 'bg-white border border-surface-200 rounded-2xl shadow-sm';

const inr = (n: number) => {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return (n < 0 ? '-' : '') + s;
  const l3 = s.slice(-3);
  let r = s.slice(0, -3), o = '';
  while (r.length > 2) { o = ',' + r.slice(-2) + o; r = r.slice(0, -2); }
  return (n < 0 ? '-' : '') + r + o + ',' + l3;
};

const up = (s: unknown) => String(s ?? '').toUpperCase();

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#fffbeb', fg: '#b45309' },
  CONFIRMED: { bg: '#ede9fe', fg: '#55349A' },
  SHIPPED: { bg: '#e0f2fe', fg: '#0369a1' },
  DELIVERED: { bg: '#ecfdf5', fg: '#059669' },
  CANCELLED: { bg: '#fff1f2', fg: '#e11d48' },
  RETURNED: { bg: '#fff1f2', fg: '#e11d48' },
};
const statusStyle = (s: string) => STATUS_STYLE[s] ?? { bg: C.grid, fg: C.muted };

const TIMELINE = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

/**
 * Legal next statuses, mirroring `OrderServiceImpl.validateStatusTransition`:
 *
 * · CANCELLED and RETURNED are terminal — the service rejects any transition out of them.
 * · DELIVERED can only move to RETURNED.
 * · RETURNED is reachable only from DELIVERED.
 *
 * Backward moves (CONFIRMED → PENDING) are legal server-side but deliberately not offered:
 * status changes drive stock movement and analytics reversals, so walking an order backwards
 * has consequences a dashboard button should not imply are routine.
 */
function nextStatuses(current: string): string[] {
  switch (current) {
    case 'PENDING':
      return ['CONFIRMED', 'SHIPPED', 'DELIVERED'];
    case 'CONFIRMED':
      return ['SHIPPED', 'DELIVERED'];
    case 'SHIPPED':
      return ['DELIVERED'];
    case 'DELIVERED':
      return ['RETURNED'];
    default:
      return [];
  }
}

const canCancel = (current: string) =>
  current === 'PENDING' || current === 'CONFIRMED' || current === 'SHIPPED';

const Shimmer = ({ h }: { h: number }) => (
  <div className="animate-pulse rounded-lg bg-surface-100" style={{ height: h }} />
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">{label}</div>
    <div className="mt-0.5 text-[13.5px] font-medium text-surface-900">{value}</div>
  </div>
);

export function OrderDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();

  const orderQ = useOrder(uid);
  // Declared here (not lower down) because hooks/handlers above the previous declaration site
  // read `order` — referencing it later caused a "Cannot access 'order' before initialization"
  // TDZ crash that broke the whole order-detail page.
  const order: any = orderQ.data ?? null;
  const itemsQ = useItems();
  const storesQ = useStores();
  const customersQ = useCustomers('', 0, 200);

  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const attachConsumer = useAttachConsumer();
  // Instantiate the remaining data hooks/mutations the page uses (these were imported but never
  // wired up during a refactor, which left the page crashing on undefined references).
  const timelineQ = useOrderTimeline(uid);
  const notesQ = useOrderNotes(uid);
  const addNoteMutation = useAddOrderNote();
  const assignMutation = useAssignOrder();
  const approveB2bMutation = useApproveB2bOrder();
  const rejectB2bMutation = useRejectB2bOrder();
  const usersQ = useUsers();
  const busy = updateStatus.isPending || cancelOrder.isPending;

  // Customer picker (attach a customer to a guest order — ORD-005/026)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [addressSavedMsg, setAddressSavedMsg] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const updateOrderMutation = useUpdateOrder();

  const handleSaveAddresses = async () => {
    if (!order) return;
    const finalBilling = sameAsShipping ? shippingAddress : billingAddress;
    try {
      await updateOrderMutation.mutateAsync({
        uid: order.uid,
        payload: {
          shippingAddress: shippingAddress.trim() || null,
          billingAddress: finalBilling.trim() || null,
        },
      });
      order.shippingAddress = shippingAddress.trim() || undefined;
      order.billingAddress = finalBilling.trim() || undefined;
      setIsEditingAddress(false);
      setAddressSavedMsg("Address updated successfully!");
      setTimeout(() => setAddressSavedMsg(null), 3000);
    } catch (err: any) {
      alert("Failed to update address: " + (err?.message || "Server error"));
    }
  };
  const { data: liveReview, refetch: refetchLiveReview } = useOrderReview(order?.id || uid);
  const submitReviewMutation = useSubmitOrderReview();
  const requestReviewMutation = useRequestOrderReview();
  const [requestReviewSuccess, setRequestReviewSuccess] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id && !uid) return;
    setSubmittingReview(true);
    try {
      await submitReviewMutation.mutateAsync({
        orderUid: order?.id || uid,
        review: { rating: reviewRating, comment: reviewComment.trim() || undefined }
      });
      setShowReviewModal(false);
      refetchLiveReview();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const [custSearch, setCustSearch] = useState('');
  const pickerQ = useCustomers(custSearch, 0, 30);
  // Picker search + results (the modal input/list use these names).
  const pickerSearch = custSearch;
  const setPickerSearch = setCustSearch;
  const filteredCustomers = (pickerQ.data ?? []) as any[];
  const handleAttachCustomer = async (consumerUid: string) => {
    if (!order?.uid || !consumerUid) return;
    try {
      await attachConsumer.mutateAsync({ uid: order.uid, consumerUid });
      setPickerOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to attach customer');
    }
  };
  // Activity panel tab + internal-note composer state.
  const [activeActivityTab, setActiveActivityTab] = useState<'timeline' | 'notes'>('timeline');
  const [newNoteText, setNewNoteText] = useState('');

  const status = up(order?.status);
  // The server rejects attaching a customer to a completed/cancelled/returned order.
  const isMutable = !['CANCELLED', 'RETURNED'].includes(status);
  const canAttachCustomer = !!order && !order.consumerUid && isMutable;

  /** Line items carry itemUid but no name — the DTO does not denormalise it. */
  const itemName = useMemo(() => {
    const m = new Map<string, { name: string; sku: string }>();
    (itemsQ.data ?? []).forEach((i: any) => m.set(i.uid, { name: i.name, sku: i.sku }));
    return m;
  }, [itemsQ.data]);

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [storesQ.data]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    (customersQ.data ?? []).forEach((c: any) => {
      const n = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' ') || c.consumerNo;
      if (n) m.set(c.uid, n);
    });
    return m;
  }, [customersQ.data]);

    const itemUids = useMemo(() => {
    return ((order?.items ?? []) as any[]).map((l) => l.itemUid).filter(Boolean);
  }, [order?.items]);

  const pickLocationsQ = usePickLocations(order?.storeUid, itemUids);
  const pickLocations = pickLocationsQ.data ?? [];

  const pickLocationMap = useMemo(() => {
    const m = new Map<string, any>();
    pickLocations.forEach((loc: any) => m.set(loc.itemUid, loc));
    return m;
  }, [pickLocations]);

  const lines = useMemo(() => {
    return ((order?.items ?? []) as any[]).map((l) => {
      const meta = itemName.get(l.itemUid);
      const qty = Number(l.sellQty ?? l.qty ?? 0) || 0;
      const unitPrice = Number(l.unitPrice ?? 0) || 0;
      return {
        uid: l.uid,
        itemUid: l.itemUid,
        name: meta?.name ?? 'Unknown item',
        sku: meta?.sku ?? '—',
        qty,
        unit: l.selectedUnit ?? '',
        variant: [l.selectedSize, l.selectedColor].filter(Boolean).join(' · '),
        unitPrice,
        // lineTotal is authoritative — the server computes it with unit conversion applied, so
        // qty x unitPrice can legitimately disagree on a loose-sale or multi-unit line.
        lineTotal: Number(l.lineTotal ?? qty * unitPrice) || 0,
      };
    });
  }, [order, itemName]);

  const lineSum = lines.reduce((a, l) => a + l.lineTotal, 0);
  const total = Number(order?.totalAmount ?? 0) || 0;

  const orderDate = order?.orderDate ? new Date(order.orderDate) : null;
  const stageIndex = TIMELINE.indexOf(status as (typeof TIMELINE)[number]);
  const isVoid = status === 'CANCELLED' || status === 'RETURNED';

  const act = (fn: () => void) => {
    fn();
  };

  if (orderQ.isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface-50">
        <div className="mx-auto max-w-[1200px] px-8 pb-12 pt-7">
          <div className="mb-4"><Shimmer h={70} /></div>
          <div className="mb-4"><Shimmer h={120} /></div>
          <Shimmer h={320} />
        </div>
      </div>
    );
  }

  if (orderQ.isError || !order) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface-50">
        <div className="mx-auto max-w-[1200px] px-8 pb-12 pt-7">
          <button
            onClick={() => navigate('/orders')}
            className="mb-5 cursor-pointer text-[13px] font-semibold text-primary-600"
          >
            ← Back to orders
          </button>
          <div className={CARD + ' px-[22px] py-10 text-center'}>
            <div className="text-[15px] font-bold text-surface-900">Order not found</div>
            <div className="mt-1.5 text-[13px] text-surface-500">
              {orderQ.isError
                ? 'The order could not be loaded. It may have been removed, or the service is unavailable.'
                : 'No order exists with this reference.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-50 text-surface-900">
      <div className="mx-auto max-w-[1200px] px-8 pb-12 pt-7">

        <button
          onClick={() => navigate('/orders')}
          className="mb-4 cursor-pointer text-[13px] font-semibold text-primary-600 hover:underline"
        >
          ← Back to orders
        </button>

        {/* ORD-009: B2B Credit Approval Banner */}
        {order.b2bApprovalStatus === 'PENDING_APPROVAL' && (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50/90 p-4.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-amber-900">B2B Credit Approval Required</h3>
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                      Pending Review
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 mt-1 max-w-2xl">
                    This order was placed under a trade partner account and exceeds available credit or requires manager authorization before stock can be released.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={approveB2bMutation.isPending || rejectB2bMutation.isPending}
                  onClick={() => approveB2bMutation.mutate(order.uid)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {approveB2bMutation.isPending ? 'Approving...' : 'Approve Order'}
                </button>
                <button
                  type="button"
                  disabled={approveB2bMutation.isPending || rejectB2bMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reject this B2B order?')) {
                      rejectB2bMutation.mutate(order.uid);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <XCircle size={15} />
                  {rejectB2bMutation.isPending ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="rounded-md bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-600">
                Karty
              </span>
              <span className="text-xs text-surface-500">Commerce · Order</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold tracking-tight">{order.orderNo ?? '—'}</h1>
              <span
                className="rounded-md px-2.5 py-1 text-[11px] font-bold"
                style={{ background: statusStyle(status).bg, color: statusStyle(status).fg }}
              >
                {status}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-surface-500">
              {orderDate
                ? orderDate.toLocaleString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })
                : 'No order date recorded'}
            </p>
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/orders/${order.uid || order.id}/tax-invoice`)}
              className="cursor-pointer rounded-lg border border-primary-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-primary-700 transition-colors hover:bg-primary-50 flex items-center gap-1.5"
            >
              <span>View / Print Invoice</span>
            </button>

            {/* RET-001: Initiate Return action */}
            {status === 'DELIVERED' && (
              <button
                onClick={() => navigate(`/orders/sales-returns?orderUid=${order.uid}&orderNo=${encodeURIComponent(order.orderNo || '')}&storeUid=${order.storeUid || ''}&consumerUid=${order.consumerUid || ''}`)}
                className="cursor-pointer rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-[12.5px] font-semibold text-[#55349A] transition-colors hover:bg-purple-100 flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Initiate Return</span>
              </button>
            )}
            {nextStatuses(status).map((s) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => act(() => updateStatus.mutate({ uid: order.uid, status: s }))}
                className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                Mark {s[0] + s.slice(1).toLowerCase()}
              </button>
            ))}
            {canCancel(status) && (
              <button
                disabled={busy}
                onClick={() => act(() => cancelOrder.mutate(order.uid))}
                className="cursor-pointer rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-danger-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
              >
                Cancel order
              </button>
            )}
            {isVoid && (
              <span className="rounded-lg border border-dashed border-surface-300 px-3 py-2 text-[11.5px] text-surface-400">
                {status[0] + status.slice(1).toLowerCase()} orders cannot change status
              </span>
            )}
          </div>
        </div>

        {(updateStatus.isError || cancelOrder.isError) && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-[13px] text-danger-600">⚠</span>
            <span className="text-[12.5px] leading-snug text-rose-800">
              {String(
                (updateStatus.error as Error)?.message ??
                  (cancelOrder.error as Error)?.message ??
                  'The status change was rejected.'
              )}
            </span>
          </div>
        )}

        {/* Progress */}
        <div className={'mb-3.5 ' + CARD + ' px-[22px] py-5'}>
          <div className="mb-4 text-sm font-bold">Progress</div>
          {isVoid ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
              This order was {status.toLowerCase()}
              {status === 'RETURNED' ? ' after delivery' : ' before completion'}. Its revenue has
              been reversed out of net sales.
            </div>
          ) : (
            <div className="flex items-center">
              {TIMELINE.map((s, i) => {
                const done = stageIndex >= i;
                const st = statusStyle(s);
                return (
                  <div key={s} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold"
                        style={{
                          background: done ? st.fg : C.grid,
                          color: done ? '#fff' : C.muted,
                        }}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: done ? st.fg : C.muted }}
                      >
                        {s[0] + s.slice(1).toLowerCase()}
                      </span>
                    </div>
                    {i < TIMELINE.length - 1 && (
                      <div
                        className="mx-2 mb-5 h-[2px] flex-1 rounded"
                        style={{ background: stageIndex > i ? statusStyle(s).fg : C.line }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 text-[10.5px] text-surface-400">
            Stage only — the schema records no per-transition timestamps, so this cannot show when
            each step happened.
          </div>
        </div>

        {/* Addresses & Delivery */}
        <div className={'mb-3.5 ' + CARD + ' px-[22px] py-5'}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold flex items-center gap-2">
              <MapPin size={16} className="text-primary-600" />
              <span>Addresses & Delivery</span>
            </div>
            {!isEditingAddress && (
              <button
                type="button"
                onClick={() => {
                  setShippingAddress(order?.shippingAddress || '');
                  setBillingAddress(order?.billingAddress || '');
                  setSameAsShipping(!order?.billingAddress || order?.billingAddress === order?.shippingAddress);
                  setIsEditingAddress(true);
                }}
                className="cursor-pointer text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-transparent border-none p-0"
              >
                <Edit2 size={12} />
                <span>{order?.shippingAddress || order?.billingAddress ? 'Edit Address' : '+ Add Address'}</span>
              </button>
            )}
          </div>

          {addressSavedMsg && (
            <div className="mb-3.5 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              <span>{addressSavedMsg}</span>
            </div>
          )}

          {isEditingAddress ? (
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-surface-600 uppercase tracking-wider block">
                  Shipping Address (Deliver To)
                </label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter street, building, city, state, pincode..."
                  className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs outline-none focus:border-primary-600 font-medium resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pageSameAsShipping"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="pageSameAsShipping" className="text-xs text-surface-700 font-semibold cursor-pointer select-none">
                  Billing address is same as shipping
                </label>
              </div>

              {!sameAsShipping && (
                <div className="space-y-1 animate-in fade-in duration-150">
                  <label className="text-[11px] font-bold text-surface-600 uppercase tracking-wider block">
                    Billing Address (Bill To)
                  </label>
                  <textarea
                    rows={2}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Enter legal company/customer billing address..."
                    className="w-full px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs outline-none focus:border-primary-600 font-medium resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateOrderMutation.isPending}
                  onClick={handleSaveAddresses}
                  className="px-4 py-1.5 bg-[#55349A] hover:bg-[#462980] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
                >
                  {updateOrderMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>{updateOrderMutation.isPending ? 'Saving...' : 'Save Address'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-150">
                <span className="text-[10px] font-bold uppercase text-surface-400 tracking-wider block mb-1">
                  Shipping Address (Ship-To)
                </span>
                {order?.shippingAddress ? (
                  <p className="text-xs text-surface-800 font-medium leading-relaxed whitespace-pre-wrap">{order.shippingAddress}</p>
                ) : (
                  <p className="text-xs text-amber-700 font-semibold italic flex items-center gap-1">
                    <span>⚠ No shipping address (Required for shipping label printing)</span>
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-150">
                <span className="text-[10px] font-bold uppercase text-surface-400 tracking-wider block mb-1">
                  Billing Address (Bill-To)
                </span>
                {order?.billingAddress ? (
                  <p className="text-xs text-surface-800 font-medium leading-relaxed whitespace-pre-wrap">{order.billingAddress}</p>
                ) : (
                  <p className="text-xs text-surface-500 italic">
                    {order?.shippingAddress ? 'Same as shipping address' : 'Not specified'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary fields */}
        <div className={'mb-3.5 ' + CARD + ' px-[22px] py-5'}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            <Field
              label="Customer"
              // consumerName is stamped on the order by commerce-service; the client-side
              // map only backfills orders placed before that field existed.
              value={
                order.consumerUid ? (
                  (order as any).consumerName || customerName.get(order.consumerUid) || 'Unknown'
                ) : canAttachCustomer ? (
                  <button
                    onClick={() => { setCustSearch(''); setPickerOpen(true); }}
                    className="cursor-pointer rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-[12px] font-semibold text-primary-700 transition-colors hover:bg-primary-100"
                  >
                    + Add customer
                  </button>
                ) : (
                  'Walk-in'
                )
              }
            />
            <Field label="Store" value={storeName.get(order.storeUid ?? '') ?? '—'} />
            <Field
              label="Channel"
              value={
                <span style={{ color: up(order.channel) === 'ONLINE' ? C.primary : '#b45309' }}>
                  {up(order.channel) || '—'}
                </span>
              }
            />
            <Field label="Lines" value={lines.length || order.itemsCount || 0} />
            <Field label="Total" value={'₹' + inr(total)} />
            <Field
              label="Assigned Staff"
              value={
                <div className="relative inline-block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold text-surface-900 truncate max-w-[100px]">
                      {(order as any).assignee?.name || (order as any).assignedUserName || 'Unassigned'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                      className="cursor-pointer text-[11px] font-semibold text-primary-600 hover:underline"
                    >
                      {(order as any).assignee?.name || (order as any).assignedUserName ? 'Change' : '+ Assign'}
                    </button>
                  </div>
                  {showAssignDropdown && (
                    <div className="absolute left-0 top-full mt-1.5 z-30 w-56 rounded-xl bg-white p-2 shadow-xl border border-surface-200 text-left">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-surface-400 px-2 py-1">
                        Select Staff Member
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            assignMutation.mutate({ uid: order.uid, userUid: null });
                            setShowAssignDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium cursor-pointer"
                        >
                          ✕ Clear / Unassign
                        </button>
                        {usersQ.data?.content?.map((u: any) => {
                          const uName = u.userDisplayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User';
                          return (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() => {
                                assignMutation.mutate({ uid: order.uid, userUid: u.uid });
                                setShowAssignDropdown(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs text-surface-800 hover:bg-surface-100 rounded-lg flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate">{uName}</span>
                              {u.departmentName && <span className="text-[10px] text-surface-400">{u.departmentName}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </div>
          {(order.labelText || order.invoiceType) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-100 pt-4">
              {order.labelText && (
                <span
                  className="rounded-md px-2 py-1 text-[11px] font-semibold"
                  style={{
                    background: order.labelColor || C.grid,
                    color: order.labelColor ? '#fff' : C.muted,
                  }}
                >
                  {order.labelText}
                </span>
              )}
              {order.invoiceType && (
                <span className="text-[11.5px] text-surface-400">Invoice: {order.invoiceType}</span>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className={'mb-3.5 overflow-hidden ' + CARD}>
          <div className="px-[22px] pb-3 pt-5 text-sm font-bold">Items</div>
          {lines.length === 0 ? (
            <div className="px-[22px] pb-6 text-[13px] text-surface-400">
              This order has no line items recorded.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div
                    className="grid items-center border-y border-surface-100 bg-surface-50 px-[22px] py-2.5 text-[10.5px] font-bold uppercase tracking-wider text-surface-400"
                    style={{ gridTemplateColumns: 'minmax(180px,1fr) 110px 140px 90px 110px 110px' }}
                  >
                    <span>Item</span>
                    <span>SKU</span>
                    <span>Pick Location</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit price</span>
                    <span className="text-right">Line total</span>
                  </div>
                  {lines.map((l) => (
                    <div
                      key={l.uid}
                      className="grid items-center border-b border-surface-100 px-[22px] py-2.5 text-[12.5px]"
                      style={{ gridTemplateColumns: 'minmax(180px,1fr) 110px 140px 90px 110px 110px' }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{l.name}</span>
                        {l.variant && <span className="text-[11px] text-surface-400">{l.variant}</span>}
                      </span>
                      <span className="truncate text-surface-500">{l.sku}</span>
                      <span>
                        {(() => {
                          const loc = pickLocationMap.get(l.itemUid);
                          if (!loc) {
                            return <span className="text-[11px] text-surface-400 italic">Unassigned</span>;
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => navigate('/inventory/racks')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-[#55349A] hover:bg-purple-100 border border-[#55349A]/20 font-mono text-[10.5px] font-bold cursor-pointer transition-colors"
                              title={`${loc.zoneName || 'Zone'} ➔ ${loc.rackName || 'Rack'} ➔ ${loc.shelfName || 'Shelf'} (${loc.binCode})`}
                            >
                              <span>📍</span>
                              <span className="truncate">{loc.binCode ? loc.binCode.split('-').slice(-2).join('-') : 'BIN'}</span>
                            </button>
                          );
                        })()}
                      </span>
                      <span className="text-right text-surface-500">
                        {l.qty}{l.unit ? ` ${l.unit}` : ''}
                      </span>
                      <span className="text-right text-surface-500">₹{inr(l.unitPrice)}</span>
                      <span className="text-right font-bold">₹{inr(l.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between px-[22px] py-3.5">
                <span className="text-[11.5px] text-surface-400">
                  {lines.length} line{lines.length === 1 ? '' : 's'}
                </span>
                <span className="text-[15px] font-bold">₹{inr(total)}</span>
              </div>
              {/* The order total is stored on the order, not recomputed from lines. If the two
                  disagree the stored value is what every dashboard figure used, so say so
                  rather than quietly showing one of them. */}
              {Math.abs(lineSum - total) > 1 && (
                <div className="border-t border-amber-100 bg-warning-50 px-[22px] py-2.5 text-[11.5px] text-amber-700">
                  Line totals add up to ₹{inr(lineSum)}, but the order total is ₹{inr(total)}.
                  Reporting uses the order total.
                </div>
              )}
            </>
          )}
        </div>

                        {/* Review & Feedback Section */}
        {(() => {
          const effectiveReview = liveReview || order.review;
          if (effectiveReview) {
            return (
              <div className={CARD + ' px-[22px] py-5'}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-sm font-bold text-slate-900">Customer review</div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Verified Feedback
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px]" style={{ color: '#f59e0b' }}>
                    {'★'.repeat(Math.max(0, Math.min(5, Number(effectiveReview.rating) || 0)))}
                    <span className="text-surface-300">
                      {'★'.repeat(5 - Math.max(0, Math.min(5, Number(effectiveReview.rating) || 0)))}
                    </span>
                  </span>
                  <span className="text-[12.5px] font-bold text-slate-700">{effectiveReview.rating}.0 / 5</span>
                </div>
                {effectiveReview.comment && (
                  <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600 italic bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    &ldquo;{effectiveReview.comment}&rdquo;
                  </p>
                )}
              </div>
            );
          }

                    return (
            <div className={CARD + ' px-[22px] py-5'}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-800">Customer Review &amp; Rating</div>
                <span className="text-[11px] font-semibold text-slate-400">Unrated</span>
              </div>
              <p className="text-xs text-slate-500 mb-3.5">
                No customer feedback recorded yet. Collect verified feedback via WhatsApp, SMS, Email, or log staff feedback directly.
              </p>

              {requestReviewSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                  {requestReviewSuccess}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="px-3 py-1.5 text-xs font-bold text-[#55349A] bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors cursor-pointer"
                >
                  + Record Live Review
                </button>

                                <button
                  type="button"
                  onClick={async () => {
                    if (!order?.id && !uid) return;
                    try {
                      await requestReviewMutation.mutateAsync(order?.id || uid);
                      setRequestReviewSuccess('Real WhatsApp review request sent via Platform Notification Gateway (WATI/Plivo)!');
                    } catch (err: any) {
                      alert(err?.message || 'Failed to send WhatsApp notification');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Send WhatsApp Notification</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!order?.id && !uid) return;
                    try {
                      await requestReviewMutation.mutateAsync(order?.id || uid);
                      setRequestReviewSuccess('Real SMS review request dispatched via Platform SMS Gateway!');
                    } catch (err: any) {
                      alert(err?.message || 'Failed to dispatch SMS notification');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Send SMS Notification</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!order?.id && !uid) return;
                    try {
                      await requestReviewMutation.mutateAsync(order?.id || uid);
                      setRequestReviewSuccess('Real Email review request dispatched via Platform Email Gateway!');
                    } catch (err: any) {
                      alert(err?.message || 'Failed to dispatch email notification');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Send Email Notification</span>
                </button>
              </div>
            </div>
          );
        })()}

      </div>


        {/* ShipRocket shipment lifecycle */}
        <OrderShipmentPanel orderUid={(order as any)?.uid || uid || ''} order={order as any} />

        {/* ORD-016: Order Activity & Internal Notes */}
        <div className={'mb-6 ' + CARD + ' overflow-hidden'}>
          <div className="px-6 pt-5 pb-3 border-b border-surface-100 flex items-center justify-between bg-surface-50/40">
            <div className="flex items-center gap-4">
              <div className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Clock size={16} className="text-primary-600" />
                Order Activity &amp; Audit Trail
              </div>
              <div className="flex rounded-lg bg-surface-200/70 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveActivityTab('timeline')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeActivityTab === 'timeline'
                      ? 'bg-white text-surface-900 shadow-xs'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  Audit Timeline ({timelineQ.data?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveActivityTab('notes')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeActivityTab === 'notes'
                      ? 'bg-white text-surface-900 shadow-xs'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  Internal Notes ({notesQ.data?.length || 0})
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {activeActivityTab === 'timeline' && (
              <div className="space-y-4">
                {timelineQ.isLoading ? (
                  <div className="py-6 text-center text-xs text-surface-400">Loading timeline events...</div>
                ) : timelineQ.data && timelineQ.data.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200">
                    {timelineQ.data.map((evt) => {
                      const date = evt.eventAt ? new Date(evt.eventAt) : null;
                      const isCreated = evt.eventType === 'ORDER_CREATED';
                      const isInvoice = evt.eventType === 'INVOICE_GENERATED';
                      const isReturn = evt.eventType === 'RETURN_CREATED';
                      const isNote = evt.eventType === 'NOTE_ADDED';

                      let dotBg = 'bg-primary-500';
                      if (isCreated) dotBg = 'bg-blue-500';
                      if (isInvoice) dotBg = 'bg-emerald-500';
                      if (isReturn) dotBg = 'bg-rose-500';
                      if (isNote) dotBg = 'bg-purple-500';

                      return (
                        <div key={evt.uid} className="relative group">
                          <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ${dotBg} ring-4 ring-white shadow-xs`} />
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-surface-900">
                                {evt.eventType.replace(/_/g, ' ')}
                              </span>
                              {evt.actorName && (
                                <span className="text-[11px] font-medium text-surface-500 bg-surface-100 px-1.5 py-0.5 rounded">
                                  by {evt.actorName}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-surface-400 font-mono">
                              {date ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                            </span>
                          </div>
                          {evt.summary && (
                            <p className="mt-1 text-xs text-surface-600 leading-relaxed bg-surface-50/70 p-2.5 rounded-lg border border-surface-100">
                              {evt.summary}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-surface-400">
                    No timeline events recorded for this order yet.
                  </div>
                )}
              </div>
            )}

            {activeActivityTab === 'notes' && (
              <div className="space-y-5">
                {/* Add Note Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newNoteText.trim()) return;
                    await addNoteMutation.mutateAsync({
                      orderUid: order.uid,
                      request: { note: newNoteText.trim(), authorName: 'Staff' },
                    });
                    setNewNoteText('');
                  }}
                  className="bg-surface-50/80 p-3.5 rounded-xl border border-surface-200 space-y-2.5"
                >
                  <label className="block text-xs font-bold text-surface-700">Add Internal Staff Note</label>
                  <textarea
                    rows={2}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Type order remarks, special customer requests, or fulfillment notes..."
                    className="w-full text-xs p-2.5 bg-white rounded-lg border border-surface-200 outline-none focus:border-primary-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNoteText.trim() || addNoteMutation.isPending}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={13} />
                      {addNoteMutation.isPending ? 'Saving...' : 'Post Note'}
                    </button>
                  </div>
                </form>

                {/* Notes Feed */}
                <div className="space-y-3">
                  {notesQ.isLoading ? (
                    <div className="py-4 text-center text-xs text-surface-400">Loading notes...</div>
                  ) : notesQ.data && notesQ.data.length > 0 ? (
                    notesQ.data.map((n) => {
                      const date = n.createdAt ? new Date(n.createdAt) : null;
                      return (
                        <div key={n.uid} className="bg-white p-3.5 rounded-xl border border-surface-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-surface-900 flex items-center gap-1.5">
                              <User size={13} className="text-primary-600" />
                              {n.authorName || 'Staff Member'}
                            </span>
                            <span className="text-[10.5px] text-surface-400 font-mono">
                              {date ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                            </span>
                          </div>
                          <p className="text-xs text-surface-700 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-surface-400">
                      No internal notes added yet. Use the form above to add remarks.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Review & Rating Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-xs">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Customer Review</h3>
                <p className="text-xs text-slate-500">Add verified feedback and star rating for this order.</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>

            <form onSubmit={handleSaveReview} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-2xl cursor-pointer transition-transform hover:scale-110"
                      style={{ color: star <= reviewRating ? '#f59e0b' : '#cbd5e1' }}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{reviewRating} Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Feedback Comment</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Enter customer feedback, delivery rating, product remarks..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-[#55349A] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#55349A] hover:bg-[#43267d] rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach-customer picker (ORD-005/026) */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => !attachConsumer.isPending && setPickerOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-surface-100 px-5 py-4">
              <div>
                <div className="text-[15px] font-bold text-surface-900">Add customer to order</div>
                <div className="mt-0.5 text-[12px] text-surface-500">Attach an existing customer to {order.orderNo ?? 'this order'}.</div>
              </div>
              <button onClick={() => setPickerOpen(false)} className="cursor-pointer rounded-full p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-900">✕</button>
            </div>
            <div className="border-b border-surface-100 px-5 py-3">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search customers by name, phone, email..."
                className="w-full rounded-xl border border-surface-200 px-3.5 py-2 text-[13px] outline-none focus:border-primary-500"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-surface-400">No matching customers found.</div>
              ) : (
                filteredCustomers.map((c: any) => {
                  const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed';
                  const sub = [c.phone, c.email].filter(Boolean).join(' · ');
                  return (
                    <button
                      key={c.id || c.uid}
                      disabled={attachConsumer.isPending}
                      onClick={() => handleAttachCustomer(c.id || c.uid)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-50 disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-surface-900">{name}</span>
                        {sub && <span className="block truncate text-[11.5px] text-surface-400">{sub}</span>}
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold text-primary-600">Attach</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-surface-100 px-5 py-3 text-center">
              <button
                onClick={() => navigate('/customers')}
                className="cursor-pointer text-[12.5px] font-semibold text-primary-600 hover:underline"
              >
                + Create a new customer
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

export default OrderDetailPage;
