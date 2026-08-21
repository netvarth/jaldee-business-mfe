import { useEffect, useState } from 'react';
import {
  useCreateShipment,
  useAvailableCouriers,
  useCreateAwb,
  useGenerateManifest,
  useRequestPickup,
  useTrackShipment,
  useCancelShipment,
  type ShipmentPackageRequest,
} from '../../../services/useShiprocket';
import { useDeliveryPartners } from '../../../services/useDeliveryProfiles';

/**
 * ShipRocket shipment lifecycle for a single order, backed by feature-commerce-service
 * OrderShipRocketController (/v1/api/tenant/orders/{uid}/shiprocket/**).
 *
 * Stages: create shipment -> pick courier (AWB) -> manifest / pickup -> track / cancel.
 * Renders only for courier-fulfilled (SHIP) orders.
 */
export default function OrderShipmentPanel({ orderUid, order }: { orderUid: string; order: any }) {
  const status = String(order?.status ?? '').toUpperCase();
  const fulfillment = String(order?.fulfillmentMethod ?? '').toUpperCase();

  const shipmentId: string | undefined = order?.shiprocketShipmentId;
  const awb: string | undefined = order?.awbCode;
  const statusCode: string | undefined = order?.shiprocketStatusCode;
  const hasShipment = Boolean(shipmentId);
  const hasAwb = Boolean(awb);

  const createShipment = useCreateShipment(orderUid);
  const couriersQ = useAvailableCouriers(orderUid, hasShipment && !hasAwb);
  const createAwb = useCreateAwb(orderUid);
  const generateManifest = useGenerateManifest(orderUid);
  const requestPickup = useRequestPickup(orderUid);
  const cancelShipment = useCancelShipment(orderUid);
  const [trackEnabled, setTrackEnabled] = useState(false);
  const trackQ = useTrackShipment(orderUid, trackEnabled);

  const [form, setForm] = useState<ShipmentPackageRequest>({
    length: '', breadth: '', height: '', weight: '',
    pickupLocation: '', pickupPincode: '',
    deliveryCity: '', deliveryState: '', deliveryPincode: '',
    paymentMethod: 'Prepaid',
  });
  const [pickupDate, setPickupDate] = useState('');
  const set = (k: keyof ShipmentPackageRequest) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Default pickup details from the tenant's active ShipRocket delivery partner (Settings ->
  // Shipping). Falls back to "Primary" only if no partner config is present.
  const partnersQ = useDeliveryPartners({ active: true });
  useEffect(() => {
    const sr = partnersQ.data?.find(
      (p: any) => String(p?.type ?? '').toLowerCase().includes('shiprocket') && p?.active !== false
    );
    const cfg: any = sr?.apiConfig ?? {};
    setForm((f) => ({
      ...f,
      pickupLocation: f.pickupLocation || cfg.pickupLocation || 'Primary',
      pickupPincode: f.pickupPincode || cfg.pickupPincode || '',
    }));
  }, [partnersQ.data]);

  // Courier shipping only.
  if (fulfillment && fulfillment !== 'SHIP') return null;

  const CARD = 'rounded-2xl border border-surface-200 bg-white shadow-xs';
  const inp = 'w-full rounded-lg border border-surface-300 px-2.5 py-1.5 text-sm';
  const btn = 'px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer disabled:opacity-50';
  const primaryBtn = `${btn} text-white bg-primary-600 hover:bg-primary-700 border-primary-600`;
  const ghostBtn = `${btn} text-surface-700 bg-surface-50 hover:bg-surface-100 border-surface-200`;
  const dangerBtn = `${btn} text-red-700 bg-red-50 hover:bg-red-100 border-red-200`;

  const err = (m: any) => (m?.error as any)?.message || (m?.error as any)?.toString?.();

  return (
    <div className={'mb-3.5 ' + CARD + ' px-[22px] py-5'}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-surface-900">Shipment · ShipRocket</div>
        <div className="text-xs text-surface-500">
          {hasAwb ? `AWB ${awb}` : hasShipment ? `Shipment ${shipmentId}` : 'Not shipped'}
          {statusCode ? ` · status ${statusCode}` : ''}
        </div>
      </div>

      {/* Stage 1: create shipment */}
      {!hasShipment && (
        <div>
          {status !== 'CONFIRMED' ? (
            <p className="text-sm text-surface-500">
              Confirm the order before creating a shipment (current status: {status || '—'}).
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input className={inp} placeholder="Length (cm)" value={form.length} onChange={set('length')} />
                <input className={inp} placeholder="Breadth (cm)" value={form.breadth} onChange={set('breadth')} />
                <input className={inp} placeholder="Height (cm)" value={form.height} onChange={set('height')} />
                <input className={inp} placeholder="Weight (kg)" value={form.weight} onChange={set('weight')} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <input className={inp} placeholder="Pickup location (ShipRocket)" value={form.pickupLocation} onChange={set('pickupLocation')} />
                <input className={inp} placeholder="Pickup pincode" value={form.pickupPincode} onChange={set('pickupPincode')} />
                <input className={inp} placeholder="Delivery pincode" value={form.deliveryPincode} onChange={set('deliveryPincode')} />
                <input className={inp} placeholder="Delivery city" value={form.deliveryCity} onChange={set('deliveryCity')} />
                <input className={inp} placeholder="Delivery state" value={form.deliveryState} onChange={set('deliveryState')} />
                <select className={inp} value={form.paymentMethod} onChange={set('paymentMethod')}>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">COD</option>
                </select>
              </div>
              <button
                className={primaryBtn}
                disabled={createShipment.isPending}
                onClick={() => createShipment.mutate(form)}
              >
                {createShipment.isPending ? 'Creating…' : 'Create shipment'}
              </button>
              {createShipment.isError && <p className="text-xs text-red-600">{err(createShipment) || 'Failed to create shipment'}</p>}
            </div>
          )}
        </div>
      )}

      {/* Stage 2: choose courier / generate AWB */}
      {hasShipment && !hasAwb && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-surface-600">Available couriers</div>
          {couriersQ.isLoading && <p className="text-sm text-surface-500">Checking serviceability…</p>}
          {couriersQ.isError && <p className="text-xs text-red-600">Could not load couriers.</p>}
          {couriersQ.data?.length === 0 && <p className="text-sm text-surface-500">No serviceable couriers for this route.</p>}
          <div className="divide-y divide-surface-100">
            {couriersQ.data?.map((c) => (
              <div key={c.courierCompanyId} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-surface-800">{c.courierName}</div>
                  <div className="text-xs text-surface-500">
                    {c.rate != null ? `₹${c.rate}` : ''} {c.estimatedDeliveryDays ? `· ${c.estimatedDeliveryDays} days` : ''}
                    {c.codAvailable ? ' · COD' : ''}
                  </div>
                </div>
                <button
                  className={primaryBtn}
                  disabled={createAwb.isPending}
                  onClick={() => createAwb.mutate(c.courierCompanyId)}
                >
                  {createAwb.isPending ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            ))}
          </div>
          {createAwb.isError && <p className="text-xs text-red-600">{err(createAwb) || 'Failed to assign courier'}</p>}
        </div>
      )}

      {/* Stage 3: post-AWB actions */}
      {hasAwb && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button className={ghostBtn} disabled={generateManifest.isPending} onClick={() => generateManifest.mutate()}>
              {generateManifest.isPending ? 'Generating…' : 'Generate manifest'}
            </button>
            <input type="date" className={inp + ' w-auto'} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            <button
              className={ghostBtn}
              disabled={requestPickup.isPending}
              onClick={() => requestPickup.mutate(pickupDate ? { pickup_date: pickupDate } : {})}
            >
              {requestPickup.isPending ? 'Requesting…' : 'Request pickup'}
            </button>
            <button className={ghostBtn} onClick={() => { setTrackEnabled(true); trackQ.refetch(); }}>
              {trackQ.isFetching ? 'Tracking…' : 'Track'}
            </button>
            <button className={dangerBtn} disabled={cancelShipment.isPending} onClick={() => cancelShipment.mutate()}>
              {cancelShipment.isPending ? 'Cancelling…' : 'Cancel shipment'}
            </button>
          </div>

          {trackEnabled && trackQ.data && (
            <div className="rounded-lg bg-surface-50 px-3 py-2">
              <div className="text-xs font-semibold text-surface-700">
                {trackQ.data.currentStatus || 'Status unavailable'}
                {trackQ.data.courierName ? ` · ${trackQ.data.courierName}` : ''}
              </div>
              <ul className="mt-1 space-y-0.5">
                {(trackQ.data.activities ?? []).slice(0, 8).map((a: any, i: number) => (
                  <li key={i} className="text-[11px] text-surface-500">
                    {(a.date || a['date'] || '')} — {(a.activity || a['activity'] || a.status || '')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
