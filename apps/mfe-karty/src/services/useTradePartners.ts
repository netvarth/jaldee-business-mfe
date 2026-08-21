import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export type PartnerStatus = "ACTIVE" | "ON_HOLD" | "INACTIVE";

export interface TradePartner {
  uid: string;
  partnerNo?: string;
  name: string;
  displayName?: string;
  gstin?: string;
  panNo?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  assignedStoreUid?: string;
  priceListUid?: string;
  discountPercent?: number;
  creditEnabled?: boolean;
  creditLimit?: number;
  paymentTermsDays?: number;
  outstandingBalance?: number;
  availableCredit?: number;
  financeConsumerUid?: string;
  vendorUid?: string;
  status: PartnerStatus;
  notes?: string;
}

export interface PartnerLedgerEntry {
  uid: string;
  partnerUid: string;
  entryType: "ORDER" | "INVOICE" | "PAYMENT" | "RETURN" | "ADJUSTMENT";
  refUid?: string;
  refNo?: string;
  debit?: number;
  credit?: number;
  balanceAfter?: number;
  entryDate?: string;
  note?: string;
}

export function useTradePartners(search: string = "") {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["trade-partners", search],
    queryFn: async () => {
      const qs = `size=200${search ? `&name=${encodeURIComponent(search)}` : ""}`;
      const raw = await api.get<any>(`/v1/api/tenant/trade-partners?${qs}`);
      return (Array.isArray(raw) ? raw : raw?.content || []) as TradePartner[];
    },
  });
}

export function useTradePartner(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["trade-partner", uid],
    enabled: !!uid,
    queryFn: async () => api.get<TradePartner>(`/v1/api/tenant/trade-partners/${uid}`),
  });
}

export function useSaveTradePartner() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<TradePartner>) =>
      p.uid
        ? api.put<TradePartner>(`/v1/api/tenant/trade-partners/${p.uid}`, p as any)
        : api.post<TradePartner>(`/v1/api/tenant/trade-partners`, p as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade-partners"] }),
  });
}

export function useSetPartnerStatus() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: PartnerStatus }) =>
      api.put(`/v1/api/tenant/trade-partners/${uid}/status/${status}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade-partners"] }),
  });
}

export function usePartnerLedger(uid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["partner-ledger", uid],
    enabled: !!uid,
    queryFn: async () => api.get<PartnerLedgerEntry[]>(`/v1/api/tenant/trade-partners/${uid}/ledger?size=100`),
  });
}
