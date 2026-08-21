import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface ExpiryClaimItemDto {
  itemUid: string;
  itemName?: string;
  variantUid?: string;
  batchUid: string;
  batchNumber: string;
  expiryDate: string;
  claimQty: number;
  unitPrice: number;
  lineTotal: number;
  reason?: string;
}

export interface ExpiryClaimDto {
  uid: string;
  claimNo: string;
  storeUid: string;
  storeName?: string;
  vendorUid: string;
  vendorName?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "SETTLED" | "REJECTED";
  totalClaimAmount: number;
  settledAmount?: number;
  notes?: string;
  items: ExpiryClaimItemDto[];
  createdAt: string;
  submittedAt?: string;
  settledAt?: string;
}

export interface NearExpiryBatchDto {
  uid: string;
  storeUid: string;
  storeName?: string;
  itemUid: string;
  itemName: string;
  variantUid?: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate: string;
  isMaturedNoExpiry?: boolean;
  mrp?: number;
  costPrice?: number;
  availableQty: number;
  daysToExpiry: number;
  vendorUid?: string;
  vendorName?: string;
}

export function useNearExpirySweep(thresholdDays: number = 60) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["near-expiry-sweep", thresholdDays],
    queryFn: async () => {
      const data = await api.get<NearExpiryBatchDto[]>(`/v1/api/tenant/pharma/near-expiry-sweep?thresholdDays=${thresholdDays}`);
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useExpiryClaimsList() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["expiry-claims"],
    queryFn: async () => {
      const rawData = await api.get<any>("/v1/api/tenant/pharma/expiry-claims?size=100");
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as ExpiryClaimDto[];
    },
    staleTime: 30_000,
  });
}

export function useCreateExpiryClaim() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExpiryClaimDto>) => {
      return api.post<ExpiryClaimDto>("/v1/api/tenant/pharma/expiry-claims", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expiry-claims"] });
      qc.invalidateQueries({ queryKey: ["near-expiry-sweep"] });
    },
  });
}

export function useUpdateExpiryClaimStatus() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: string }) => {
      return api.patch<ExpiryClaimDto>(`/v1/api/tenant/pharma/expiry-claims/${uid}/status?status=${status}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expiry-claims"] });
    },
  });
}
