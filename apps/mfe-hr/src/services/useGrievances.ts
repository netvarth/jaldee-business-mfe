import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * W10 / R8.1 — confidential grievances (HR + Company Secretary).
 * Grievances are confidential tickets served only by /grievances: hidden from
 * normal ticket lists, readable by the raiser + designated handlers, every
 * handler access audited. SLA breach escalates via a backend job.
 */

export type GrievanceStatus = "Open" | "InProgress" | "Resolved" | "Closed";

export interface GrievanceReply {
  userId?: string;
  message?: string;
  timestamp?: string;
  isInternal?: boolean;
}

export interface Grievance {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: GrievanceStatus;
  fileUrl?: string;
  createdAt?: string;
  responses?: GrievanceReply[];
  confidential?: boolean;
  slaDueAt?: string;
  escalatedAt?: string;
}

export interface GrievanceHandler {
  id: string;
  uid?: string;
  employeeUid?: string;
  employeeName?: string;
  role?: string; // "HR" | "CS" (config label)
  active?: boolean;
}

export interface GrievancePolicy {
  slaHours: number;
  escalationEnabled: boolean;
}

export interface GrievanceAccessLogEntry {
  id: string;
  uid?: string;
  ticketUid?: string;
  actorEmployeeUid?: string;
  actorEmployeeName?: string;
  action?: string;
  detail?: string;
  accessedAt?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

/** Is the current user a designated grievance handler? Gates the admin console. */
export function useAmIGrievanceHandler() {
  const api = useHrApi();
  const [handler, setHandler] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get<{ handler?: boolean; role?: string }>("/grievances/am-i-handler");
        if (alive) { setHandler(!!res?.handler); setRole(res?.role ?? null); }
      } catch (e) {
        if (alive) { setHandler(false); setError(e instanceof Error ? e.message : "Check failed"); }
      }
    })();
    return () => { alive = false; };
  }, [api]);

  return { handler, role, error };
}

/** Handler console: all confidential grievances (backend enforces + audits). */
export function useGrievances() {
  const api = useHrApi();
  const [data, setData] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/grievances");
      setData(Array.isArray(res) ? res.map((r) => withId<Grievance>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load grievances"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const reply = useCallback(async (uid: string, message: string, isInternal = false) => {
    await api.post(`/grievances/${uid}/reply`, { message, isInternal }); await load();
  }, [api, load]);

  const updateStatus = useCallback(async (uid: string, status: GrievanceStatus) => {
    await api.patch(`/grievances/${uid}/status`, { status }); await load();
  }, [api, load]);

  const accessLog = useCallback(async (uid: string) => {
    const res = await api.get<Record<string, unknown>[]>(`/grievances/${uid}/access-log`);
    return Array.isArray(res) ? res.map((r) => withId<GrievanceAccessLogEntry>(r)) : [];
  }, [api]);

  return { data, loading, error, reload: load, reply, updateStatus, accessLog };
}

/** ESS: my grievances + raise. */
export function useMyGrievances() {
  const api = useHrApi();
  const [data, setData] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/grievances/mine");
      setData(Array.isArray(res) ? res.map((r) => withId<Grievance>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load grievances"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const raise = useCallback(async (p: { title: string; description: string; category?: string; fileUrl?: string }) => {
    await api.post("/grievances", p); await load();
  }, [api, load]);

  const reply = useCallback(async (uid: string, message: string) => {
    await api.post(`/grievances/${uid}/reply`, { message }); await load();
  }, [api, load]);

  return { data, loading, error, reload: load, raise, reply };
}

/** Settings: handler registry (HR/CS designates) + SLA policy. */
export function useGrievanceConfig() {
  const api = useHrApi();
  const [handlers, setHandlers] = useState<GrievanceHandler[]>([]);
  const [policy, setPolicy] = useState<GrievancePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [h, p] = await Promise.all([
        api.get<Record<string, unknown>[]>("/grievances/handlers"),
        api.get<GrievancePolicy>("/grievances/policy"),
      ]);
      setHandlers(Array.isArray(h) ? h.map((r) => withId<GrievanceHandler>(r)) : []);
      setPolicy(p ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load grievance config"); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const addHandler = useCallback(async (employeeUid: string, role: string) => {
    await api.post("/grievances/handlers", { employeeUid, role }); await load();
  }, [api, load]);

  const removeHandler = useCallback(async (handlerUid: string) => {
    await api.del(`/grievances/handlers/${handlerUid}`); await load();
  }, [api, load]);

  const updatePolicy = useCallback(async (p: GrievancePolicy) => {
    await api.put("/grievances/policy", p); await load();
  }, [api, load]);

  return { handlers, policy, loading, error, reload: load, addHandler, removeHandler, updatePolicy };
}
