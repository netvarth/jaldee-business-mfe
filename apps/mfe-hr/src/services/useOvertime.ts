import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * W6 / R5.3 — holiday-work overtime client. Compensation is chosen when
 * raising (DOUBLE_WAGE or COMP_OFF — never both); decisions route through the
 * W1 approval engine. On approval, double wage lands as a SYSTEM monthly
 * input → payslip line; comp-off lands as a CompOffCredit.
 */

export type OvertimeCompensation = "DOUBLE_WAGE" | "COMP_OFF";
export type OvertimeStatus = "Pending" | "Partially_Approved" | "Approved" | "Rejected";

export interface OvertimeRequest {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  workDate?: string;
  holidayName?: string;
  compensation?: OvertimeCompensation;
  status?: OvertimeStatus;
  reason?: string;
  dayWage?: number;
  decidedAt?: string;
  monthlyInputUid?: string;
  compOffCreditUid?: string;
}

export interface HolidayWorked {
  employeeUid?: string;
  employeeName?: string;
  workDate?: string;
  holidayName?: string;
  overtimeRequestUid?: string;
  overtimeStatus?: OvertimeStatus;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useOvertime() {
  const api = useHrApi();
  const [data, setData] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/overtime");
      setData(Array.isArray(res) ? res.map((r) => withId<OvertimeRequest>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load overtime requests"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const raise = useCallback(async (p: { employeeUid: string; workDate: string; compensation: OvertimeCompensation; reason?: string }) => {
    await api.post("/overtime", p); await load();
  }, [api, load]);

  const decide = useCallback(async (uid: string, approve: boolean, comment?: string) => {
    await api.post(`/overtime/${uid}/decide`, { action: approve ? "APPROVE" : "REJECT", comment: comment || null });
    await load();
  }, [api, load]);

  const holidayWorked = useCallback(async (month: string) => {
    const res = await api.get<Record<string, unknown>[]>(`/overtime/holiday-worked?month=${encodeURIComponent(month)}`);
    return Array.isArray(res) ? (res as HolidayWorked[]) : [];
  }, [api]);

  return { data, loading, error, reload: load, raise, decide, holidayWorked };
}

/** R5.1 — monthly branch metrics (feed SLAB components like performance allowance). */
export interface BranchMetric {
  id: string;
  uid?: string;
  locationUid?: string;
  month?: string;
  metricCode?: string;
  metricValue?: number;
}

export function useBranchMetrics(month: string) {
  const api = useHrApi();
  const [data, setData] = useState<BranchMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!month) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/payroll/inputs/branch-metrics?month=${encodeURIComponent(month)}`);
      setData(Array.isArray(res) ? res.map((r) => withId<BranchMetric>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load branch metrics"); setData([]); }
    finally { setLoading(false); }
  }, [api, month]);
  useEffect(() => { void load(); }, [load]);

  const upsert = useCallback(async (p: { locationUid: string; metricCode: string; metricValue: number }) => {
    await api.post("/payroll/inputs/branch-metrics", { ...p, month }); await load();
  }, [api, load, month]);

  const remove = useCallback(async (uid: string) => {
    await api.del(`/payroll/inputs/branch-metrics/${uid}`); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, upsert, remove };
}
