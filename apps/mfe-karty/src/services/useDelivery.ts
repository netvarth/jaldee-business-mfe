import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Delivery/logistics resources, backed by three commerce controllers:
 *   /v1/api/tenant/delivery-partners  — carriers (Shiprocket, own fleet, …)
 *   /v1/api/tenant/delivery-agents    — individual riders, optionally tied to a partner/store
 *   /v1/api/tenant/delivery-profiles  — zone + fee rules used at checkout
 */

export interface DeliveryPartner {
  uid: string;
  name?: string;
  type?: string;
  contact?: string;
  apiConfig?: Record<string, unknown>;
  active?: boolean;
}

export interface DeliveryAgent {
  uid: string;
  name?: string;
  phone?: string;
  vehicleNo?: string;
  storeUid?: string;
  partnerUid?: string;
  active?: boolean;
}

export interface DeliveryProfile {
  uid: string;
  name?: string;
  storeUid?: string;
  /** Free-form zone definitions; shape is tenant-defined, so treat as opaque. */
  zones?: Array<Record<string, unknown>>;
  feeRules?: Record<string, unknown>;
  active?: boolean;
}

const unwrap = <T,>(data: any): T[] => (Array.isArray(data) ? data : data?.content ?? []);

/* ---------------- partners ---------------- */

export function useDeliveryPartners(search = "") {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["delivery-partners", search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "0", size: "100" });
      if (search) params.append("name", search);
      const data = await api.get<any>(`/v1/api/tenant/delivery-partners?${params.toString()}`);
      return unwrap<DeliveryPartner>(data);
    },
  });
}

export function useSaveDeliveryPartner() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid?: string; payload: Partial<DeliveryPartner> }) =>
      uid
        ? api.put(`/v1/api/tenant/delivery-partners/${uid}`, payload as any)
        : api.post(`/v1/api/tenant/delivery-partners`, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-partners"] }),
  });
}

export function useDeleteDeliveryPartner() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => api.del(`/v1/api/tenant/delivery-partners/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-partners"] }),
  });
}

/* ---------------- agents ---------------- */

/** Agents are listed per store; omit storeUid for all of them. */
export function useDeliveryAgents(storeUid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["delivery-agents", storeUid ?? "all"],
    queryFn: async () => {
      const qs = storeUid && storeUid !== "all" ? `?storeUid=${encodeURIComponent(storeUid)}` : "";
      const data = await api.get<any>(`/v1/api/tenant/delivery-agents${qs}`);
      return unwrap<DeliveryAgent>(data);
    },
  });
}

export function useSaveDeliveryAgent() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid?: string; payload: Partial<DeliveryAgent> }) =>
      uid
        ? api.put(`/v1/api/tenant/delivery-agents/${uid}`, payload as any)
        : api.post(`/v1/api/tenant/delivery-agents`, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-agents"] }),
  });
}

export function useDeleteDeliveryAgent() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => api.del(`/v1/api/tenant/delivery-agents/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-agents"] }),
  });
}

/* ---------------- profiles ---------------- */

export function useDeliveryProfiles(storeUid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["delivery-profiles", storeUid ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "0", size: "100" });
      if (storeUid && storeUid !== "all") params.append("storeUid", storeUid);
      const data = await api.get<any>(`/v1/api/tenant/delivery-profiles?${params.toString()}`);
      return unwrap<DeliveryProfile>(data);
    },
  });
}

export function useSaveDeliveryProfile() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid?: string; payload: Partial<DeliveryProfile> }) =>
      uid
        ? api.put(`/v1/api/tenant/delivery-profiles/${uid}`, payload as any)
        : api.post(`/v1/api/tenant/delivery-profiles`, payload as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-profiles"] }),
  });
}

export function useDeleteDeliveryProfile() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => api.del(`/v1/api/tenant/delivery-profiles/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["delivery-profiles"] }),
  });
}
