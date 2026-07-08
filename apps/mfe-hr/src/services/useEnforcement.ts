import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * T2c / E5 — attendance enforcement rule engine client. Rules are pure tenant
 * config (trigger + condition catalog + params + action); no rules = no
 * behaviour change. A blocked punch-out surfaces as an error containing
 * ENFORCEMENT_BLOCKED — use isEnforcementBlocked() and open the ack flow.
 */

export type EnforcementTrigger = "PUNCH_IN" | "PUNCH_OUT" | "PERIOD_CLOSE";
export type EnforcementCondition =
  | "UNACKED_MANDATORY_CIRCULAR"
  | "OUTSIDE_ASSIGNED_BRANCHES"
  | "EARLY_DEPARTURE_EXCEEDS_ALLOWANCE"
  | "VIOLATIONS_EXCEED_THRESHOLD";
export type EnforcementAction = "BLOCK" | "FLAG" | "WARN" | "LOP";

export const CONDITION_META: Record<EnforcementCondition, {
  label: string; triggers: EnforcementTrigger[]; paramHints: { key: string; label: string; type: "number" | "text" }[];
}> = {
  UNACKED_MANDATORY_CIRCULAR: {
    label: "Unacknowledged mandatory circular",
    triggers: ["PUNCH_OUT"],
    paramHints: [],
  },
  OUTSIDE_ASSIGNED_BRANCHES: {
    label: "Punch outside assigned branches",
    triggers: ["PUNCH_IN"],
    paramHints: [],
  },
  EARLY_DEPARTURE_EXCEEDS_ALLOWANCE: {
    label: "Early departure beyond monthly allowance",
    triggers: ["PUNCH_OUT"],
    paramHints: [
      { key: "allowancePerMonth", label: "Allowed early leaves / month", type: "number" },
      { key: "thresholdMinutes", label: "Minutes early before it counts", type: "number" },
    ],
  },
  VIOLATIONS_EXCEED_THRESHOLD: {
    label: "Monthly violations exceed threshold (→ penalty)",
    triggers: ["PERIOD_CLOSE"],
    paramHints: [
      { key: "violationThreshold", label: "Violations before penalty", type: "number" },
      { key: "lopDays", label: "LOP days to apply", type: "number" },
    ],
  },
};

export interface EnforcementRule {
  id: string;
  uid?: string;
  name?: string;
  triggerEvent?: EnforcementTrigger;
  conditionType?: EnforcementCondition;
  action?: EnforcementAction;
  params?: Record<string, unknown>;
  active?: boolean;
}

export interface EnforcementViolation {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  ruleUid?: string;
  ruleName?: string;
  occurredOn?: string;
  triggerEvent?: EnforcementTrigger;
  conditionType?: EnforcementCondition;
  action?: EnforcementAction;
  detail?: string;
  resolved?: boolean;
  penaltyApplied?: boolean;
}

export interface UnackedCircular {
  id: string;
  uid?: string;
  title?: string;
  description?: string;
}

export function isEnforcementBlocked(e: unknown): boolean {
  return e instanceof Error && /ENFORCEMENT_BLOCKED/.test(e.message);
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useEnforcementRules() {
  const api = useHrApi();
  const [data, setData] = useState<EnforcementRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/enforcement/rules");
      setData(Array.isArray(res) ? res.map((r) => withId<EnforcementRule>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load enforcement rules"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (p: Record<string, unknown>) => { await api.post("/enforcement/rules", p); await load(); }, [api, load]);
  const update = useCallback(async (uid: string, p: Record<string, unknown>) => { await api.put(`/enforcement/rules/${uid}`, p); await load(); }, [api, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`/enforcement/rules/${uid}`); await load(); }, [api, load]);
  return { data, loading, error, reload: load, create, update, remove };
}

export function useEnforcementViolations(employeeUid?: string, month?: string) {
  const api = useHrApi();
  const [data, setData] = useState<EnforcementViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const qs = [employeeUid ? `employeeUid=${employeeUid}` : "", month ? `month=${month}` : ""].filter(Boolean).join("&");
      const res = await api.get<Record<string, unknown>[]>(`/enforcement/violations${qs ? `?${qs}` : ""}`);
      setData(Array.isArray(res) ? res.map((r) => withId<EnforcementViolation>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load violations"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid, month]);
  useEffect(() => { void load(); }, [load]);
  const resolve = useCallback(async (uid: string) => { await api.post(`/enforcement/violations/${uid}/resolve`); await load(); }, [api, load]);
  const applyPenalties = useCallback(async (m: string) => { const r = await api.post<Record<string, unknown>>(`/enforcement/apply-penalties?month=${m}`); await load(); return r; }, [api, load]);
  return { data, loading, error, reload: load, resolve, applyPenalties };
}

/** The punch-out ack flow: fetch pending mandatory circulars + acknowledge them. */
export function useAckFlow() {
  const api = useHrApi();
  const fetchPending = useCallback(async (employeeUid: string): Promise<UnackedCircular[]> => {
    const res = await api.get<Record<string, unknown>[]>(`/enforcement/unacknowledged/${employeeUid}`);
    return Array.isArray(res) ? res.map((r) => withId<UnackedCircular>(r)) : [];
  }, [api]);
  const acknowledge = useCallback(async (announcementUid: string, employeeUid: string) => {
    await api.post(`/announcements/${announcementUid}/acknowledge?employeeUid=${employeeUid}`);
  }, [api]);
  return { fetchPending, acknowledge };
}
