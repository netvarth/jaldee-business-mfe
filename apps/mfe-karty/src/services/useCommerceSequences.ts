import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

/**
 * Commerce document sequences (running numbers with configurable prefix/suffix/pad).
 * Backed by feature-commerce-service:
 *   GET  /v1/api/tenant/commerce-settings/sequences   -> SequenceDto[]
 *   PUT  /v1/api/tenant/commerce-settings/sequences   -> SequenceDto (upsert)
 *
 * A sequence is keyed by (scope, storeUid). storeUid = the sentinel below means
 * "tenant-level / all stores share one sequence".
 */

export const TENANT_LEVEL_STORE = '00000000-0000-0000-0000-000000000000';

export type SequenceScope =
  | 'ORDER'
  | 'INVOICE'
  | 'CUSTOMER'
  | 'BATCH'
  | 'TRANSFER'
  | 'PURCHASE'
  | 'PURCHASE_RETURN'
  | 'ITEM'
  | 'PURCHASE_ORDER'
  | 'PARTNER';

export interface SequenceDto {
  uid?: string;
  tenantUid?: string;
  scope: SequenceScope;
  /** Store this config belongs to; omit/sentinel = tenant-level. */
  storeUid?: string;
  prefix?: string;
  suffix?: string;
  /** Next running number to hand out. */
  nextNumber?: number;
  /** Zero-pad width (5 -> 00001). 1 = no padding. */
  padLength?: number;
  /** Populated by the reserve endpoint only. */
  formatted?: string;
}

export function useSequences() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['commerce-sequences'],
    queryFn: () => api.get<SequenceDto[]>('/v1/api/tenant/commerce-settings/sequences'),
  });
}

export function useUpsertSequence() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SequenceDto) =>
      api.put<SequenceDto>('/v1/api/tenant/commerce-settings/sequences', dto as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commerce-sequences'] });
    },
  });
}

/** Preview a formatted number without persisting, mirroring the backend's format(). */
export function formatPreview(
  prefix: string | undefined,
  n: number,
  suffix: string | undefined,
  padLength: number | undefined,
): string {
  const width = padLength && padLength > 1 ? padLength : 0;
  const body = width > 0 ? String(n).padStart(width, '0') : String(n);
  return `${prefix ?? ''}${body}${suffix ?? ''}`;
}
