import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * ShipRocket outbound logistics for a sales order, backed by feature-commerce-service
 * `OrderShipRocketController` under:
 *   /v1/api/tenant/orders/{orderUid}/shiprocket/**
 *
 * Flow: createShipment -> availableCouriers -> createAwb(courier) -> generateManifest
 *       -> requestPickup -> (track / cancel). Inbound status updates arrive via the
 *       /webhook/shiprocket callback and are reflected on the order automatically.
 *
 * NOTE: this replaces the legacy shared-modules order service, whose ShipRocket calls
 * targeted the old monolith paths (provider/shipment/shipRocket/...). Those do not exist
 * on the new commerce service.
 */

export interface ShipmentPackageRequest {
  length: string;
  breadth: string;
  height: string;
  weight: string;
  pickupLocation: string;
  pickupPincode?: string;
  deliveryName?: string;
  deliveryPhone?: string;
  deliveryEmail?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode: string;
  deliveryCountry?: string;
  paymentMethod?: "Prepaid" | "COD";
  subTotal?: number;
}

export interface ShipmentCourier {
  courierCompanyId: string;
  courierName: string;
  rate?: number;
  estimatedDeliveryDays?: string;
  etd?: string;
  codAvailable?: boolean;
}

export interface ShipmentTracking {
  awb?: string;
  shipmentId?: string;
  currentStatus?: string;
  currentStatusCode?: string;
  courierName?: string;
  activities?: Array<Record<string, unknown>>;
}

const base = (orderUid: string) => `/v1/api/tenant/orders/${orderUid}/shiprocket`;

function useInvalidateOrder(orderUid: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order", orderUid] });
  };
}

/** Create the ShipRocket shipment (adhoc order). Order must be CONFIRMED + SHIP fulfillment. */
export function useCreateShipment(orderUid: string) {
  const api = useCommerceApi();
  const invalidate = useInvalidateOrder(orderUid);
  return useMutation({
    mutationFn: (payload: ShipmentPackageRequest) =>
      api.post<Record<string, unknown>>(`${base(orderUid)}/shipment/create`, payload as any),
    onSuccess: invalidate,
  });
}

/** Serviceable couriers for the created shipment. Enabled only once a shipment exists. */
export function useAvailableCouriers(orderUid: string, hasShipment: boolean) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["shiprocket-couriers", orderUid],
    enabled: Boolean(orderUid) && hasShipment,
    queryFn: () => api.get<ShipmentCourier[]>(`${base(orderUid)}/shipment/availableCouriers`),
  });
}

/** Assign a courier and generate the AWB. */
export function useCreateAwb(orderUid: string) {
  const api = useCommerceApi();
  const invalidate = useInvalidateOrder(orderUid);
  return useMutation({
    mutationFn: (courierId: string | number) =>
      api.put<Record<string, unknown>>(`${base(orderUid)}/courier/${courierId}/createAwb`),
    onSuccess: invalidate,
  });
}

export function useGenerateManifest(orderUid: string) {
  const api = useCommerceApi();
  return useMutation({
    mutationFn: () => api.put<Record<string, unknown>>(`${base(orderUid)}/generateManifest`),
  });
}

export function useRequestPickup(orderUid: string) {
  const api = useCommerceApi();
  const invalidate = useInvalidateOrder(orderUid);
  return useMutation({
    mutationFn: (data: { pickup_date?: string } & Record<string, unknown> = {}) =>
      api.put<Record<string, unknown>>(`${base(orderUid)}/requestForShipmentPickup`, data as any),
    onSuccess: invalidate,
  });
}

export function useTrackShipment(orderUid: string, enabled = false) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["shiprocket-track", orderUid],
    enabled: Boolean(orderUid) && enabled,
    queryFn: () => api.put<ShipmentTracking>(`${base(orderUid)}/shipment/track`),
  });
}

export function useCancelShipment(orderUid: string) {
  const api = useCommerceApi();
  const invalidate = useInvalidateOrder(orderUid);
  return useMutation({
    mutationFn: () => api.put<{ cancelled: boolean }>(`${base(orderUid)}/shipment/cancel`),
    onSuccess: invalidate,
  });
}
