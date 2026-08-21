import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

/**
 * Commerce audit logs, backed by AuditlogController (/v1/api/tenant/audit-logs),
 * which delegates to the shared-audit AuditLogQueryService.
 *
 * Coverage caveat: commerce operations are not yet instrumented with @AuditLog — that
 * needs AuditlogContext values for commerce entities, which live in the shared-audit
 * library. So an empty result here means "nothing is being recorded yet", not "nothing
 * happened". The screen states that explicitly rather than showing a bare empty table.
 */

export interface AuditLog {
  id: number;
  uid?: string;
  sourceService?: string;
  feature?: string;
  featureModule?: string;
  auditlogContext?: string;
  entityName?: string;
  entityUid?: string;
  entityId?: number;
  action?: string;
  subject?: string;
  message?: string;
  actorUserId?: string;
  actorUserName?: string;
  actorUserType?: string;
  sourceIp?: string;
  correlationId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
  createdAt?: string;
}

export interface AuditLogQuery {
  page?: number;
  size?: number;
  entityName?: string;
  action?: string;
  /** ISO-8601 date-time, inclusive. */
  from?: string;
  to?: string;
}

function toParams(q: AuditLogQuery | undefined, opts: { paged: boolean }) {
  const params = new URLSearchParams();
  if (opts.paged) {
    params.append("page", String(q?.page ?? 0));
    params.append("size", String(q?.size ?? 50));
  }
  if (q?.entityName) params.append("entityName", q.entityName);
  if (q?.action) params.append("action", q.action);
  if (q?.from) params.append("from", q.from);
  if (q?.to) params.append("to", q.to);
  return params;
}

export function useAuditLogs(query?: AuditLogQuery) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["audit-logs", query],
    queryFn: async () => {
      const qs = toParams(query, { paged: true }).toString();
      // Controller returns Spring's Page<T>, so rows live under `content`.
      const data = await api.get<any>(`/v1/api/tenant/audit-logs?${qs}`);
      return {
        rows: (Array.isArray(data) ? data : data?.content ?? []) as AuditLog[],
        total: Number(data?.totalElements ?? 0) || 0,
      };
    },
  });
}
