import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

export interface ProductionOrderLineDto {
  itemUid: string;
  itemName?: string;
  variantUid?: string;
  batchUid?: string;
  batchNumber?: string;
  requiredQty: number;
  consumedQty?: number;
  unitSymbol?: string;
}

export interface ProductionOrderDto {
  uid: string;
  productionNo: string;
  storeUid: string;
  storeName?: string;
  outputItemUid: string;
  outputItemName?: string;
  outputVariantUid?: string;
  targetBatchNumber: string;
  mfgDate: string;
  expiryDate?: string;
  isMaturedNoExpiry?: boolean;
  plannedQty: number;
  actualQtyProduced?: number;
  outputUnitSymbol?: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  components: ProductionOrderLineDto[];
  createdAt: string;
  completedAt?: string;
}

export interface CreateProductionOrderRequest {
  storeUid: string;
  outputItemUid: string;
  outputVariantUid?: string;
  targetBatchNumber: string;
  mfgDate: string;
  expiryDate?: string;
  isMaturedNoExpiry?: boolean;
  plannedQty: number;
  notes?: string;
  components: {
    itemUid: string;
    variantUid?: string;
    batchUid?: string;
    requiredQty: number;
  }[];
}

export function useProductionOrders(storeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['production-orders', storeUid],
    queryFn: async () => {
      const url = storeUid
        ? `/v1/api/tenant/pharma/production-orders?storeUid=${storeUid}`
        : '/v1/api/tenant/pharma/production-orders';
      // Backend returns a paginated {content,page} object here, not a bare array. Unwrap it so the
      // page can .filter()/.map() the list instead of crashing on a non-array response. (QA P1)
      const data = await api.get<ProductionOrderDto[] | { content?: ProductionOrderDto[] }>(url);
      return Array.isArray(data) ? data : (data?.content ?? []);
    },
    staleTime: 30_000,
  });
}

export function useCreateProductionOrder() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductionOrderRequest) => {
      return api.post<ProductionOrderDto>('/v1/api/tenant/pharma/production-orders', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}

export function useCompleteProductionOrder() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, actualQtyProduced }: { uid: string; actualQtyProduced: number }) => {
      return api.post<ProductionOrderDto>(`/v1/api/tenant/pharma/production-orders/${uid}/complete`, { actualQtyProduced });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-orders'] });
      qc.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}

export function useCancelProductionOrder() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => {
      return api.post<ProductionOrderDto>(`/v1/api/tenant/pharma/production-orders/${uid}/cancel`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-orders'] });
    },
  });
}
