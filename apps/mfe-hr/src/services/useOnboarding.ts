import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/** W2 / R1.5 — onboarding checklist client (templates + per-employee tasks). */

export type OnboardingTaskStatus = "Pending" | "InProgress" | "Completed";

export interface OnboardingTemplateItem {
  id: string;
  uid?: string;
  roleName?: string;
  department?: string;
  taskName?: string;
  isMandatory?: boolean;
}

export interface OnboardingTask {
  id: string;
  uid?: string;
  employeeUid?: string;
  taskName?: string;
  assigneeUid?: string;
  assigneeName?: string;
  status?: OnboardingTaskStatus;
  dueDate?: string;
}

export interface OnboardingProgress {
  employeeUid?: string;
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  tasks: OnboardingTask[];
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

export function useOnboardingTemplates() {
  const api = useHrApi();
  const [data, setData] = useState<OnboardingTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/onboarding/templates");
      setData(Array.isArray(res) ? res.map((r) => withId<OnboardingTemplateItem>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load templates"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const create = useCallback(async (p: Record<string, unknown>) => { await api.post("/onboarding/templates", p); await load(); }, [api, load]);
  const update = useCallback(async (uid: string, p: Record<string, unknown>) => { await api.put(`/onboarding/templates/${uid}`, p); await load(); }, [api, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`/onboarding/templates/${uid}`); await load(); }, [api, load]);
  return { data, loading, error, reload: load, create, update, remove };
}

export function useOnboardingProgress(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeUid) { setData(null); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>>(`/onboarding/employees/${employeeUid}`);
      const tasks = Array.isArray(res?.tasks) ? (res.tasks as Record<string, unknown>[]).map((t) => withId<OnboardingTask>(t)) : [];
      setData({ ...(res as unknown as OnboardingProgress), tasks });
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load onboarding checklist"); setData(null); }
    finally { setLoading(false); }
  }, [api, employeeUid]);
  useEffect(() => { void load(); }, [load]);

  const generate = useCallback(async (dueInDays?: number) => {
    await api.post(`/onboarding/employees/${employeeUid}/generate${dueInDays ? `?dueInDays=${dueInDays}` : ""}`);
    await load();
  }, [api, employeeUid, load]);
  const addTask = useCallback(async (taskName: string, dueDate?: string, assigneeUid?: string) => {
    await api.post("/onboarding/tasks", { employeeUid, taskName, dueDate: dueDate || null, assigneeUid: assigneeUid || null });
    await load();
  }, [api, employeeUid, load]);
  const setStatus = useCallback(async (uid: string, status: OnboardingTaskStatus) => {
    await api.patch(`/onboarding/tasks/${uid}/status/${status}`);
    await load();
  }, [api, load]);
  const removeTask = useCallback(async (uid: string) => {
    await api.del(`/onboarding/tasks/${uid}`);
    await load();
  }, [api, load]);

  return { data, loading, error, reload: load, generate, addTask, setStatus, removeTask };
}
