import type { CSSProperties, ReactNode } from "react";
import { LayoutGrid, Table as Rows3, X } from "lucide-react";
import { Button, EmptyState, SectionCard } from "@jaldee/design-system";
import type { ViewMode, SlabTier, StructureComponentMapping, EmployeeComponentValue } from "./payrollTypes";

// Style definitions (declared at top so they are initialized before component usage)
export const fieldWrap: CSSProperties = { display: "grid", gap: 6 };
export const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--light-text)" };
export const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  fontSize: 14,
  background: "var(--surface-bg)",
  color: "var(--dark-text)",
};
export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  color: "var(--light-text)",
  borderBottom: "1px solid var(--border-color)",
};
export const tdStyle: CSSProperties = { padding: "13px 14px", fontSize: 14, color: "var(--dark-text)", borderBottom: "1px solid var(--border-color)", verticalAlign: "middle" };
export const tdStrong: CSSProperties = { ...tdStyle, fontWeight: 800 };
export const buttonStyle: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8 };
export const smallAction: CSSProperties = { ...buttonStyle, padding: "7px 10px" };
export const viewToggleWrap: CSSProperties = { display: "inline-flex", alignItems: "center", flexShrink: 0, height: 40, padding: 2, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", gap: 2 };
export const viewToggleButton = (active: boolean): CSSProperties => ({
  border: "none",
  borderRadius: 7,
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  background: active ? "var(--color-primary)" : "transparent",
  color: active ? "white" : "var(--color-text-secondary)",
  boxShadow: "none",
});
export const statTile: CSSProperties = {
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: 18,
  background: "var(--surface-bg)",
  display: "flex",
  alignItems: "center",
  gap: 14,
  boxShadow: "var(--shadow-sm)",
};
export const statIcon: CSSProperties = { width: 38, height: 38, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--app-bg)", color: "var(--primary-color)" };
export const chipStyle: CSSProperties = { borderRadius: 999, padding: "3px 8px", background: "var(--app-bg)", color: "var(--dark-text)", fontSize: 11, fontWeight: 800 };
export const toggleStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 13, fontWeight: 700 };
export const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--light-text)", marginBottom: 8 };
export const emptyText: CSSProperties = { fontSize: 13, color: "var(--light-text)", padding: "10px 0" };
export const cardCollection: CSSProperties = { display: "grid", gap: 14 };
export const infoCard: CSSProperties = { display: "grid", gap: 14, padding: 16, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", boxShadow: "var(--shadow-sm)" };
export const builderMetricRow: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", fontSize: 13, color: "var(--dark-text)" };
export const dialogHeader: CSSProperties = { padding: "18px 22px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" };
export const dialogBody: CSSProperties = { padding: 22 };
export const dialogActions: CSSProperties = { padding: "16px 22px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 };
export const iconButton: CSSProperties = { background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
export const summaryBand: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 18, padding: 16, borderRadius: 8, background: "var(--app-bg)", marginBottom: 16, flexWrap: "wrap" };
export const tabBar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  padding: 4,
  background: "color-mix(in srgb, var(--color-border) 45%, white)",
  borderRadius: 8,
  marginBottom: 18,
  width: "fit-content",
};

export const tabButton = (active: boolean): CSSProperties => ({
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: active ? "var(--color-surface, #ffffff)" : "transparent",
  color: active ? "var(--color-text-primary, #0f172a)" : "var(--color-text-secondary, #64748b)",
  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
});

export function Panel({ title, action, children, padding = false }: { title: string; action?: ReactNode; children: ReactNode; padding?: boolean }) {
  return (
    <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
        <h3 className="modal-title font-semibold text-sm text-slate-900 m-0">{title}</h3>
        {action}
      </div>
      <div className={padding ? "p-4 sm:p-5" : "w-full min-w-0"}>{children}</div>
    </SectionCard>
  );
}

export function ViewToggle({
  value,
  onChange,
  scope,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  scope: string;
}) {
  return (
    <div data-view-toggle="table-card" style={viewToggleWrap}>
      <button
        id={`${scope}-table`}
        data-testid={`${scope}-table`}
        data-active={value === "table"}
        type="button"
        onClick={() => onChange("table")}
        style={viewToggleButton(value === "table")}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={14} />
      </button>
      <button
        id={`${scope}-cards`}
        data-testid={`${scope}-cards`}
        data-active={value === "cards"}
        type="button"
        onClick={() => onChange("cards")}
        style={viewToggleButton(value === "cards")}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );
}

export function CardCollection({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: ReactNode[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={cardCollection}>{items}</div>;
}

export function InfoCard({
  title,
  subtitle,
  rows,
  actions,
  footer,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div style={infoCard}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--dark-text)" }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: "var(--light-text)" }}>{subtitle}</div> : null}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} style={builderMetricRow}>
            <span style={{ color: "var(--light-text)" }}>{row.label}</span>
            <strong style={{ textAlign: "right" }}>{row.value}</strong>
          </div>
        ))}
      </div>
      {footer ? <div style={{ display: "flex", justifyContent: "flex-start" }}>{footer}</div> : null}
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

export function Table({
  headers,
  empty,
  children,
  compact,
}: {
  headers: string[];
  empty: string | null;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{headers.map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {empty ? (
            <tr><td colSpan={headers.length} style={{ ...tdStyle, textAlign: "center", padding: compact ? "22px 12px" : "44px 12px", color: "var(--light-text)" }}>{empty}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export function FlagList({ flags }: { flags: Array<string | false | undefined> }) {
  const visible = flags.filter(Boolean) as string[];
  if (visible.length === 0) return <span style={{ color: "var(--light-text)" }}>-</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {visible.map((flag) => <span key={flag} style={chipStyle}>{flag}</span>)}
    </div>
  );
}

export function SlabBuilder({ value, onChange }: { value: SlabTier[]; onChange: (value: SlabTier[]) => void }) {
  const numericOrUndefined = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return isNaN(n) ? undefined : n;
  };
  const update = (index: number, patch: SlabTier) => onChange(value.map((tier, i) => i === index ? { ...tier, ...patch } : tier));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={sectionLabel}>Slab Tiers</div>
      {value.length === 0 ? <div style={emptyText}>No tiers. Add min/max slabs for this component.</div> : null}
      {value.map((tier, index) => (
        <div key={index} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <input placeholder="Min" type="number" value={tier.min ?? ""} onChange={(e) => update(index, { min: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <input placeholder="Max" type="number" value={tier.max ?? ""} onChange={(e) => update(index, { max: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <input placeholder="Amount" type="number" value={tier.amount ?? ""} onChange={(e) => update(index, { amount: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <input placeholder="%" type="number" value={tier.percentage ?? ""} onChange={(e) => update(index, { percentage: numericOrUndefined(e.target.value) })} style={fieldStyle} />
          <button className="btn-grid-action" onClick={() => onChange(value.filter((_, i) => i !== index))} style={smallAction}>Remove</button>
        </div>
      ))}
      <button className="btn btn-secondary" onClick={() => onChange([...value, {}])} style={buttonStyle}>Add Tier</button>
    </div>
  );
}

export function OverrideInput({
  mapping,
  value,
  onChange,
}: {
  mapping?: StructureComponentMapping;
  value: EmployeeComponentValue;
  onChange: (patch: Partial<EmployeeComponentValue>) => void;
}) {
  const numericOrUndefined = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return isNaN(n) ? undefined : n;
  };
  const calculationType = value.calculationType || mapping?.calculationType;
  if (calculationType === "FORMULA") {
    return <textarea value={value.formulaExpression ?? ""} onChange={(e) => onChange({ formulaExpression: e.target.value })} rows={2} style={{ ...fieldStyle, minWidth: 220 }} />;
  }
  if (calculationType === "PERCENTAGE") {
    return <input type="number" value={value.overridePercentage ?? ""} onChange={(e) => onChange({ overridePercentage: numericOrUndefined(e.target.value) })} style={{ ...fieldStyle, minWidth: 150 }} />;
  }
  return <input type="number" value={value.overrideAmount ?? ""} onChange={(e) => onChange({ overrideAmount: numericOrUndefined(e.target.value) })} style={{ ...fieldStyle, minWidth: 150 }} />;
}

export function ToggleRow({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
}) {
  return (
    <label style={toggleStyle}>
      <span>{label}</span>
      <input data-testid={testId} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  id,
  testId,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  id?: string;
  testId?: string;
}) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}{required ? " *" : ""}</span>
      <input id={id} data-testid={testId || id} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  id,
  testId,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  testId?: string;
}) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <textarea id={id} data-testid={testId || id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
    </label>
  );
}

export function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={statTile}>
      <div style={statIcon}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dark-text)", fontFamily: "var(--font-heading)" }}>{value}</div>
      </div>
    </div>
  );
}

export function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={dialogHeader}>
      <h3 className="modal-title" style={{ fontSize: 16, margin: 0 }}>{title}</h3>
      <button onClick={onClose} aria-label="Close" style={iconButton}><X size={20} /></button>
    </div>
  );
}

export function DialogActions({
  busy,
  onClose,
  onSave,
  saveTestId,
}: {
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  saveTestId?: string;
}) {
  return (
    <div style={dialogActions}>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button data-testid={saveTestId} variant="primary" onClick={onSave} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
    </div>
  );
}
