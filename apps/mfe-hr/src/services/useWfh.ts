import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * Advance WFH requests (multi-day date ranges). Raising is server-gated on the
 * attendance rule's Allowed Work Modes; decisions route through the W1
 * approval engine. Approved requests auto-approve WFH punch-ins on covered days.
 */

export type WfhStatus = "Pending" | "Partially_Approved" | "Approved" | "Rejected" | "Cancelled";

export interface WfhRequest {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  status?: WfhStatus;
  statusRemarks?: string;
}

function withId(r: Record<string, unknown>): WfhRequest {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as WfhRequest;
}

/** employeeUid set → that employee's requests (ESS); unset → all (admin). */
export function useWfhRequests(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<WfhRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(employeeUid ? `/wfh/employee/${employeeUid}` : "/wfh");
      setData(Array.isArray(res) ? res.map(withId) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load WFH requests"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid]);
  useEffect(() => { void load(); }, [load]);

  const raise = useCallback(async (payload: { employeeUid: string; startDate: string; endDate: string; reason?: string }) => {
    await api.post("/wfh", payload); await load();
  }, [api, load]);
  const decide = useCallback(async (uid: string, action: "APPROVE" | "REJECT", statusRemarks?: string) => {
    await api.post(`/wfh/${uid}/decide`, { action, statusRemarks: statusRemarks || null }); await load();
  }, [api, load]);
  const cancel = useCallback(async (uid: string) => {
    await api.post(`/wfh/${uid}/cancel`); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, raise, decide, cancel };
}
