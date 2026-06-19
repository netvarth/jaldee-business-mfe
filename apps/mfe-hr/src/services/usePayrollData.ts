import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

export interface PayslipEarnings {
  basic?: number; hra?: number; allowance?: number; bonus?: number; gross?: number;
}
export interface PayslipDeductions {
  pf?: number; tax?: number; other?: number;
  esi?: number; professionalTax?: number; tds?: number; lwf?: number;
  total?: number;
  pfEmployer?: number; esiEmployer?: number;
}
export interface Payslip {
  id: string; uid?: string; employeeUid?: string; month?: string;
  netPay?: number; status?: string; generatedAt?: string;
  earnings?: PayslipEarnings; deductions?: PayslipDeductions;
}
export interface PayrollRun {
  id: string; uid?: string; month?: string; status?: string;
  totalPayout?: number; totalEmployerCost?: number; totalDeductions?: number;
  employeeCount?: number; processedAt?: string;
}
export interface PayrollPlan {
  id: string; uid?: string; name?: string; basic?: number; hra?: number;
  allowance?: number; otherDeductions?: number;
  // JSON keys match the backend (pf=pfEmployee, tax=tds)
  pf?: number; tax?: number;
  pfEmployer?: number; esiEmployee?: number; esiEmployer?: number;
  professionalTax?: number; lwf?: number;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function useList<T extends { uid?: string; id?: string }>(endpoint: string) {
  const api = useHrApi();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(endpoint);
      setData(Array.isArray(res) ? res.map((r) => withId<T>(r)) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${endpoint}`);
      setData([]);
    } finally { setLoading(false); }
  }, [api, endpoint]);
  useEffect(() => { void load(); }, [load]);
  return { api, data, loading, error, reload: load };
}

export function usePayslips() {
  const { api, data, loading, error, reload } = useList<Payslip>("/payroll/payslips/all");
  const generate = useCallback(async (employeeUid: string, month: string) => {
    await api.post(`/payroll/generate?employeeUid=${encodeURIComponent(employeeUid)}&month=${encodeURIComponent(month)}`);
    await reload();
  }, [api, reload]);
  return { data, loading, error, reload, generate };
}

export function usePayrollRuns() {
  const { api, data, loading, error, reload } = useList<PayrollRun>("/payroll/runs/all");
  const createRun = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/payroll/runs", payload); await reload();
  }, [api, reload]);
  const processRun = useCallback(async (month: string) => {
    const run = await api.post<PayrollRun>(
      `/payroll/runs/process?month=${encodeURIComponent(month)}`
    );
    await reload();
    return run;
  }, [api, reload]);
  return { data, loading, error, reload, createRun, processRun };
}

export function usePayrollPlans() {
  const { api, data, loading, error, reload } = useList<PayrollPlan>("/payroll/plans/all");
  const createPlan = useCallback(async (payload: Record<string, unknown>) => {
    await api.post("/payroll/plans", payload); await reload();
  }, [api, reload]);
  const updatePlan = useCallback(async (uid: string, payload: Record<string, unknown>) => {
    await api.put(`/payroll/plans/${uid}`, payload); await reload();
  }, [api, reload]);
  const removePlan = useCallback(async (uid: string) => {
    await api.del(`/payroll/plans/${uid}`); await reload();
  }, [api, reload]);
  return { data, loading, error, reload, createPlan, updatePlan, removePlan };
}
