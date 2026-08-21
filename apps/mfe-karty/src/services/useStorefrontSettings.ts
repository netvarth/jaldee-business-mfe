import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

export interface CommerceSettingsDto {
  uid?: string;
  tenantUid?: string;
  primaryCurrency?: string;
  /** Tenant GSTIN — first 2 chars are the state code for the IGST vs CGST/SGST decision. */
  gstin?: string;
  defaultLocationUid?: string;
  timeZone?: string;
  enableSafetyMargin?: boolean;
  lockConfirmedOrders?: boolean;
  autoGstCalculation?: boolean;
  allowGuestCheckout?: boolean;
  themeId?: string | null;
  // Order-workflow toggles (ported from legacy SOrderSettings)
  orderRequiresConsumer?: boolean;
  allowOrderWithoutConsumer?: boolean;
  partnerOrderEnabled?: boolean;
  requireOtpAddToCart?: boolean;
  autoGenerateTask?: boolean;
  orderRequestEnabled?: boolean;
  salesReturnEnabled?: boolean;
  salesReturnDays?: number;
  warehouseRackManagementEnabled?: boolean;
  consumerNotificationEnabled?: boolean;
  providerNotificationEnabled?: boolean;
  feedbackPublish?: boolean;
  reviewEnabled?: boolean;
  autoSendFeedbackLink?: boolean;
  orderRefPrefix?: string;
  /** ORDER numbering: per store (default) or one shared stream across all stores. */
  orderNumberScope?: 'STORE' | 'TENANT';
}

export function useStorefrontSettings() {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ['commerce-settings'],
    queryFn: async () => {
      return api.get<CommerceSettingsDto>('/v1/api/tenant/commerce-settings');
    },
  });
}

export function useUpdateStorefrontSettings() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CommerceSettingsDto) =>
      api.put<CommerceSettingsDto>('/v1/api/tenant/commerce-settings', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commerce-settings'] });
    },
  });
}
