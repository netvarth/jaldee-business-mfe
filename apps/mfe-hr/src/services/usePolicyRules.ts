import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

/**
 * Unified HR Policy Rules — one "condition → action" model across domains,
 * generalizing the attendance-enforcement pattern. The CATALOG below drives the
 * rule-builder UI (which conditions/actions/operators each domain offers); the
 * backend stores rules generically (strings + a params JSON).
 */

export type PolicyDomain = "ATTENDANCE" | "LEAVE" | "PAYROLL" | "LIFECYCLE" | "APPROVALS" | "ALERTS";
export type ScopeType = "ALL" | "DEPARTMENT" | "DESIGNATION" | "BRANCH" | "EMPLOYMENT_TYPE" | "EMPLOYEE";
export type ValueType = "number" | "text" | "select" | "boolean" | "none";
export type Operator = ">" | ">=" | "<" | "<=" | "=" | "!=" | "in";

/**
 * ATTENDANCE rules are evaluated in two moments. A condition and an action must
 * share the same phase — a punch-time condition can't drive a reconciliation
 * action, and vice-versa. Other domains leave phase undefined.
 */
export type Phase = "PUNCH" | "RECONCILE";

export interface ConditionDef {
  type: string; label: string; valueType: ValueType; unit?: string;
  operators?: Operator[]; options?: { value: string; label: string }[]; phase?: Phase;
}
export interface ActionParamDef { key: string; label: string; valueType: ValueType; options?: { value: string; label: string }[]; unit?: string; }
export interface ActionDef { type: string; label: string; params?: ActionParamDef[]; phase?: Phase; }
export interface DomainDef { key: PolicyDomain; label: string; conditions: ConditionDef[]; actions: ActionDef[]; }

const NUM_OPS: Operator[] = [">", ">=", "<", "<=", "=", "!="];

/**
 * CLOSED catalog — mirrors the backend PolicyRuleCatalog.java exactly. Every
 * entry here is fully implemented server-side (a real fact backs each condition,
 * a real doer runs each action). Do NOT add an entry until the backend handles
 * it, otherwise create/update will be rejected by the server's catalog guard.
 */
export const CATALOG: DomainDef[] = [
  {
    key: "ATTENDANCE",
    label: "Attendance",
    conditions: [
      // -- punch phase --
      { type: "WORK_MODE", label: "Work mode", valueType: "select", phase: "PUNCH", operators: ["=", "!="], options: [
        { value: "Office", label: "Office" }, { value: "Home", label: "Home" }, { value: "Field", label: "Field" }, { value: "Remote", label: "Remote" }] },
      { type: "MISSED_PUNCH", label: "Missed punch (open session)", valueType: "none", phase: "PUNCH" },
      // -- reconcile phase --
      { type: "LATE_MINUTES", label: "Daily lateness (min)", valueType: "number", unit: "min", phase: "RECONCILE", operators: NUM_OPS },
      { type: "MONTHLY_GRACE_USED", label: "Monthly grace used (min)", valueType: "number", unit: "min", phase: "RECONCILE", operators: NUM_OPS },
      { type: "EARLY_DEPARTURE", label: "Early departure (min)", valueType: "number", unit: "min", phase: "RECONCILE", operators: NUM_OPS },
      { type: "HOURS_WORKED", label: "Hours worked", valueType: "number", unit: "hrs", phase: "RECONCILE", operators: NUM_OPS },
      { type: "LATE_COUNT_IN_MONTH", label: "Late count in month", valueType: "number", phase: "RECONCILE", operators: NUM_OPS },
      { type: "CONSECUTIVE_ABSENCE", label: "Consecutive absent days", valueType: "number", phase: "RECONCILE", operators: NUM_OPS },
    ],
    actions: [
      // -- punch phase --
      { type: "BLOCK_PUNCH", label: "Block punch", phase: "PUNCH" },
      { type: "REQUIRE_SELFIE", label: "Require selfie", phase: "PUNCH" },
      { type: "AUTO_CLOCKOUT", label: "Auto clock-out stale session", phase: "PUNCH" },
      // -- reconcile phase --
      { type: "MARK_LOP", label: "Mark LOP", phase: "RECONCILE", params: [{ key: "lopType", label: "LOP", valueType: "select", options: [{ value: "HALF_DAY", label: "Half day" }, { value: "FULL_DAY", label: "Full day" }] }] },
      { type: "REQUIRE_REGULARIZATION", label: "Require regularization", phase: "RECONCILE" },
      { type: "GRANT_OVERTIME", label: "Grant overtime", phase: "RECONCILE" },
      { type: "DEDUCT_PENALTY", label: "Deduct penalty", phase: "RECONCILE", params: [{ key: "amount", label: "Amount", valueType: "number", unit: "₹" }] },
      { type: "ALERT", label: "Notify manager", phase: "RECONCILE" },
    ],
  },
  {
    key: "LEAVE",
    label: "Leave",
    conditions: [
      { type: "LEAVE_TYPE", label: "Leave type", valueType: "select", operators: ["=", "!="], options: [
        { value: "CL", label: "Casual (CL)" }, { value: "SL", label: "Sick (SL)" }, { value: "EL", label: "Earned (EL)" }, { value: "MATERNITY", label: "Maternity" }, { value: "COMP_OFF", label: "Comp-off" }] },
      { type: "DAYS_REQUESTED", label: "Days requested", valueType: "number", unit: "days", operators: NUM_OPS },
      { type: "BALANCE", label: "Balance available", valueType: "number", unit: "days", operators: NUM_OPS },
      { type: "MIN_SERVICE", label: "Service (days)", valueType: "number", unit: "days", operators: NUM_OPS },
      { type: "NOTICE_DAYS", label: "Notice given (days)", valueType: "number", unit: "days", operators: NUM_OPS },
      { type: "GENDER", label: "Gender", valueType: "select", operators: ["=", "!="], options: [{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }] },
      { type: "HALF_DAY", label: "Is half-day", valueType: "boolean" },
      { type: "SPANS_HOLIDAY", label: "Spans a holiday", valueType: "none" },
    ],
    actions: [
      { type: "BLOCK", label: "Block request" },
      { type: "CONVERT_TO_LOP", label: "Convert to LOP" },
      { type: "EXCLUDE_HOLIDAYS", label: "Exclude holidays from count" },
    ],
  },
  {
    key: "PAYROLL",
    label: "Payroll",
    conditions: [
      { type: "GROSS", label: "Gross salary", valueType: "number", unit: "₹", operators: NUM_OPS },
      { type: "EMPLOYMENT_TYPE", label: "Employment type", valueType: "select", operators: ["=", "!="], options: [
        { value: "FullTime", label: "Full-time" }, { value: "Consultant", label: "Consultant" }, { value: "Hourly", label: "Hourly" }, { value: "DailyWage", label: "Daily wage" }] },
      { type: "LOP_DAYS", label: "LOP days", valueType: "number", unit: "days", operators: NUM_OPS },
      { type: "RUN_AMOUNT", label: "Run net amount (finalize)", valueType: "number", unit: "₹", operators: NUM_OPS },
    ],
    actions: [
      { type: "ADD_ALLOWANCE", label: "Add allowance", params: [{ key: "amount", label: "Amount", valueType: "number", unit: "₹" }, { key: "name", label: "Label", valueType: "text" }] },
      { type: "DEDUCT", label: "Deduct", params: [{ key: "amount", label: "Amount", valueType: "number", unit: "₹" }, { key: "name", label: "Label", valueType: "text" }] },
      { type: "ADD_INCENTIVE", label: "Add incentive", params: [{ key: "percent", label: "% of gross", valueType: "number", unit: "%" }] },
      { type: "CAP_STATUTORY", label: "Cap statutory wage", params: [{ key: "ceiling", label: "Ceiling", valueType: "number", unit: "₹" }] },
      { type: "GATE_MAKER_CHECKER", label: "Require maker-checker (finalize)" },
    ],
  },
  {
    key: "LIFECYCLE",
    label: "Lifecycle",
    conditions: [
      { type: "TENURE_MONTHS", label: "Tenure (months)", valueType: "number", unit: "mo", operators: NUM_OPS },
      { type: "EX_EMPLOYEE_REHIRE", label: "Is an ex-employee rehire", valueType: "none" },
    ],
    actions: [
      { type: "BLOCK_CONFIRMATION", label: "Block confirmation" },
      { type: "STATUS_PROBATION", label: "Set status to probation" },
      { type: "BLOCK_REHIRE", label: "Block rehire" },
    ],
  },
  {
    key: "APPROVALS",
    label: "Approvals",
    conditions: [
      { type: "REQUEST_TYPE", label: "Request type", valueType: "select", operators: ["=", "!="], options: [
        { value: "LEAVE", label: "Leave" }, { value: "EXPENSE", label: "Expense" }, { value: "PAYROLL_RUN_FINALIZE", label: "Payroll finalize" }] },
      { type: "DAYS_REQUESTED", label: "Days requested", valueType: "number", unit: "days", operators: NUM_OPS },
    ],
    actions: [
      { type: "ROUTE_APPROVAL", label: "Route to approval chain", params: [{ key: "chainUid", label: "Approval chain", valueType: "text" }] },
    ],
  },
  {
    key: "ALERTS",
    label: "Alerts",
    conditions: [
      { type: "TENURE_MONTHS", label: "Tenure (months)", valueType: "number", unit: "mo", operators: NUM_OPS },
    ],
    actions: [
      { type: "NOTIFY_EMPLOYEE", label: "Notify employee" },
      { type: "NOTIFY_HR", label: "Notify HR" },
    ],
  },
];

export function domainDef(d: PolicyDomain) { return CATALOG.find((c) => c.key === d)!; }

/** Actions valid to pair with a given condition — same phase for ATTENDANCE, all otherwise. */
export function actionsForCondition(d: PolicyDomain, conditionType: string): ActionDef[] {
  const def = domainDef(d);
  const cond = def.conditions.find((c) => c.type === conditionType);
  if (!cond?.phase) return def.actions;
  return def.actions.filter((a) => !a.phase || a.phase === cond.phase);
}

export interface PolicyRule {
  id: string; uid?: string;
  domain: PolicyDomain;
  name: string;
  description?: string;
  scopeType: ScopeType;
  scopeValue?: string | null;
  conditionType: string;
  operator?: Operator | null;
  conditionValue?: string | null;
  actionType: string;
  actionParams?: Record<string, unknown>;
  priority?: number;
  active: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

function withId(r: Record<string, unknown>): PolicyRule {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as PolicyRule;
}

/** CRUD over /policy-rules (optionally filtered by domain). */
export function usePolicyRules(domain?: PolicyDomain) {
  const api = useHrApi();
  const [data, setData] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/policy-rules${domain ? `?domain=${domain}` : ""}`);
      setData(Array.isArray(res) ? res.map(withId) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, domain]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (rule: PolicyRule) => {
    if (rule.uid) await api.put(`/policy-rules/${rule.uid}`, rule as unknown as Record<string, unknown>);
    else await api.post("/policy-rules", rule as unknown as Record<string, unknown>);
    await load();
  }, [api, load]);

  const setActive = useCallback(async (uid: string, active: boolean) => {
    await api.patch(`/policy-rules/${uid}/active`, { active }); await load();
  }, [api, load]);

  const remove = useCallback(async (uid: string) => { await api.del(`/policy-rules/${uid}`); await load(); }, [api, load]);

  return { data, loading, error, reload: load, save, setActive, remove };
}
