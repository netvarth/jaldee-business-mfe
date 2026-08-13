import { useMemo, useState } from "react";
import { LayoutGrid, Plus, Sliders, Table, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, DialogFooter, Input, Select } from "@jaldee/design-system";
import {
  CATALOG,
  actionsForCondition,
  domainDef,
  usePolicyRules,
  type ActionDef,
  type ConditionDef,
  type Operator,
  type PolicyDomain,
  type PolicyOutcome,
  type PolicyRule,
  type ScopeType,
} from "../../services/usePolicyRules";
import { useBranches } from "../../services/useBranches";
import { useEmployees } from "../../services/useEmployees";
import { useDepartments, useDesignations } from "../../services/useSettingsData";
import { PanelHeader, SettingsEmptyState } from "./SettingsComponents";

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

function defaultConditionValue(condition?: ConditionDef) {
  if (condition?.valueType === "select") return condition.options?.[0]?.value ?? "";
  if (condition?.valueType === "number") return "10";
  return "";
}

function emptyOutcome(condition: ConditionDef | undefined, action: ActionDef): PolicyOutcome {
  return {
    operator: condition?.valueType === "none" ? null : condition?.operators?.[0] ?? ">",
    conditionValue: condition?.valueType === "none" ? null : defaultConditionValue(condition),
    conditionValueTo: null,
    actionType: action.type,
    actionParams: {},
  };
}

function emptyRule(domain: PolicyDomain): PolicyRule {
  const definition = domainDef(domain);
  const condition = definition.conditions[0];
  const action = actionsForCondition(domain, condition.type)[0] ?? definition.actions[0];
  return {
    id: "",
    domain,
    name: "",
    scopeType: "ALL",
    scopeValues: [],
    conditionType: condition.type,
    outcomes: [emptyOutcome(condition, action)],
    priority: 100,
    active: true,
  };
}

function conditionSummary(rule: PolicyRule) {
  const condition = domainDef(rule.domain).conditions.find((item) => item.type === rule.conditionType);
  if (!condition) return rule.conditionType;
  if (condition.valueType === "none") return condition.label;
  const values = rule.outcomes.map((outcome) => {
    const comparison = outcome.operator === "BETWEEN"
      ? `${outcome.conditionValue ?? ""}–${outcome.conditionValueTo ?? ""}`
      : `${outcome.operator ?? ""} ${outcome.conditionValue ?? ""}`;
    return `${comparison}${condition.unit ? ` ${condition.unit}` : ""}`.trim();
  });
  return `${condition.label}: ${values.join("; ")}`;
}

function actionSummary(rule: PolicyRule) {
  return rule.outcomes.map((outcome) => {
    const action = domainDef(rule.domain).actions.find((item) => item.type === outcome.actionType);
    return action?.label ?? outcome.actionType;
  }).join("; ");
}

type Interval = { start: number; end: number; startInclusive: boolean; endInclusive: boolean };

function intervalFor(outcome: PolicyOutcome): Interval | null {
  const value = Number(outcome.conditionValue);
  if (!Number.isFinite(value) || outcome.operator === "!=" || outcome.operator === "in") return null;
  if (outcome.operator === "BETWEEN") {
    const valueTo = Number(outcome.conditionValueTo);
    return Number.isFinite(valueTo) ? { start: value, end: valueTo, startInclusive: true, endInclusive: true } : null;
  }
  if (outcome.operator === ">") return { start: value, end: Infinity, startInclusive: false, endInclusive: false };
  if (outcome.operator === ">=") return { start: value, end: Infinity, startInclusive: true, endInclusive: false };
  if (outcome.operator === "<") return { start: -Infinity, end: value, startInclusive: false, endInclusive: false };
  if (outcome.operator === "<=") return { start: -Infinity, end: value, startInclusive: false, endInclusive: true };
  return { start: value, end: value, startInclusive: true, endInclusive: true };
}

function intervalsOverlap(first: Interval, second: Interval) {
  if (first.end < second.start || second.end < first.start) return false;
  if (first.end === second.start) return first.endInclusive && second.startInclusive;
  if (second.end === first.start) return second.endInclusive && first.startInclusive;
  return true;
}

function validateOutcomes(condition: ConditionDef | undefined, outcomes: PolicyOutcome[]): string | null {
  if (outcomes.length === 0) return "Add at least one outcome.";
  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index];
    if (!outcome.actionType) return `Outcome ${index + 1} requires an action.`;
    if (condition?.valueType !== "none" && !String(outcome.conditionValue ?? "").trim()) {
      return `Outcome ${index + 1} requires a condition value.`;
    }
    if (outcome.operator === "BETWEEN") {
      if (!String(outcome.conditionValueTo ?? "").trim()) return `Outcome ${index + 1} requires an end value.`;
      if (Number(outcome.conditionValue) >= Number(outcome.conditionValueTo)) {
        return `Outcome ${index + 1} must have an end value greater than its start value.`;
      }
    }
  }
  if (condition?.valueType === "number") {
    for (let first = 0; first < outcomes.length; first += 1) {
      const firstInterval = intervalFor(outcomes[first]);
      if (!firstInterval) continue;
      for (let second = first + 1; second < outcomes.length; second += 1) {
        const secondInterval = intervalFor(outcomes[second]);
        if (secondInterval && intervalsOverlap(firstInterval, secondInterval)) {
          return `Outcomes ${first + 1} and ${second + 1} overlap. Use mutually exclusive thresholds.`;
        }
      }
    }
  }
  return null;
}

export default function PolicyRules() {
  const [domain, setDomain] = useState<PolicyDomain>("ATTENDANCE");
  const [editing, setEditing] = useState<PolicyRule | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const { data, loading, error, save, setActive, remove } = usePolicyRules(domain);
  const departments = useDepartments();
  const designations = useDesignations();
  const branches = useBranches();
  const employees = useEmployees();
  const rules = useMemo(() => [...data].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)), [data]);

  const scopeLabel = (rule: PolicyRule) => {
    if (rule.scopeType === "ALL") return "Everyone";
    const value = rule.scopeValues?.[0] ?? "";
    if (!value) return `${rule.scopeType}: —`;
    const find = (items: { uid?: string; name?: string }[]) => items.find((item) => item.uid === value)?.name;
    const label = rule.scopeType === "DEPARTMENT" ? find(departments.data)
      : rule.scopeType === "DESIGNATION" ? find(designations.data)
        : rule.scopeType === "BRANCH" ? find(branches.data)
          : rule.scopeType === "EMPLOYEE" ? employees.data.find((item) => item.uid === value)?.name
            : EMPLOYMENT_TYPE_OPTIONS.find((item) => item.value === value)?.label;
    return label ?? value;
  };

  return (
    <div id="hr-settings-policy-rules-panel" data-testid="hr-settings-policy-rules-panel" className="p-3 sm:p-4 lg:p-5">
      <PanelHeader title="Policy Rules" subtitle="Define mutually exclusive outcomes for each HR condition." icon={<Sliders size={20} />} />
      <div className="mt-4 mb-6 flex gap-6 overflow-x-auto whitespace-nowrap border-b border-gray-200">
        {CATALOG.map((item) => (
          <button key={item.key} type="button" data-testid={`hr-settings-policy-rules-tab-${item.key.toLowerCase()}`} onClick={() => setDomain(item.key)}
            className={`shrink-0 border-b-2 pb-2.5 text-sm font-semibold ${domain === item.key ? "border-teal-700 text-teal-700" : "border-transparent text-gray-500"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
          <span className="text-sm text-gray-500">{rules.length} rule{rules.length === 1 ? "" : "s"}</span>
          <div className="ml-auto flex shrink-0 items-center justify-end gap-3">
            <Button data-testid="hr-settings-policy-rules-add" onClick={() => setEditing(emptyRule(domain))} icon={<Plus size={16} />}>New Rule</Button>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                data-testid="hr-settings-policy-rules-view-table"
                data-active={viewMode === "table" ? "true" : "false"}
                onClick={() => setViewMode("table")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "table" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
                title="Table View"
                aria-label="Table View"
              >
                <Table size={16} />
              </button>
              <button
                type="button"
                data-testid="hr-settings-policy-rules-view-card"
                data-active={viewMode === "card" ? "true" : "false"}
                onClick={() => setViewMode("card")}
                className={`rounded-md p-1.5 transition-colors ${viewMode === "card" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"}`}
                title="Card View"
                aria-label="Card View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
        {error ? <div role="alert" className="p-6 text-sm text-red-600">{error}</div>
          : loading ? <div className="p-6 text-sm text-gray-500">Loading…</div>
            : rules.length === 0 ? <SettingsEmptyState title="No policy rules" description="Add a rule to define its outcomes." compact />
              : viewMode === "table" ? (
                <div className="max-h-[600px] overflow-auto">
                  <table data-testid="hr-settings-policy-rules-table" className="w-full min-w-[760px] text-sm">
                    <thead className="sticky top-0 bg-gray-50"><tr className="border-b text-left text-xs uppercase text-gray-400">
                      <th className="px-6 py-3">Rule</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Outcomes</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Active</th><th />
                    </tr></thead>
                    <tbody>{rules.map((rule) => <tr key={rule.uid} className="border-b border-gray-100">
                      <td className="px-6 py-3 font-medium">{rule.name}</td><td className="px-4 py-3">{conditionSummary(rule)}</td>
                      <td className="px-4 py-3"><Badge variant="info">{rule.outcomes.length}: {actionSummary(rule)}</Badge></td><td className="px-4 py-3">{scopeLabel(rule)}</td>
                      <td className="px-4 py-3"><input data-testid={`hr-settings-policy-rules-active-${rule.uid}`} type="checkbox" checked={rule.active} onChange={(event) => rule.uid && void setActive(rule.uid, event.target.checked)} /></td>
                      <td className="px-4 py-3 text-right"><Button data-testid={`hr-settings-policy-rules-edit-${rule.uid}`} size="sm" variant="outline" onClick={() => setEditing(rule)}>Edit</Button>{" "}<Button data-testid={`hr-settings-policy-rules-delete-${rule.uid}`} size="sm" variant="outline" onClick={() => rule.uid && void remove(rule.uid)}>Delete</Button></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              ) : (
                <div className="grid max-h-[600px] grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">{rules.map((rule) => (
                  <article key={rule.uid} data-testid={`hr-settings-policy-rule-card-${rule.uid}`} className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900">{rule.name}</h3><p className="mt-2 text-xs text-gray-600">{conditionSummary(rule)}</p><p className="mt-1 text-xs text-gray-500">{actionSummary(rule)}</p>
                    <div className="mt-4 flex justify-end"><Button size="sm" variant="outline" onClick={() => setEditing(rule)}>Edit</Button></div>
                  </article>
                ))}</div>
              )}
      </div>
      {editing && <RuleModal key={editing.uid ?? "new"} initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function RuleModal({ initial, onClose, onSave }: { initial: PolicyRule; onClose: () => void; onSave: (rule: PolicyRule) => Promise<void> }) {
  const [rule, setRule] = useState(() => {
    if (initial.outcomes.length > 0) return initial;
    const definition = domainDef(initial.domain);
    const condition = definition.conditions.find((item) => item.type === initial.conditionType);
    const action = actionsForCondition(initial.domain, initial.conditionType)[0] ?? definition.actions[0];
    return { ...initial, outcomes: [emptyOutcome(condition, action)] };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const definition = domainDef(rule.domain);
  const condition = definition.conditions.find((item) => item.type === rule.conditionType);
  const validActions = actionsForCondition(rule.domain, rule.conditionType);
  const departments = useDepartments();
  const designations = useDesignations();
  const branches = useBranches();
  const employees = useEmployees();

  const scopeOptions = rule.scopeType === "DEPARTMENT" ? departments.data.map((item) => ({ value: item.uid ?? "", label: item.name ?? "" }))
    : rule.scopeType === "DESIGNATION" ? designations.data.map((item) => ({ value: item.uid ?? "", label: item.name ?? "" }))
      : rule.scopeType === "BRANCH" ? branches.data.map((item) => ({ value: item.uid ?? "", label: item.name ?? "" }))
        : rule.scopeType === "EMPLOYEE" ? employees.data.map((item) => ({ value: item.uid ?? "", label: item.name ?? "" }))
          : rule.scopeType === "EMPLOYMENT_TYPE" ? EMPLOYMENT_TYPE_OPTIONS : null;

  const setField = <Key extends keyof PolicyRule>(key: Key, value: PolicyRule[Key]) => setRule((current) => ({ ...current, [key]: value }));
  const updateOutcome = (index: number, update: Partial<PolicyOutcome>) => setRule((current) => ({
    ...current,
    outcomes: current.outcomes.map((outcome, outcomeIndex) => outcomeIndex === index ? { ...outcome, ...update } : outcome),
  }));

  const changeCondition = (conditionType: string) => {
    const nextCondition = definition.conditions.find((item) => item.type === conditionType);
    const nextAction = actionsForCondition(rule.domain, conditionType)[0] ?? definition.actions[0];
    setRule((current) => ({ ...current, conditionType, outcomes: [emptyOutcome(nextCondition, nextAction)] }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rule.name.trim()) return setError("Give the rule a name.");
    const outcomeError = validateOutcomes(condition, rule.outcomes);
    if (outcomeError) return setError(outcomeError);
    if (rule.scopeType !== "ALL" && !rule.scopeValues?.length) return setError("Select who this rule applies to.");
    setBusy(true); setError(null);
    try { await onSave(rule); onClose(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Failed to save the rule."); }
    finally { setBusy(false); }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial.uid ? "Edit rule" : "New rule"}
      size="lg"
      testId="hr-settings-policy-rules-modal"
      contentClassName="max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      <form onSubmit={submit} className="space-y-4" data-testid="hr-settings-policy-rules-form">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <Input id="hr-settings-policy-rules-name" data-testid="hr-settings-policy-rules-name" label="Rule name" required value={rule.name} onChange={(event) => setField("name", event.target.value)} />
        <div className="rounded-lg border border-gray-200 p-4">
          <Select id="hr-settings-policy-rules-condition" testId="hr-settings-policy-rules-condition" label="Condition" value={rule.conditionType} options={definition.conditions.map((item) => ({ value: item.type, label: item.label }))} onChange={(event) => changeCondition(event.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-900">Outcomes</h3>
            <Button data-testid="hr-settings-policy-rules-add-outcome" type="button" size="sm" variant="outline" icon={<Plus size={15} />} onClick={() => setRule((current) => ({ ...current, outcomes: [...current.outcomes, emptyOutcome(condition, validActions[0])] }))}>Add outcome</Button>
          </div>
          {rule.outcomes.map((outcome, index) => {
            const action = validActions.find((item) => item.type === outcome.actionType);
            return <section key={index} data-testid={`hr-settings-policy-rules-outcome-${index}`} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-violet-700">Outcome {index + 1}</span>
                <Button data-testid={`hr-settings-policy-rules-remove-outcome-${index}`} type="button" variant="outline" size="sm" iconOnly icon={<Trash2 size={15} />} aria-label={`Remove outcome ${index + 1}`} disabled={rule.outcomes.length === 1} onClick={() => setRule((current) => ({ ...current, outcomes: current.outcomes.filter((_, itemIndex) => itemIndex !== index) }))} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {condition?.valueType !== "none" && <Select id={`hr-settings-policy-rules-operator-${index}`} testId={`hr-settings-policy-rules-operator-${index}`} label="Operator" value={outcome.operator ?? ""} options={(condition?.operators ?? []).map((operator) => ({ value: operator, label: operator }))} onChange={(event) => updateOutcome(index, { operator: event.target.value as Operator, conditionValueTo: event.target.value === "BETWEEN" ? outcome.conditionValueTo : null })} />}
                {condition?.valueType === "number" && <Input id={`hr-settings-policy-rules-value-${index}`} data-testid={`hr-settings-policy-rules-value-${index}`} label={outcome.operator === "BETWEEN" ? "Start" : `Value${condition.unit ? ` (${condition.unit})` : ""}`} type="number" value={outcome.conditionValue ?? ""} onChange={(event) => updateOutcome(index, { conditionValue: event.target.value })} />}
                {condition?.valueType === "number" && outcome.operator === "BETWEEN" && <Input id={`hr-settings-policy-rules-value-to-${index}`} data-testid={`hr-settings-policy-rules-value-to-${index}`} label={`End${condition.unit ? ` (${condition.unit})` : ""}`} type="number" value={outcome.conditionValueTo ?? ""} onChange={(event) => updateOutcome(index, { conditionValueTo: event.target.value })} />}
                {condition?.valueType === "text" && <Input id={`hr-settings-policy-rules-value-${index}`} data-testid={`hr-settings-policy-rules-value-${index}`} label="Value" value={outcome.conditionValue ?? ""} onChange={(event) => updateOutcome(index, { conditionValue: event.target.value })} />}
                {condition?.valueType === "select" && <Select id={`hr-settings-policy-rules-value-${index}`} testId={`hr-settings-policy-rules-value-${index}`} label="Value" value={outcome.conditionValue ?? ""} options={condition.options ?? []} onChange={(event) => updateOutcome(index, { conditionValue: event.target.value })} />}
                <Select id={`hr-settings-policy-rules-action-${index}`} testId={`hr-settings-policy-rules-action-${index}`} label="Action" value={outcome.actionType} options={validActions.map((item) => ({ value: item.type, label: item.label }))} onChange={(event) => updateOutcome(index, { actionType: event.target.value, actionParams: {} })} />
                {(action?.params ?? []).map((param) => param.valueType === "select"
                  ? <Select key={param.key} id={`hr-settings-policy-rules-param-${index}-${param.key}`} testId={`hr-settings-policy-rules-param-${index}-${param.key}`} label={param.label} value={String(outcome.actionParams[param.key] ?? "")} options={param.options ?? []} onChange={(event) => updateOutcome(index, { actionParams: { ...outcome.actionParams, [param.key]: event.target.value } })} />
                  : <Input key={param.key} id={`hr-settings-policy-rules-param-${index}-${param.key}`} data-testid={`hr-settings-policy-rules-param-${index}-${param.key}`} label={`${param.label}${param.unit ? ` (${param.unit})` : ""}`} type={param.valueType === "number" ? "number" : "text"} value={String(outcome.actionParams[param.key] ?? "")} onChange={(event) => updateOutcome(index, { actionParams: { ...outcome.actionParams, [param.key]: param.valueType === "number" ? Number(event.target.value) : event.target.value } })} />)}
              </div>
            </section>;
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select id="hr-settings-policy-rules-scope" testId="hr-settings-policy-rules-scope" label="Applies to" value={rule.scopeType} options={SCOPES} onChange={(event) => setRule((current) => ({ ...current, scopeType: event.target.value as ScopeType, scopeValues: [] }))} />
          {scopeOptions && <Select id="hr-settings-policy-rules-scope-value" testId="hr-settings-policy-rules-scope-value" label="Scope value" placeholder="Select…" value={rule.scopeValues?.[0] ?? ""} options={scopeOptions} onChange={(event) => setField("scopeValues", event.target.value ? [event.target.value] : [])} />}
          <Input id="hr-settings-policy-rules-priority" data-testid="hr-settings-policy-rules-priority" label="Priority" type="number" value={String(rule.priority ?? 100)} onChange={(event) => setField("priority", Number(event.target.value))} />
          <Input id="hr-settings-policy-rules-effective-from" data-testid="hr-settings-policy-rules-effective-from" label="Effective from" type="date" value={rule.effectiveFrom ?? ""} onChange={(event) => setField("effectiveFrom", event.target.value)} />
          <Input id="hr-settings-policy-rules-effective-to" data-testid="hr-settings-policy-rules-effective-to" label="Effective to" type="date" value={rule.effectiveTo ?? ""} onChange={(event) => setField("effectiveTo", event.target.value)} />
          <label className="mt-6 flex items-center gap-2 text-sm text-gray-600"><input data-testid="hr-settings-policy-rules-active" type="checkbox" checked={rule.active} onChange={(event) => setField("active", event.target.checked)} />Active</label>
        </div>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button data-testid="hr-settings-policy-rules-save" type="submit" loading={busy}>Save rule</Button></DialogFooter>
      </form>
    </Dialog>
  );
}
