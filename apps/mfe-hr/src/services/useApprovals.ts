import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * W1 / R4.2 — approval engine client.
 * Chains configure ordered approver-resolver steps per request type; step
 * records are the per-request timeline. Decisions themselves go through each
 * module's endpoint (e.g. POST /leaves/{uid}/approve).
 */

export type ApprovalRequestType = "LEAVE" | "EXPENSE" | "EXIT" | "ON_DUTY" | "COMP_OFF";
export type ApproverResolverType = "REPORTING_MANAGER" | "NAMED_EMPLOYEE" | "HIERARCHY_LEVEL";

export const RESOLVER_LABELS: Record<ApproverResolverType, string> = {
  REPORTING_MANAGER: "Reporting manager",
  NAMED_EMPLOYEE: "Named employee",
  HIERARCHY_LEVEL: "Hierarchy level",
};

export interface ApprovalChainStep {
  uid?: string;
  stepOrder: number;
  resolverType: ApproverResolverType;
  resolverValue?: string | null;
}

export interface ApprovalChain {
  id: string;
  uid?: string;
  requestType: ApprovalRequestType;
  name: string;
  active: boolean;
  steps: ApprovalChainStep[];
}

export interface ApprovalStepRecord {
  id: string;
  uid?: string;
  requestType: ApprovalRequestType;
  requestUid: string;
  stepOrder: number;
  approverUid: string;
  approverName?: string;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  comment?: string;
  decidedAt?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useApprovalChains() {
  const api = useHrApi();
  const [data, setData] = useState<ApprovalChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/approvals/chains");
      setData(Array.isArray(res) ? res.map((r) => withId<ApprovalChain>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load approval chains"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (payload: Omit<ApprovalChain, "id" | "uid">) => {
    await api.post("/approvals/chains", payload); await load();
  }, [api, load]);
  const update = useCallback(async (uid: string, payload: Omit<ApprovalChain, "id" | "uid">) => {
    await api.put(`/approvals/chains/${uid}`, payload); await load();
  }, [api, load]);
  const remove = useCallback(async (uid: string) => {
    await api.del(`/approvals/chains/${uid}`); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, create, update, remove };
}

/** Timeline for one request; requestUid null/undefined skips loading. */
export function useApprovalSteps(requestType: ApprovalRequestType, requestUid?: string | null) {
  const api = useHrApi();
  const [data, setData] = useState<ApprovalStepRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!requestUid) { setData([]); return; }
    setLoading(true);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/approvals/${requestType}/${requestUid}/steps`);
      setData(Array.isArray(res) ? res.map((r) => withId<ApprovalStepRecord>(r)) : []);
    } catch {
      setData([]); // no chain / engine not initiated → no timeline to show
    } finally { setLoading(false); }
  }, [api, requestType, requestUid]);
  useEffect(() => { void load(); }, [load]);

  return { data, loading, reload: load };
}

/** Steps currently waiting on the signed-in approver. */
export function useMyPendingApprovals() {
  const api = useHrApi();
  const [data, setData] = useState<ApprovalStepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/approvals/pending");
      setData(Array.isArray(res) ? res.map((r) => withId<ApprovalStepRecord>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load pending approvals"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}
