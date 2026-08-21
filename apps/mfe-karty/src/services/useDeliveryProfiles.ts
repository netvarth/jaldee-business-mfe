import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';
import { resolveDelivery, type DeliveryProfileLike, type DeliveryContext } from './deliveryModel';

export interface DeliveryProfileDto {
  uid?: string;
  tenantUid?: string;
  name: string;
  storeUid?: string;
  zones?: Array<Record<string, any>>;
  feeRules?: Record<string, any>;
  active?: boolean;
}

export interface DeliveryPartnerDto {
  uid?: string;
  tenantUid?: string;
  name: string;
  type: string;
  contact?: string;
  apiConfig?: Record<string, any>;
  active?: boolean;
}

/**
 * Delivery fee for an order.
 *
 * The pricing model (legacy single-type bands AND the Phase 1/2 zone→method→rate model) now lives
 * in `deliveryModel.ts`, so this is a thin backward-compatible shim over `resolveDelivery`. Old
 * call sites keep working unchanged: `calculateDeliveryFee(profile, subtotal, weight?, state?)`.
 * New call sites should prefer `resolveDelivery` for the full breakdown (base + handling + COD,
 * zone, method, ETA, serviceability).
 */
export function calculateDeliveryFee(
  profile: any,
  subtotal: number,
  totalWeight: number = 0,
  state: string = ""
): number {
  return resolveDelivery(profile as DeliveryProfileLike, {
    subtotal,
    weightGrams: totalWeight,
    destinationState: state,
  }).fee;
}

// Re-export the resolver surface so checkout/other callers import from one place.
export {
  resolveDelivery,
  availableMethods,
  isV2Profile,
  matchZone,
} from './deliveryModel';
export type {
  DeliveryProfileLike,
  DeliveryContext,
  DeliveryQuote,
  DeliveryZone,
  DeliveryMethod,
  DeliveryRate,
  FeeRulesV2,
} from './deliveryModel';

export function useDeliveryProfiles(filters?: { storeUid?: string; active?: boolean }) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ['delivery-profiles', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.storeUid) params.append('storeUid', filters.storeUid);
      if (filters?.active !== undefined) params.append('active', filters.active.toString());

      const qs = params.toString();
      const data = await api.get<any>(`/v1/api/tenant/delivery-profiles${qs ? `?${qs}` : ''}`);
      const arr = Array.isArray(data) ? data : (data?.content || []);
      return arr as DeliveryProfileDto[];
    },
  });
}

export function useCreateDeliveryProfile() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeliveryProfileDto) => api.post<DeliveryProfileDto>('/v1/api/tenant/delivery-profiles', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-profiles'] });
    },
  });
}

export function useUpdateDeliveryProfile() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<DeliveryProfileDto> }) =>
      api.put<DeliveryProfileDto>(`/v1/api/tenant/delivery-profiles/${uid}`, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-profiles'] });
    },
  });
}

// Delivery Partners (e.g. ShipRocket)

export function useDeliveryPartners(filters?: { active?: boolean }) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ['delivery-partners', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.active !== undefined) params.append('active', filters.active.toString());

      const qs = params.toString();
      return api.get<DeliveryPartnerDto[]>(`/v1/api/tenant/delivery-partners${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useCreateDeliveryPartner() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DeliveryPartnerDto) => api.post<DeliveryPartnerDto>('/v1/api/tenant/delivery-partners', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
    },
  });
}

export function useUpdateDeliveryPartner() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<DeliveryPartnerDto> }) =>
      api.put<DeliveryPartnerDto>(`/v1/api/tenant/delivery-partners/${uid}`, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-partners'] });
    },
  });
}
