import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

export interface CompositionDto {
  uid: string;
  name: string; // e.g. Paracetamol, Amoxicillin
  code?: string;
  therapeuticClass?: string; // e.g. Analgesic, Antibiotic
  description?: string;
  active: boolean;
  linkedItemsCount?: number;
}

export interface ItemCompositionLinkDto {
  uid: string;
  itemUid: string;
  compositionUid: string;
  compositionName?: string;
  strength: number; // e.g. 500
  strengthUnit: string; // e.g. mg, ml, %
  isPrimary: boolean;
}

export interface SubstituteDrugDto {
  itemUid: string;
  itemName: string;
  brandName?: string;
  manufacturer?: string;
  drugSchedule?: string;
  compositionSummary: string;
  mrp: number;
  sellingPrice: number;
  savingsPercentage: number;
  inStock: boolean;
  availableStockQty: number;
  baseUnitSymbol?: string;
  batchesCount: number;
}

export function useCompositions() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['compositions'],
    queryFn: async () => {
      // Backend returns a paginated {content,page} object here, not a bare array. Unwrap it so the
      // page can .filter()/.map() the list instead of crashing on a non-array response. (QA P1)
      const data = await api.get<CompositionDto[] | { content?: CompositionDto[] }>('/v1/api/tenant/pharma/compositions');
      return Array.isArray(data) ? data : (data?.content ?? []);
    },
    staleTime: 60_000,
  });
}

export function useCreateComposition() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; therapeuticClass?: string; description?: string }) => {
      return api.post<CompositionDto>('/v1/api/tenant/pharma/compositions', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compositions'] });
    },
  });
}

export function useItemCompositions(itemUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['item-compositions', itemUid],
    queryFn: async () => {
      if (!itemUid) return [];
      const data = await api.get<ItemCompositionLinkDto[]>(`/v1/api/tenant/pharma/items/${itemUid}/compositions`);
      return data || [];
    },
    enabled: !!itemUid,
    staleTime: 60_000,
  });
}

export function useLinkItemComposition() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemUid, payload }: { itemUid: string; payload: { compositionUid: string; strength: number; strengthUnit: string; isPrimary?: boolean } }) => {
      return api.post<ItemCompositionLinkDto>(`/v1/api/tenant/pharma/items/compositions`, payload);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['item-compositions', variables.itemUid] });
      qc.invalidateQueries({ queryKey: ['compositions'] });
    },
  });
}

export function useSubstitutes(itemUid?: string, storeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['item-substitutes', itemUid, storeUid],
    queryFn: async () => {
      if (!itemUid) return [];
      const q = storeUid ? `?storeUid=${storeUid}` : '';
      const data = await api.get<SubstituteDrugDto[]>(`/v1/api/tenant/pharma/items/${itemUid}/substitutes${q}`);
      return data || [];
    },
    enabled: !!itemUid,
    staleTime: 30_000,
  });
}
