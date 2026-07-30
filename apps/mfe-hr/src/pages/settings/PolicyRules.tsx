import { useMemo, useState } from "react";
import { LayoutGrid, Table } from "lucide-react";
import { Dialog, DialogFooter, Button, Input, Select, Badge } from "@jaldee/design-system";
import {
  usePolicyRules, CATALOG, domainDef, actionsForCondition,
  type PolicyDomain, type PolicyRule, type ScopeType, type ConditionDef, type ActionDef, type Operator,
} from "../../services/usePolicyRules";
import { useDepartments, useDesignations } from "../../services/useSettingsData";
import { useBranches } from "../../services/useBranches";
import { useEmployees } from "../../services/useEmployees";

/** Fixed employment-type options (enum names the backend matches on). */
const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FullTime", label: "Full-time" },
  { value: "Consultant", label: "Consultant" },
  { value: "Hourly", label: "Hourly" },
  { value: "DailyWage", label: "Daily wage" },
];

const SCOPES: { value: ScopeType; label: string }[] = [
  { value: "ALL", label: "Everyone" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "DESIGNATION", label: "Designation" },
  { value: "BRANCH", label: "Branch" },
  { value: "EMPLOYMENT_TYPE", label: "Employment type" },
  { value: "EMPLOYEE", label: "Specific employee" },
];

function emptyRule(domain: PolicyDomain): PolicyRule {
  const d = domainDef(domain);
  const firstCond = d.conditions[0];
  const firstAction = actionsForCondition(domain, firstCond.type)[0] ?? d.actions[0];
  let defaultVal = "";
  if (firstCond.valueType === "select" && firstCond.options?.length) {
    defaultVal = firstCond.options[0].value;
  } else if (firstCond.valueType === "boolean") {
    defaultVal = "true";
  } else if (firstCond.valueType === "number") {
    defaultVal = "10";
  }
  return {
    id: "", domain, name: "", scopeType: "ALL",
    conditionType: firstCond.type, operator: firstCond.operators?.[0] ?? ">", conditionValue: defaultVal,
    actionType: firstAction.type, actionParams: {}, priority: 100, active: true,
  };
}

function condSummary(r: PolicyRule): string {
  const c = domainDef(r.domain).conditions.find((x) => x.type === r.conditionType);
  if (!c) return r.conditionType;
  if (c.valueType === "none") return c.label;
  if (c.valueType === "boolean") return `${c.label} = ${r.conditionValue || "yes"}`;
  return `${c.label} ${r.operator ?? ""} ${r.conditionValue ?? ""}${c.unit ? " " + c.unit : ""}`.trim();
}
function actSummary(r: PolicyRule): string {
  const a = domainDef(r.domain).actions.find((x) => x.type === r.actionType);
  if (!a) return r.actionType;
  const parts = (a.params ?? []).map((p) => `${p.label}: ${r.actionParams?.[p.key] ?? "—"}`);
  return parts.length ? `${a.label} (${parts.join(", ")})` : a.label;
}

export default function PolicyRules() {
  const [domain, setDomain] = useState<PolicyDomain>("ATTENDANCE");
  const { data, loading, error, save, setActive, remove } = usePolicyRules(domain);
  const [editing, setEditing] = useState<PolicyRule | null>(null);

  // Lookups so the table can show readable scope names instead of raw UIDs.
  const departments = useDepartments();
  const designations = useDesignations();
  const branches = useBranches();
  const employees = useEmployees();
  const scopeLabel = (r: PolicyRule): string => {
    if (r.scopeType === "ALL") return "Everyone";
    const v = Array.isArray(r.scopeValue) ? (r.scopeValue[0] ?? "") : (r.scopeValue || "");
    if (!v) return `${r.scopeType}: —`;
    const find = (list: { uid?: string; name?: string }[]) => list.find((x) => x.uid === v)?.name;
    let name: string | undefined;
    if (r.scopeType === "DEPARTMENT") name = find(departments.data);
    else if (r.scopeType === "DESIGNATION") name = find(designations.data);
    else if (r.scopeType === "BRANCH") name = find(branches.data);
    else if (r.scopeType === "EMPLOYEE") name = employees.data.find((e) => e.uid === v)?.name;
    else if (r.scopeType === "EMPLOYMENT_TYPE") name = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === v)?.label;
    return `${r.scopeType === "EMPLOYMENT_TYPE" ? "Type" : r.scopeType.charAt(0) + r.scopeType.slice(1).toLowerCase()}: ${name ?? v}`;
  };

  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const rules = useMemo(() => [...data].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)), [data]);

  return (
    <div id="hr-settings-policy-rules-panel" data-testid="hr-settings-policy-rules-panel" className="p-3 sm:p-4 lg:p-5">
      <div className="mb-2">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Policy Rules</h1>
        <p className="text-xs text-gray-500 mt-0.5">One place to define condition → action rules across HR.</p>
      </div>

      {/* domain tabs */}
      <div className="flex gap-6 border-b border-gray-200 mt-4 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        {CATALOG.map((d) => (
          <button
            key={d.key}
            id={`hr-settings-policy-rules-tab-${d.key.toLowerCase()}`}
            data-testid={`hr-settings-policy-rules-tab-${d.key.toLowerCase()}`}
            onClick={() => setDomain(d.key)}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
              domain === d.key
                ? "border-teal-700 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="text-sm text-gray-500">{rules.length} rule{rules.length === 1 ? "" : "s"} for {domainDef(domain).label}</div>
          <div className="flex items-center justify-end gap-3 shrink-0 ml-auto">
            <Button id="hr-settings-policy-rules-add" data-testid="hr-settings-policy-rules-add" variant="primary" onClick={() => setEditing(emptyRule(domain))}>+ New Rule</Button>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
                title="Table View"
                aria-label="Table View"
              >
                <Table size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
                title="Card View"
                aria-label="Card View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : rules.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No rules yet. Add one to start.</div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full">
            <table id="hr-settings-policy-rules-table" data-testid="hr-settings-policy-rules-table" className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-semibold">Rule</th>
                  <th className="text-left px-4 py-3 font-semibold">When</th>
                  <th className="text-left px-4 py-3 font-semibold">Then</th>
                  <th className="text-left px-4 py-3 font-semibold">Scope</th>
                  <th className="text-left px-4 py-3 font-semibold">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.uid} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{r.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{condSummary(r)}</td>
                    <td className="px-4 py-3"><Badge variant="info">{actSummary(r)}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{scopeLabel(r)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.priority ?? "—"}</td>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={r.active} onChange={(e) => r.uid && setActive(r.uid, e.target.checked)} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button id={`hr-settings-policy-rules-edit-${r.uid}`} data-testid={`hr-settings-policy-rules-edit-${r.uid}`} variant="outline" size="sm" onClick={() => setEditing(r)}>Edit</Button>{" "}
                      <Button variant="outline" size="sm" onClick={() => r.uid && remove(r.uid)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {rules.map((r) => (
              <div key={r.uid} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{r.name || "Untitled Rule"}</h4>
                    <Badge variant="info">{actSummary(r)}</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-1"><b>When:</b> {condSummary(r)}</p>
                  <p className="text-xs text-gray-500 mb-1"><b>Scope:</b> {scopeLabel(r)}</p>
                  <p className="text-xs text-gray-400">Priority: {r.priority ?? "—"}</p>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={r.active} onChange={(e) => r.uid && setActive(r.uid, e.target.checked)} className="rounded text-teal-600" />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(r)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => r.uid && remove(r.uid)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <RuleModal key={editing.uid ?? "new"} initial={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function RuleModal({ initial, onClose, onSave }: { initial: PolicyRule; onClose: () => void; onSave: (r: PolicyRule) => Promise<void> }) {
  const [r, setR] = useState<PolicyRule>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const d = domainDef(r.domain);

  const cond: ConditionDef | undefined = d.conditions.find((c) => c.type === r.conditionType);
  // Only actions in the same evaluation phase as the chosen condition (ATTENDANCE).
  const validActions: ActionDef[] = actionsForCondition(r.domain, r.conditionType);
  const act: ActionDef | undefined = validActions.find((a) => a.type === r.actionType);

  const set = <K extends keyof PolicyRule>(k: K, v: PolicyRule[K]) => setR((p) => ({ ...p, [k]: v }));
  const setParam = (k: string, v: unknown) => setR((p) => ({ ...p, actionParams: { ...(p.actionParams ?? {}), [k]: v } }));

  // Real option sources for scoped rules — store the UID (backend matches on uid or name).
  const departments = useDepartments();
  const designations = useDesignations();
  const branches = useBranches();
  const employees = useEmployees();

  const scopeOptions: { value: string; label: string }[] | null = (() => {
    switch (r.scopeType) {
      case "DEPARTMENT": return departments.data.map((d) => ({ value: d.uid ?? "", label: d.name ?? d.uid ?? "" }));
      case "DESIGNATION": return designations.data.map((d) => ({ value: d.uid ?? "", label: d.name ?? d.uid ?? "" }));
      case "BRANCH": return branches.data.map((b) => ({ value: b.uid ?? "", label: b.name ?? b.uid ?? "" }));
      case "EMPLOYMENT_TYPE": return EMPLOYMENT_TYPE_OPTIONS;
      case "EMPLOYEE": return employees.data.map((e) => ({ value: e.uid ?? "", label: `${e.name ?? "—"}${e.employeeId ? " (" + e.employeeId + ")" : ""}` }));
      default: return null; // ALL — no value
    }
  })();

  // Changing the scope target clears the previously-picked value.
  const onScopeTypeChange = (v: ScopeType) => setR((p) => ({
    ...p,
    scopeType: v,
    scopeValue: p.domain === "PAYROLL" ? [] : "",
  }));

  // Changing the condition may change the allowed phase — reset operator, value,
  // and (if now cross-phase) the action, so an impossible rule can't be built.
  const onConditionChange = (type: string) => setR((p) => {
    const c = d.conditions.find((x) => x.type === type);
    const nextActions = actionsForCondition(p.domain, type);
    const actionStillValid = nextActions.some((a) => a.type === p.actionType);
    let defaultVal = "";
    if (c?.valueType === "select" && c.options?.length) {
      defaultVal = c.options[0].value;
    } else if (c?.valueType === "boolean") {
      defaultVal = "true";
    } else if (c?.valueType === "number") {
      defaultVal = "10";
    }
    return {
      ...p,
      conditionType: type,
      operator: c?.operators?.[0] ?? p.operator ?? ">",
      conditionValue: defaultVal,
      actionType: actionStillValid ? p.actionType : (nextActions[0]?.type ?? p.actionType),
      actionParams: actionStillValid ? p.actionParams : {},
    };
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!r.name.trim()) { setErr("Give the rule a name."); return; }
    if (cond && cond.valueType !== "none" && !String(r.conditionValue ?? "").trim()) {
      setErr(`Condition '${cond.label}' requires a value.`);
      return;
    }
    setBusy(true); setErr(null);
    try { await onSave(r); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={initial.uid ? "Edit rule" : "New rule"} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{err}</div>}

        <Input label="Rule name" required value={r.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Late over 10 min → LOP" />

        {/* WHEN */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-700 mb-3">When</div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Condition" options={d.conditions.map((c) => ({ value: c.type, label: c.label }))}
              value={r.conditionType} onChange={(e) => onConditionChange(e.target.value)} />
            {cond && cond.valueType !== "none" && cond.valueType !== "boolean" && (
              <Select label="Operator" options={(cond.operators ?? [">"]).map((o) => ({ value: o, label: o }))}
                value={r.operator ?? ">"} onChange={(e) => set("operator", e.target.value as Operator)} />
            )}
            {cond && cond.valueType === "number" && (
              <Input label={`Value${cond.unit ? " (" + cond.unit + ")" : ""}`} type="number" value={r.conditionValue ?? ""} onChange={(e) => set("conditionValue", e.target.value)} />
            )}
            {cond && cond.valueType === "text" && (
              <Input label="Value" value={r.conditionValue ?? ""} onChange={(e) => set("conditionValue", e.target.value)} />
            )}
            {cond && cond.valueType === "select" && (
              <Select label="Value" options={cond.options ?? []} value={r.conditionValue ?? ""} onChange={(e) => set("conditionValue", e.target.value)} />
            )}
            {cond && cond.valueType === "boolean" && (
              <Select label="Value" options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} value={r.conditionValue ?? "true"} onChange={(e) => set("conditionValue", e.target.value)} />
            )}
          </div>
        </div>

        {/* THEN */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-700 mb-3">
            Then{cond?.phase ? <span className="ml-2 font-normal normal-case text-gray-400">Â· {cond.phase === "PUNCH" ? "punch-time" : "reconciliation"} actions only</span> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Action" options={validActions.map((a) => ({ value: a.type, label: a.label }))}
              value={r.actionType} onChange={(e) => set("actionType", e.target.value)} />
            {(act?.params ?? []).map((p) => (
              p.valueType === "select" ? (
                <Select key={p.key} label={p.label} options={p.options ?? []} value={String(r.actionParams?.[p.key] ?? "")} onChange={(e) => setParam(p.key, e.target.value)} />
              ) : (
                <Input key={p.key} label={`${p.label}${p.unit ? " (" + p.unit + ")" : ""}`} type={p.valueType === "number" ? "number" : "text"}
                  value={String(r.actionParams?.[p.key] ?? "")} onChange={(e) => setParam(p.key, e.target.value)} />
              )
            ))}
          </div>
        </div>

        {/* SCOPE + META */}
        <div className="grid grid-cols-3 gap-3">
          <Select label="Applies to" options={SCOPES} value={r.scopeType} onChange={(e) => onScopeTypeChange(e.target.value as ScopeType)} />
          {scopeOptions && (
            <Select
              label={r.scopeType === "EMPLOYMENT_TYPE" ? "Employment type" : r.scopeType === "EMPLOYEE" ? "Employee" : r.scopeType === "BRANCH" ? "Branch" : r.scopeType === "DESIGNATION" ? "Designation" : "Department"}
              options={[{ value: "", label: "Select…" }, ...scopeOptions]}
              value={Array.isArray(r.scopeValue) ? (r.scopeValue[0] ?? "") : (r.scopeValue ?? "")}
              onChange={(e) => set("scopeValue", r.domain === "PAYROLL" ? (e.target.value ? [e.target.value] : []) : e.target.value)}
            />
          )}
          <Input label="Priority" type="number" value={String(r.priority ?? 100)} onChange={(e) => set("priority", Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Effective from" type="date" value={r.effectiveFrom ?? ""} onChange={(e) => set("effectiveFrom", e.target.value)} />
          <Input label="Effective to" type="date" value={r.effectiveTo ?? ""} onChange={(e) => set("effectiveTo", e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
            <input type="checkbox" checked={r.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" loading={busy}>Save rule</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
