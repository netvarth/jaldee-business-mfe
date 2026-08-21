/**
 * Distributor–Dealer Connections.
 *
 * Consented, revocable data-sharing + order routing between two separate Karty tenant
 * accounts. Backed by feature-commerce-service `/v1/api/tenant/connections`.
 *
 * The calling tenant is always one party (distributor or dealer) of every connection it
 * can see; the backend resolves the caller from the JWT and enforces the direction rules
 * (only the counterparty can approve/reject; only the dealer configures scope; only the
 * distributor reads the dealer's stock/orders/trends).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export type ConnectionStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED" | "REJECTED";
export type ConnectionInitiator = "DISTRIBUTOR" | "DEALER";
export type ConnectionScopeType = "FULL" | "CATALOG" | "ITEM";

export interface ConnectionScope {
  connectionUid?: string;
  scopeType: ConnectionScopeType;
  scopedCatalogUids?: string[];
  scopedItemUids?: string[];
  capReadStock: boolean;
  capReadOrders: boolean;
  capReadTrends: boolean;
  capOrderCreate: boolean;
  capSsoDrilldown: boolean;
  includeSellout: boolean;
}

export interface PartnerConnection {
  uid: string;
  distributorTenantUid: string;
  dealerTenantUid: string;
  status: ConnectionStatus;
  initiatedBy: ConnectionInitiator;
  requestedAt?: string;
  approvedAt?: string;
  revokedAt?: string;
  scope?: ConnectionScope;
}

export interface ConnectionRequest {
  distributorTenantUid: string;
  dealerTenantUid: string;
  initiatedBy: ConnectionInitiator;
}

export interface ConnectionAuditEntry {
  uid: string;
  connectionUid: string;
  actorTenantUid: string;
  actorUserUid?: string;
  action: string;
  scopeSnapshot?: string;
  timestamp?: string;
}

export interface DealerStockItem {
  itemUid?: string;
  itemName?: string;
  itemSku?: string;
  onHandQty?: number;
  unitUid?: string;
  unitName?: string;
}
export interface DealerStock {
  connectionUid: string;
  dealerTenantUid: string;
  asOfTimestamp?: string;
  items: DealerStockItem[];
}

export interface DealerOrderSummary {
  orderUid?: string;
  orderNo?: string;
  status?: string;
  totalAmount?: number;
  orderDate?: string;
}
export interface DealerOrders {
  connectionUid: string;
  dealerTenantUid: string;
  asOfTimestamp?: string;
  orders: DealerOrderSummary[];
}

export interface DealerTrends {
  connectionUid: string;
  dealerTenantUid: string;
  period: string;
  asOfTimestamp?: string;
  totalOrdersCount: number;
  totalDemandAmount?: number;
  topDemandedItems: { itemUid?: string; itemName?: string; totalQuantity?: number; totalAmount?: number }[];
}

const BASE = "/v1/api/tenant/connections";

// ─── Queries ──────────────────────────────────────────────────────────────

export function useConnections() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const raw = await api.get<any>(`${BASE}?size=200&sort=requestedAt,desc`);
      return (Array.isArray(raw) ? raw : raw?.content || []) as PartnerConnection[];
    },
  });
}

export function useConnectionAudit(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["connection-audit", uid],
    enabled: !!uid,
    queryFn: async () => {
      const raw = await api.get<any>(`${BASE}/${uid}/audit?size=100&sort=timestamp,desc`);
      return (Array.isArray(raw) ? raw : raw?.content || []) as ConnectionAuditEntry[];
    },
  });
}

export function useDealerStock(uid?: string, enabled = false) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["connection-stock", uid],
    enabled: !!uid && enabled,
    queryFn: async () => api.get<DealerStock>(`${BASE}/${uid}/stock`),
  });
}

export function useDealerOrders(uid?: string, enabled = false) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["connection-orders", uid],
    enabled: !!uid && enabled,
    queryFn: async () => api.get<DealerOrders>(`${BASE}/${uid}/orders`),
  });
}

export function useDealerTrends(uid?: string, period = "30D", enabled = false) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["connection-trends", uid, period],
    enabled: !!uid && enabled,
    queryFn: async () => api.get<DealerTrends>(`${BASE}/${uid}/trends?period=${encodeURIComponent(period)}`),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useRequestConnection() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ConnectionRequest) => api.post<PartnerConnection>(`${BASE}/request`, body as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

/** Lifecycle transitions: approve | reject | suspend | revoke. */
export function useConnectionAction() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, action }: { uid: string; action: "approve" | "reject" | "suspend" | "revoke" }) =>
      api.post<PartnerConnection>(`${BASE}/${uid}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["connection-audit"] });
    },
  });
}

export function useUpdateScope() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, scope }: { uid: string; scope: ConnectionScope }) =>
      api.put<PartnerConnection>(`${BASE}/${uid}/scope`, scope as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["connection-audit"] });
    },
  });
}
