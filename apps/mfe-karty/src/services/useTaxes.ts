import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFinanceApi } from './useFinanceApi';

export interface TaxDto {
  uid?: string;
  tenantUid?: string;
  countryCode?: string;
  taxCode: string;
  taxName: string;
  taxRegime: 'GST' | 'VAT' | 'NONE';
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  taxPercentage?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export function useTaxes(filters?: { status?: string; taxType?: string; taxCode?: string; taxName?: string }) {
  const api = useFinanceApi();

  return useQuery({
    queryKey: ['taxes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.taxType) params.append('taxType', filters.taxType);
      if (filters?.taxCode) params.append('taxCode', filters.taxCode);
      if (filters?.taxName) params.append('taxName', filters.taxName);

      const qs = params.toString();
      return api.get<TaxDto[]>(`/v1/api/tenant/tax${qs ? `?${qs}` : ''}`);
    },
    // Tax config changes rarely; without this every mount refetched (React Query's default
    // staleTime is 0). Keyed by `filters` in queryKey already, so different filter
    // combinations still get their own cache entry — this only skips re-fetching the *same*
    // combination on remount.
    staleTime: 5 * 60_000,
  });
}

export function useCreateTax() {
  const api = useFinanceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaxDto) => api.post<TaxDto>('/v1/api/tenant/tax', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });
}

export function useUpdateTax() {
  const api = useFinanceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: Partial<TaxDto> }) =>
      api.put<TaxDto>(`/v1/api/tenant/tax/${uid}`, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });
}

export function useUpdateTaxStatus() {
  const api = useFinanceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, status }: { uid: string; status: string }) =>
      api.put<TaxDto>(`/v1/api/tenant/tax/${uid}/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });
}
