import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

export interface PrescriberInfo {
  doctorName: string;
  doctorRegNo?: string;
  hospitalName?: string;
  clinicAddress?: string;
}

export interface PatientInfo {
  name: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  address?: string;
  consumerUid?: string;
}

export interface RxDispenseItemDto {
  itemUid: string;
  itemName?: string;
  variantUid?: string;
  batchUid?: string;
  batchNumber?: string;
  expiryDate?: string;
  prescribedQty: number;
  dispensedQty: number;
  balanceQty?: number;
  unitPrice?: number;
  lineTotal?: number;
  dose?: string;
  frequency?: string;
  durationDays?: number;
  drugSchedule?: string;
  ayushType?: string;
  isControlled?: boolean;
}

export interface RxDispenseQuoteRequest {
  storeUid: string;
  prescriber: PrescriberInfo;
  patient: PatientInfo;
  prescriptionRef?: string;
  prescriptionDate?: string;
  prescriptionUrl?: string;
  items: RxDispenseItemDto[];
}

export interface RxDispenseQuoteResponse {
  storeUid: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  controlledDrugsCount: number;
  warnings: string[];
  items: RxDispenseItemDto[];
}

export interface RxDispenseRecordDto {
  uid: string;
  dispenseNo: string;
  storeUid: string;
  storeName?: string;
  orderUid?: string;
  orderNo?: string;
  prescriptionRef?: string;
  prescriptionDate?: string;
  prescriber: PrescriberInfo;
  patient: PatientInfo;
  status: 'DISPENSED' | 'PARTIAL' | 'CANCELLED';
  totalAmount: number;
  items: RxDispenseItemDto[];
  createdAt: string;
  dispensedBy?: string;
}

export function useRxDispenseList(storeUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['rx-dispenses', storeUid],
    queryFn: async () => {
      const url = storeUid
        ? `/v1/api/tenant/rx-dispense?storeUid=${storeUid}`
        : '/v1/api/tenant/rx-dispense';
      const data = await api.get<RxDispenseRecordDto[]>(url);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useRxDispenseQuote() {
  const api = useCommerceApi();
  return useMutation({
    mutationFn: async (payload: RxDispenseQuoteRequest) => {
      return api.post<RxDispenseQuoteResponse>('/v1/api/tenant/rx-dispense/quote', payload);
    },
  });
}

export function useCreateRxDispense() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RxDispenseQuoteRequest) => {
      return api.post<RxDispenseRecordDto>('/v1/api/tenant/rx-dispense', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rx-dispenses'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['drug-register'] });
    },
  });
}

export function usePrescriptionDispenses(rxRef?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['prescription-dispenses', rxRef],
    queryFn: async () => {
      if (!rxRef) return [];
      const data = await api.get<RxDispenseRecordDto[]>(`/v1/api/tenant/rx-dispense/prescription/${rxRef}`);
      return data || [];
    },
    enabled: !!rxRef,
    staleTime: 60_000,
  });
}
