import { useMemo, type CSSProperties } from "react";
import { Loader2, Users, Briefcase, AlertCircle, TrendingDown, CheckCircle2 } from "lucide-react";
import { useBranchNorms } from "../../services/useOrg";
import { useBranches } from "../../services/useBranches";
import { useDepartments, useShifts } from "../../services/useSettingsData";

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden", padding: 20 };
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)" };
const statVal: CSSProperties = { fontSize: 28, fontWeight: 900, color: "var(--dark-text)", lineHeight: 1 };

export default function HeadcountDashboardTab({ onRequestTransfer }: { onRequestTransfer?: (locId: string, deptId: string, shiftId: string) => void }) {
  const norms = useBranchNorms();
  const { data: branches } = useBranches();
  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.id, b.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid.slice(0, 8) : "All branches");
  }, [branches]);

  const departmentName = useMemo(() => {
    const m = new Map(departments.map((d) => [d.id, d.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Global Dept");
  }, [departments]);

  const shiftName = useMemo(() => {
    const m = new Map(shifts.map((s) => [s.id, s.name] as const));
    return (uid?: string | null) => (uid ? m.get(uid) ?? uid : "Any Shift");
  }, [shifts]);

  const kpis = useMemo(() => {
    if (!norms.data) return { sanctioned: 0, actual: 0, notice: 0, projected: 0, shortage: 0, excess: 0 };
    return norms.data.reduce(
      (acc, n) => {
        acc.sanctioned += n.sanctioned || 0;
        acc.actual += n.actual || 0;
        acc.notice += n.inNotice || 0;
        acc.projected += n.projected || 0;
        if (n.flag === "Shortage") acc.shortage += (n.sanctioned || 0) - (n.projected || 0);
        if (n.flag === "Excess") acc.excess += (n.projected || 0) - (n.sanctioned || 0);
        return acc;
      },
      { sanctioned: 0, actual: 0, notice: 0, projected: 0, shortage: 0, excess: 0 }
    );
  }, [norms.data]);

  if (norms.loading) {
    return <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={18} className="animate-spin" style={{ display: "inline" }} /></div>;
  }
  if (norms.error) {
    return (
      <div style={{ padding: "11px 14px", borderRadius: 12, background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8 }}>
        <AlertCircle size={15} /> {norms.error}
      </div>
    );
  }

  const byGroup = norms.data.reduce((acc, n) => {
    const bId = n.locationUid || "global_branch";
    const dId = n.departmentUid || "global_dept";
    const sId = n.shiftUid || "global_shift";
    const key = `${bId}|${dId}|${sId}`;
    if (!acc[key]) acc[key] = { bId, dId, sId, roles: [] };
    acc[key].roles.push(n);
    return acc;
  }, {} as Record<string, { bId: string; dId: string; sId: string; roles: typeof norms.data }>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div style={card}>
          <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><Briefcase size={14} color={TEAL} /> Total Sanctioned</div>
          <div style={statVal}>{kpis.sanctioned}</div>
          <div style={{ fontSize: 11, color: "var(--light-text)", marginTop: 8 }}>Approved positions</div>
        </div>
        <div style={card}>
          <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><Users size={14} color="#0284c7" /> Actual Strength</div>
          <div style={statVal}>{kpis.actual}</div>
          <div style={{ fontSize: 11, color: "var(--light-text)", marginTop: 8 }}>Current active employees</div>
        </div>
        <div style={card}>
          <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><TrendingDown size={14} color="#d97706" /> In Notice Period</div>
          <div style={statVal}>{kpis.notice}</div>
          <div style={{ fontSize: 11, color: "var(--light-text)", marginTop: 8 }}>Expected to leave</div>
        </div>
        <div style={card}>
          <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><AlertCircle size={14} color="#e11d48" /> Vacancies / Shortage</div>
          <div style={statVal}>{kpis.shortage}</div>
          <div style={{ fontSize: 11, color: "var(--light-text)", marginTop: 8 }}>Projected unfilled positions</div>
        </div>
      </div>

      {/* Branch Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {Object.values(byGroup).map(({ bId, dId, sId, roles }) => {
          const bSanctioned = roles.reduce((sum, r) => sum + (r.sanctioned || 0), 0);
          const bProjected = roles.reduce((sum, r) => sum + (r.projected || 0), 0);
          const pct = bSanctioned > 0 ? Math.min(100, Math.round((bProjected / bSanctioned) * 100)) : 100;
          const isHealthy = pct >= 90 && pct <= 100;

          const title = [
            bId === "global_branch" ? "Global Roles" : branchName(bId),
            dId !== "global_dept" ? departmentName(dId) : null,
            sId !== "global_shift" ? shiftName(sId) : null
          ].filter(Boolean).join(" • ");

          return (
            <div key={`${bId}|${dId}|${sId}`} style={{ ...card, padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", background: "rgba(100,116,139,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--dark-text)" }}>{title}</h4>
                <div style={{ fontSize: 12, fontWeight: 700, color: isHealthy ? "#059669" : "#e11d48", display: "flex", alignItems: "center", gap: 4 }}>
                  {isHealthy ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {pct}% Filled
                </div>
              </div>
              <div style={{ padding: 20 }}>
                {/* Progress Bar */}
                <div style={{ height: 6, background: "var(--border-color)", borderRadius: 3, marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: isHealthy ? "#059669" : (pct > 100 ? "#d97706" : "#e11d48"), borderRadius: 3 }} />
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {roles.map((r, i) => {
                    const c = r.flag === "Shortage" ? "#e11d48" : r.flag === "Excess" ? "#d97706" : "#059669";
                    const roleTitle = r.positionName || r.departmentName || (dId !== "global_dept" ? departmentName(dId) : "Unassigned role");
                    const shortageCount = Math.max(0, (r.sanctioned || 0) - (r.projected || 0));
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 12px", background: "var(--app-bg)", borderRadius: 10, border: "1px solid var(--border-color)" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)" }}>{roleTitle}</div>
                          <div style={{ fontSize: 10, color: "var(--light-text)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {r.shiftName || (sId !== "global_shift" ? shiftName(sId) : "Any Shift")}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--light-text)", marginTop: 6 }}>
                            Actual: {r.actual}
                            {r.inNotice > 0 && <span style={{ color: "#d97706" }}> • {r.inNotice} leaving</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)" }}>{r.projected} / {r.sanctioned}</div>
                          <div style={{ fontSize: 10, color: "var(--light-text)", marginTop: 2 }}>Projected / Sanctioned</div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginTop: 4 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: c }}>
                              {r.flag === "Shortage" ? `${r.flag} ${shortageCount > 0 ? `(${shortageCount})` : ""}`.trim() : r.flag}
                            </div>
                            {r.flag === "Shortage" && onRequestTransfer && (
                              <button onClick={() => onRequestTransfer(bId, dId, sId)} style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", background: "rgba(225,29,72,0.1)", color: "#e11d48", border: "1px solid rgba(225,29,72,0.2)", borderRadius: 6, cursor: "pointer" }}>Fill Seat</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {Object.keys(byGroup).length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--light-text)", fontSize: 13, width: "100%", gridColumn: "1 / -1" }}>
            No seats allocated for headcount tracking yet.
          </div>
        )}
      </div>
    </div>
  );
}
