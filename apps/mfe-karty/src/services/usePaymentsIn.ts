import { useMutation } from '@tanstack/react-query';
import { useFinanceApi } from './useFinanceApi';

export interface PaymentDto {
  uid?: string;
  amount: number;
  currency?: string;
  mode: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'NET_BANKING' | 'WALLET' | 'CHEQUE';
  paymentRefId?: string;
  paymentFor?: string;
  paymentForUid?: string;
  paymentForRefId?: string;
  description?: string;
  statusName?: string;
  paymentOn?: string;
}

export function useCreatePaymentIn() {
  const api = useFinanceApi();

  return useMutation({
    mutationFn: (data: PaymentDto) => api.post<PaymentDto>('/v1/api/tenant/payments-in', data as any),
  });
}
