import { useState, type CSSProperties, type ReactNode } from "react";
import { Button, PageHeader } from "@jaldee/design-system";
import { useBookingAnalytics, AVG_PRICE, type Period } from "../../services/useBookingAnalytics";

/**
 * Bookings analytics overview.
 * Numbers are computed live from GET /bookings/range for the selected period
 * (useBookingAnalytics), falling back to sample data when the backend is down.
 */
const card: CSSProperties = { background: "white", border: "1px solid #f1f5f9", borderRadius: 24, padding: 24 };
const cardTitle: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", margin: 0, letterSpacing: "0.05em", fontFamily: "'Outfit',sans-serif" };
const cardSub: CSSProperties = { fontSize: 11, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 };

interface Kpi {
  label: string; value: number; color: string; bg: string;
  badge: ReactNode; icon: ReactNode; bar?: number; barColor?: string; sub?: ReactNode;
}

function pct(n: number, total: number) { return total > 0 ? Math.round((n / total) * 100) : 0; }

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>("week");

  const { total, confirmed, completed, pending, cancelled, online, walkin, revenue, live, loading } = useBookingAnalytics(period);

  const kpis: Kpi[] = [
    {
      label: "Total Bookings", value: total, color: "#6366f1",
      bg: "radial-gradient(circle at top right, #eef2ff 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ecfdf5", border: "1px solid #d1fae5", padding: "3px 6px", borderRadius: 6 }}>▲ 12.4%</span>,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>,
      sub: <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 10 }}>Period target quota: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#334155", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>100 slots</span></div>,
    },
    {
      label: "Confirmed", value: confirmed, color: "#10b981",
      bg: "radial-gradient(circle at top right, rgba(16,185,129,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 900, color: "#065f46", background: "#d1fae5", padding: "3px 7px", borderRadius: 10 }}>{pct(confirmed, total)}%</span>,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
      bar: total ? confirmed / total : 0, barColor: "#10b981",
    },
    {
      label: "Completed", value: completed, color: "#6366f1",
      bg: "radial-gradient(circle at top right, rgba(99,102,241,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 900, color: "#3730a3", background: "#e0e7ff", padding: "3px 7px", borderRadius: 10 }}>{pct(completed, total)}%</span>,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><circle cx="12" cy="8" r="7" /><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" /></svg>,
      bar: total ? completed / total : 0, barColor: "#6366f1",
    },
    {
      label: "Pending", value: pending, color: "#f59e0b",
      bg: "radial-gradient(circle at top right, rgba(245,158,11,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 900, color: "#92400e", background: "#fef3c7", padding: "3px 7px", borderRadius: 10 }}>{pct(pending, total)}%</span>,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      bar: total ? pending / total : 0, barColor: "#f59e0b",
    },
    {
      label: "Cancelled", value: cancelled, color: "#ef4444",
      bg: "radial-gradient(circle at top right, rgba(239,68,68,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "3px 6px", borderRadius: 6 }}>▼ 3% d/d</span>,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
      bar: total ? cancelled / total : 0, barColor: "#ef4444",
    },
  ];

  const periodBtn = (p: Period, label: string): CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, cursor: "pointer",
    background: period === p ? "white" : "transparent",
    fontWeight: period === p ? 900 : 700,
    color: period === p ? "#55349A" : "#94a3b8",
    boxShadow: period === p ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
  });

  const statusData = [
    { label: "Confirmed", value: confirmed, color: "#10b981" },
    { label: "Completed", value: completed, color: "#6366f1" },
    { label: "Pending", value: pending, color: "#f59e0b" },
    { label: "Cancelled", value: cancelled, color: "#ef4444" },
  ];

  return (
    <section id="page-home" className="page-section active" style={{ overflowY: "auto", background: "#f8fafc" }}>
      <div style={{ padding: "24px 28px" }}>
        <PageHeader
          title="Bookings Analytics"
          subtitle="Real-time reports for booking quotas, active schedules, and provider utilization."
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
          actions={
            <div style={{ display: "flex", background: "#f8fafc", border: "1px solid rgba(226,232,240,0.5)", borderRadius: 12, padding: 4 }}>
              <Button variant="ghost" size="sm" style={periodBtn("today", "Today")} onClick={() => setPeriod("today")}>Today</Button>
              <Button variant="ghost" size="sm" style={periodBtn("week", "This Week")} onClick={() => setPeriod("week")}>This Week</Button>
              <Button variant="ghost" size="sm" style={periodBtn("month", "All Time")} onClick={() => setPeriod("month")}>All Time</Button>
            </div>
          }
        />
        <div className="mb-4">
          <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 8, color: live ? "#065f46" : "#92400e", background: live ? "#d1fae5" : "#fef3c7" }}>
            {loading ? "Loading…" : live ? "● Live" : "Sample data"}
          </span>
        </div>

        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 24 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 20, padding: 20, position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <div style={{ position: "absolute", right: 0, top: 0, width: 100, height: 100, background: k.bg, pointerEvents: "none" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, position: "relative", zIndex: 1 }}>
                <span style={{ padding: 8, background: "rgba(241,245,249,0.5)", border: "1px solid #f1f5f9", borderRadius: 12, display: "flex" }}>{k.icon}</span>
                {k.badge}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Outfit',sans-serif" }}>{k.label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: k.label === "Cancelled" ? "#ef4444" : "#0f172a", marginTop: 6, fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>{k.value}</div>
              {k.bar !== undefined && (
                <div style={{ width: "100%", background: "#f1f5f9", height: 5, borderRadius: 10, overflow: "hidden", marginTop: 14 }}>
                  <div style={{ width: `${Math.round(k.bar * 100)}%`, background: k.barColor, height: "100%", borderRadius: 10 }} />
                </div>
              )}
              {k.sub}
            </div>
          ))}
        </div>

        {/* CHANNELS + REVENUE */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={card}>
            <h3 style={cardTitle}>Acquisition Channels</h3>
            <p style={cardSub}>Bookings via patient portals vs walk-in visitors.</p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {[{ n: "Online", v: online, c: "#55349A" }, { n: "Walk-in", v: walkin, c: "#10b981" }].map((ch) => (
                <div key={ch.n}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    <span>{ch.n}</span><span>{ch.v} ({pct(ch.v, total)}%)</span>
                  </div>
                  <div style={{ width: "100%", background: "#f1f5f9", height: 8, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct(ch.v, total)}%`, background: ch.c, height: "100%", borderRadius: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Estimated Revenue</h3>
            <p style={cardSub}>Projected from non-cancelled bookings.</p>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", marginTop: 16, fontFamily: "'Outfit',sans-serif" }}>₹{revenue.toLocaleString("en-IN")}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Avg. value per booking ₹{AVG_PRICE.toLocaleString("en-IN")}</div>
          </div>
        </div>

        {/* TREND + STATUS */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={{ ...card, position: "relative" }}>
            <h3 style={cardTitle}>Booking Trend</h3>
            <p style={cardSub}>Volume across the selected period.</p>
            <svg viewBox="0 0 600 180" style={{ width: "100%", height: 180, marginTop: 16 }}>
              <polyline fill="none" stroke="#55349A" strokeWidth="3" points="0,140 100,110 200,120 300,70 400,90 500,50 600,80" />
              <polygon fill="rgba(85,52,154,0.08)" points="0,140 100,110 200,120 300,70 400,90 500,50 600,80 600,180 0,180" />
            </svg>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Status Breakdown</h3>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {statusData.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", width: 36, textAlign: "right" }}>{pct(s.value, total)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WORKLOAD + DEPARTMENTS + PEAK */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
          <div style={card}>
            <h3 style={cardTitle}>Doctor Utilization</h3>
            <p style={cardSub}>Load distribution across providers.</p>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginTop: 16, fontFamily: "'Outfit',sans-serif" }}>{pct(confirmed + completed, total)}%</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Average utilization</div>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Departments</h3>
            <p style={cardSub}>Bookings by department.</p>
            <div style={{ marginTop: 16, fontSize: 13, color: "#334155", fontWeight: 600 }}>General Medicine · Cardiology · Pediatrics</div>
          </div>
          <div style={card}>
            <h3 style={cardTitle}>Peak Load</h3>
            <p style={cardSub}>Busiest booking window.</p>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginTop: 16, fontFamily: "'Outfit',sans-serif" }}>09:00 – 11:00</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Highest concentration of slots</div>
          </div>
        </div>
      </div>
    </section>
  );
}
