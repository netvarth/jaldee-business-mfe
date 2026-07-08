import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Search, Users2, AlertTriangle, Loader2, Network } from "lucide-react";
import { useEmployees } from "../../services/useEmployees";
import { Input } from "@jaldee/design-system";
import type { Employee } from "../../types";

/**
 * R2.1 — Org chart built from Employee.reportingManagerUid (served live by
 * /employees; no dedicated endpoint needed). Employees without a manager are
 * roots; a missing/unknown manager reference is flagged, never dropped.
 * Cycles are broken defensively (a node is rendered once).
 */

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20 };
const lbl: CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };

interface OrgNode {
  emp: Employee;
  children: OrgNode[];
  orphaned: boolean; // has a reportingManagerUid that doesn't resolve
}

function buildForest(employees: Employee[]): { roots: OrgNode[]; orphanCount: number } {
  const byId = new Map(employees.map((e) => [e.id, e] as const));
  const nodes = new Map<string, OrgNode>(employees.map((e) => [e.id, { emp: e, children: [], orphaned: false }] as const));
  const roots: OrgNode[] = [];
  let orphanCount = 0;

  nodes.forEach((node) => {
    const mgr = node.emp.reportingManagerUid;
    if (mgr && byId.has(mgr) && mgr !== node.emp.id) {
      nodes.get(mgr)!.children.push(node);
    } else {
      if (mgr && !byId.has(mgr)) { node.orphaned = true; orphanCount += 1; }
      roots.push(node);
    }
  });

  // Break cycles: nodes reachable from roots are fine; anything not reached is
  // in a manager-cycle — promote one representative per cycle to a root.
  const seen = new Set<string>();
  const walk = (n: OrgNode) => { if (seen.has(n.emp.id)) return; seen.add(n.emp.id); n.children.forEach(walk); };
  roots.forEach(walk);
  nodes.forEach((n) => {
    if (!seen.has(n.emp.id)) {
      n.orphaned = true; orphanCount += 1;
      roots.push(n); walk(n);
    }
  });

  const sortRec = (list: OrgNode[]) => { list.sort((a, b) => a.emp.name.localeCompare(b.emp.name)); list.forEach((n) => sortRec(n.children)); };
  sortRec(roots);
  return { roots, orphanCount };
}

function countDescendants(n: OrgNode): number {
  return n.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

function matches(e: Employee, q: string): boolean {
  const s = q.toLowerCase();
  return e.name.toLowerCase().includes(s)
    || (e.designation || "").toLowerCase().includes(s)
    || (e.department || "").toLowerCase().includes(s)
    || (e.employeeId || "").toLowerCase().includes(s);
}

/** A subtree contains a match if the node or any descendant matches. */
function subtreeMatches(n: OrgNode, q: string): boolean {
  return matches(n.emp, q) || n.children.some((c) => subtreeMatches(c, q));
}

function NodeRow({ node, depth, q, expanded, toggle, onOpen }: {
  node: OrgNode; depth: number; q: string;
  expanded: Set<string>; toggle: (id: string) => void; onOpen: (id: string) => void;
}) {
  if (q && !subtreeMatches(node, q)) return null;
  const e = node.emp;
  const isOpen = q ? true : expanded.has(e.id); // search auto-expands
  const directs = node.children.length;
  const isMatch = q ? matches(e, q) : false;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginLeft: depth * 26, borderRadius: 14, border: `1px solid ${isMatch ? "rgba(17,94,89,0.4)" : "var(--border-color)"}`, background: isMatch ? "rgba(17,94,89,0.05)" : "var(--surface-bg)", marginBottom: 8 }}>
        <button
          onClick={() => directs && toggle(e.id)}
          style={{ background: "none", border: "none", cursor: directs ? "pointer" : "default", color: "var(--light-text)", width: 18, display: "flex", justifyContent: "center", padding: 0 }}
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {directs > 0 ? (isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : <span style={{ width: 15 }} />}
        </button>
        <div style={{ height: 36, width: 36, borderRadius: 12, flexShrink: 0, background: "rgba(17,94,89,0.06)", border: "1px solid rgba(17,94,89,0.12)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, overflow: "hidden" }}>
          {e.photoUrl ? <img src={e.photoUrl} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : e.name.charAt(0)}
        </div>
        <button onClick={() => onOpen(e.id)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "var(--dark-text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {e.name}
            {node.orphaned && (
              <span title="reportingManagerUid doesn't resolve to an employee" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, color: "#d97706", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "2px 8px" }}>
                <AlertTriangle size={10} /> UNRESOLVED MANAGER
              </span>
            )}
          </div>
          <div style={{ ...lbl, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {[e.employeeId, e.designation, e.department].filter(Boolean).join(" · ") || "—"}
          </div>
        </button>
        {directs > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, color: TEAL, background: "rgba(17,94,89,0.06)", border: "1px solid rgba(17,94,89,0.15)", borderRadius: 999, padding: "3px 10px", flexShrink: 0 }}>
            <Users2 size={11} /> {directs} direct · {countDescendants(node)} total
          </span>
        )}
        {e.hierarchyLevel != null && (
          <span style={{ ...lbl, flexShrink: 0, border: "1px solid var(--border-color)", borderRadius: 8, padding: "3px 8px" }}>L{e.hierarchyLevel}</span>
        )}
      </div>
      {isOpen && node.children.map((c) => (
        <NodeRow key={c.emp.id} node={c} depth={depth + 1} q={q} expanded={expanded} toggle={toggle} onOpen={onOpen} />
      ))}
    </div>
  );
}

export default function OrgChartTab() {
  const { data: employees, loading, error } = useEmployees();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedAll, setExpandedAll] = useState(false);

  const { roots, orphanCount } = useMemo(() => buildForest(employees), [employees]);

  const allIds = useMemo(() => employees.map((e) => e.id), [employees]);
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const expandAll = () => { setExpanded(new Set(allIds)); setExpandedAll(true); };
  const collapseAll = () => { setExpanded(new Set()); setExpandedAll(false); };

  const managers = useMemo(() => new Set(employees.map((e) => e.reportingManagerUid).filter(Boolean)).size, [employees]);

  return (
    <div style={{ height: "100%" }}>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", width: 320, maxWidth: "100%" }}>
          <Input placeholder="Search name, designation, department, ID…" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={16} />} />
        </div>
        <button onClick={expandedAll ? collapseAll : expandAll} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", fontWeight: 800, fontSize: 12, cursor: "pointer", color: "var(--dark-text)" }}>
          {expandedAll ? "Collapse all" : "Expand all"}
        </button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...lbl, border: "1px solid var(--border-color)", borderRadius: 999, padding: "6px 12px" }}>{employees.length} employees</span>
          <span style={{ ...lbl, border: "1px solid var(--border-color)", borderRadius: 999, padding: "6px 12px" }}>{managers} managers</span>
          <span style={{ ...lbl, border: "1px solid var(--border-color)", borderRadius: 999, padding: "6px 12px" }}>{roots.length} roots</span>
          {orphanCount > 0 && (
            <span style={{ ...lbl, color: "#d97706", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.06)", borderRadius: 999, padding: "6px 12px" }}>
              {orphanCount} unresolved manager ref{orphanCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div style={{ ...card, padding: 20 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", color: "var(--light-text)" }}>
            <Loader2 size={18} className="animate-spin" /> <span style={lbl}>Loading employees…</span>
          </div>
        ) : error ? (
          <div style={{ padding: "24px 16px", borderRadius: 12, background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.2)", color: "#e11d48", fontSize: 13, fontWeight: 600 }}>
            Failed to load employees: {error}
          </div>
        ) : roots.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0", color: "var(--light-text)" }}>
            <Network size={40} strokeWidth={1.2} /> <span style={lbl}>No employees yet</span>
          </div>
        ) : (
          roots.map((r) => (
            <NodeRow key={r.emp.id} node={r} depth={0} q={q.trim()} expanded={expanded} toggle={toggle} onOpen={(id) => navigate(`/employees/${id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
