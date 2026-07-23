import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CalendarClock, Ticket, Megaphone, Wallet, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "../../lib/utils";
import { HR_ANALYTICS_NAVIGATION_STATE } from "../../lib/hrNavigation";
import { useHrAnalytics, type HrAnalyticsFrequency } from "../../services/useHrAnalytics";

const card: CSSProperties = { background: "white", border: "1px solid #f1f5f9", borderRadius: 24, padding: 24 };
const cardTitle: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", margin: 0, letterSpacing: "0.05em", fontFamily: "'Outfit',sans-serif" };
const cardSub: CSSProperties = { fontSize: 11, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 };

interface Kpi {
  id: string;
  label: string; value: number | string; color: string; bg: string;
  badge: ReactNode; icon: ReactNode; bar?: number; barColor?: string; sub?: ReactNode; onClick?: () => void;
}

function pct(n: number, total: number) { return total > 0 ? Math.round((n / total) * 100) : 0; }

function recordArray(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as Record<string, unknown>[];
  }
  return [];
}

function metric(data: Record<string, unknown>, ...names: string[]) {
  const wanted = new Set(names.map((name) => name.toUpperCase()));
  const values = recordArray(data, ["totals", "metricWiseValues", "metrics", "metricValues", "rows"]);
  const match = values.find((item) =>
    wanted.has(String(item.metricName ?? item.name ?? item.metricTypeName ?? "").toUpperCase()) ||
    wanted.has(String(item.metricDisplayName ?? "").toUpperCase())
  );
  const value = match?.value ?? match?.count ?? match?.amount ?? 0;
  return Number(value) || 0;
}

function metricRows(data: Record<string, unknown>, ...names: string[]) {
  const wanted = new Set(names.map((name) => name.toUpperCase()));
  return recordArray(data, ["rows"])
    .filter((item) => wanted.has(String(item.metricName ?? "").toUpperCase()))
    .sort((a, b) => {
      const key = (item: Record<string, unknown>) =>
        `${item.year ?? ""}-${String(item.month ?? "").padStart(2, "0")}-${item.dateFor ?? ""}-${String(item.hour ?? "").padStart(2, "0")}`;
      return key(a).localeCompare(key(b));
    })
    .map((item) => Number(item.value ?? item.floatAmount ?? item.amount ?? 0) || 0);
}

function breakdown(data: Record<string, unknown>, keys: string[]) {
  return recordArray(data, keys).map((item) => ({
    name: String(item.name ?? item.label ?? item.departmentName ?? ""),
    value: Number(item.value ?? item.count ?? item.total ?? 0) || 0,
  })).filter((item) => item.name);
}

function trendPoints(values: number[], width = 600, height = 160) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (value / max) * (height - 20);
    return `${x},${y}`;
  }).join(" ");
}

export default function Dashboard() {
  const navigate = useNavigate();
  const navigateFromAnalytics = (href: string) =>
    navigate(href, { state: HR_ANALYTICS_NAVIGATION_STATE });

  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const frequency: HrAnalyticsFrequency =
    period === "today" ? "DAILY" : period === "week" ? "WEEKLY" : "MONTHLY";
  const { data: analytics, loading, error } = useHrAnalytics(frequency);
  const stats = useMemo(() => ({
    employees: metric(analytics, "hr.employee.active.count"),
    presentToday: metric(analytics, "hr.attendance.present.count"),
    pendingLeaves: metric(analytics, "hr.leave.pending.count"),
    openTickets: metric(analytics, "HR_OPEN_TICKETS", "HR_OPEN_TICKETS_COUNT", "OPEN_TICKETS"),
    lastPayout: metric(
      analytics,
      "hr.payroll.last.payout",
      "hr.payroll.total.payout",
      "hr.payroll.processed.amount",
      "hr.payroll.net.salary",
      "Last Payout",
    ),
  }), [analytics]);
  const pinned = recordArray(analytics, ["latestBroadcasts", "announcements", "broadcasts"])
    .slice(0, 5)
    .map((item, index) => ({
      id: String(item.id ?? item.uid ?? index),
      title: String(item.title ?? item.name ?? "Announcement"),
      type: String(item.type ?? item.category ?? "General"),
      startDate: item.startDate ?? item.date ?? item.createdAt
        ? String(item.startDate ?? item.date ?? item.createdAt)
        : "",
      isPinned: Boolean(item.isPinned ?? item.pinned),
    }));
  const departments = breakdown(analytics, ["departmentWiseValues", "departmentBreakdown", "employeesByDepartment"]);
  const attendanceTrend = metricRows(analytics, "hr.attendance.present.count");
  const leaveTrend = metricRows(analytics, "hr.leave.applied", "hr.leave.pending.count");
  const tenureAverage = metric(analytics, "HR_AVERAGE_TENURE", "AVERAGE_TENURE", "TENURE_AVERAGE");
  const retentionChange = metric(analytics, "HR_RETENTION_CHANGE_PERCENT", "RETENTION_CHANGE_PERCENT");
  const femalePercent = metric(analytics, "HR_FEMALE_PERCENT", "FEMALE_PERCENT", "FEMALE_RATIO");
  const malePercent = metric(analytics, "HR_MALE_PERCENT", "MALE_PERCENT", "MALE_RATIO");

  const kpis: Kpi[] = [
    {
      id: "total-employees",
      label: "Total Employees", value: stats.employees, color: "#6366f1",
      bg: "radial-gradient(circle at top right, #eef2ff 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ecfdf5", border: "1px solid #d1fae5", padding: "3px 6px", borderRadius: 6 }}>▲ 2.1%</span>,
      icon: <Users size={18} stroke="#6366f1" strokeWidth={2.5} />,
      sub: <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 10 }}>Active headcount limit: <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#334155", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>50</span></div>,
      onClick: () => navigateFromAnalytics("/employees")
    },
    {
      id: "present-today",
      label: period === "today" ? "Present Today" : period === "week" ? "Avg Present (Week)" : "Avg Present (Month)",
      value: stats.presentToday, color: "#10b981",
      bg: "radial-gradient(circle at top right, rgba(16,185,129,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 900, color: "#065f46", background: "#d1fae5", padding: "3px 7px", borderRadius: 10 }}>{pct(stats.presentToday, stats.employees)}%</span>,
      icon: <CalendarClock size={18} stroke="#10b981" strokeWidth={2.5} />,
      bar: stats.employees ? stats.presentToday / stats.employees : 0, barColor: "#10b981",
      onClick: () => navigateFromAnalytics("/attendance")
    },
    {
      id: "pending-leaves",
      label: period === "today" ? "Pending Leaves" : period === "week" ? "Pending Leaves (Week)" : "Pending Leaves (Month)",
      value: stats.pendingLeaves, color: "#f59e0b",
      bg: "radial-gradient(circle at top right, rgba(245,158,11,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 900, color: "#92400e", background: "#fef3c7", padding: "3px 7px", borderRadius: 10 }}>Action Req</span>,
      icon: <CalendarClock size={18} stroke="#f59e0b" strokeWidth={2.5} />,
      bar: stats.employees ? stats.pendingLeaves / stats.employees : 0, barColor: "#f59e0b",
      onClick: () => navigateFromAnalytics("/leave")
    },
    {
      id: "open-tickets",
      label: period === "today" ? "Open Tickets" : period === "week" ? "Open Tickets (Week)" : "Open Tickets (Month)",
      value: stats.openTickets, color: "#ef4444",
      bg: "radial-gradient(circle at top right, rgba(239,68,68,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", padding: "3px 6px", borderRadius: 6 }}>▼ 12%</span>,
      icon: <Ticket size={18} stroke="#ef4444" strokeWidth={2.5} />,
      bar: stats.employees ? stats.openTickets / stats.employees : 0, barColor: "#ef4444",
      onClick: () => navigateFromAnalytics("/tickets")
    },
    {
      id: "last-payout",
      label: "Last Payout", value: stats.lastPayout != null ? formatCurrency(stats.lastPayout) : "—", color: "#8b5cf6",
      bg: "radial-gradient(circle at top right, rgba(139,92,246,0.08) 0%, transparent 65%)",
      badge: <span style={{ fontSize: 10, fontWeight: 700, color: "#4c1d95", background: "#ede9fe", border: "1px solid #ddd6fe", padding: "3px 6px", borderRadius: 6 }}>Paid</span>,
      icon: <Wallet size={18} stroke="#8b5cf6" strokeWidth={2.5} />,
      bar: 1, barColor: "#8b5cf6",
      onClick: () => navigateFromAnalytics("/payroll")
    },
  ];

  const periodBtn = (p: "today" | "week" | "month", label: string): CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, cursor: "pointer",
    background: p === period ? "white" : "transparent",
    fontWeight: p === period ? 900 : 700,
    color: p === period ? "#115E59" : "#94a3b8",
    boxShadow: p === period ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
    transition: "all 0.15s ease",
  });

  const trendConfig = useMemo(() => {
    const points = trendPoints(attendanceTrend);
    return {
      sub: period === "today"
        ? "Daily active workforce vs scheduled leaves."
        : period === "week"
          ? "Weekly active workforce vs scheduled leaves."
          : "Monthly active workforce vs scheduled leaves.",
      points,
      poly: points ? `${points} 600,180 0,180` : "",
      dash: trendPoints(leaveTrend),
    };
  }, [attendanceTrend, leaveTrend, period]);

  return (
    <section id="page-hr-home" data-testid="hr-dashboard-page" className="page-section active" style={{ background: "#f8fafc", flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ minWidth: 0, boxSizing: "border-box" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ padding: 8, background: "rgba(17,94,89,0.05)", borderRadius: 12 }}>
                <Users size={20} stroke="#115E59" strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: "#111827", margin: 0 }}>HR Analytics</h1>
              <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 8, marginLeft: 4, color: "#065f46", background: "#d1fae5" }}>
                ● Live
              </span>
            </div>
            <p style={{ fontSize: 14, lineHeight: "20px", color: "#6b7280", margin: 0 }}>Real-time visual diagnostic reports of workforce utilization, attendance trends, and engagement metrics.</p>
            {loading && <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>Loading analytics...</p>}
            {error && <p role="alert" style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>{error}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", background: "#f8fafc", border: "1px solid rgba(226,232,240,0.5)", borderRadius: 12, padding: 4 }}>
              <button id="hr-dashboard-period-today" data-testid="hr-dashboard-period-today" data-active={period === "today" ? "true" : "false"} style={periodBtn("today", "Today")} onClick={() => setPeriod("today")}>Today</button>
              <button id="hr-dashboard-period-week" data-testid="hr-dashboard-period-week" data-active={period === "week" ? "true" : "false"} style={periodBtn("week", "This Week")} onClick={() => setPeriod("week")}>This Week</button>
              <button id="hr-dashboard-period-month" data-testid="hr-dashboard-period-month" data-active={period === "month" ? "true" : "false"} style={periodBtn("month", "This Month")} onClick={() => setPeriod("month")}>This Month</button>
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          {kpis.map((k) => (
            <div key={k.id} id={`hr-dashboard-kpi-${k.id}`} data-testid={`hr-dashboard-kpi-${k.id}`} onClick={k.onClick} style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 20, padding: 20, position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", cursor: "pointer" }}>
              <div style={{ position: "absolute", right: 0, top: 0, width: 100, height: 100, background: k.bg, pointerEvents: "none" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, position: "relative", zIndex: 1 }}>
                <span style={{ padding: 8, background: "rgba(241,245,249,0.5)", border: "1px solid #f1f5f9", borderRadius: 12, display: "flex" }}>{k.icon}</span>
                {k.badge}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Outfit',sans-serif" }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: k.label.includes("Tickets") ? "#ef4444" : "#0f172a", marginTop: 6, fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>{k.value}</div>
              {k.bar !== undefined && (
                <div style={{ width: "100%", background: "#f1f5f9", height: 5, borderRadius: 10, overflow: "hidden", marginTop: 14 }}>
                  <div style={{ width: `${Math.round(k.bar * 100)}%`, background: k.barColor, height: "100%", borderRadius: 10 }} />
                </div>
              )}
              {k.sub}
            </div>
          ))}
        </div>

        {/* TREND + BROADCASTS */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1.5fr)", gap: 20, marginBottom: 24 }}>
          {/* ATTENDANCE TREND */}
          <div id="hr-dashboard-attendance-trend" data-testid="hr-dashboard-attendance-trend" style={{ ...card, position: "relative" }}>
            <h3 style={cardTitle}>Attendance Trend</h3>
            <p style={cardSub}>{trendConfig.sub}</p>
            <svg viewBox="0 0 600 180" style={{ width: "100%", height: 220, marginTop: 16 }}>
              <polyline fill="none" stroke="#115E59" strokeWidth="3" points={trendConfig.points} />
              <polygon fill="rgba(17,94,89,0.08)" points={trendConfig.poly} />
              
              <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" points={trendConfig.dash} />
            </svg>
          </div>

          {/* LATEST BROADCASTS */}
          <div id="hr-dashboard-broadcasts" data-testid="hr-dashboard-broadcasts" style={{ ...card, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={cardTitle}>Latest Broadcasts</h3>
                <p style={cardSub}>Company-wide announcements.</p>
              </div>
              <button id="hr-dashboard-broadcasts-view-all" data-testid="hr-dashboard-broadcasts-view-all" onClick={() => navigateFromAnalytics("/announcements")} style={{ background: "rgba(17,94,89,0.05)", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#115E59", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, flexGrow: 1 }}>
              {pinned.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>No announcements yet.</div>
              ) : (
                pinned.map((a) => (
                  <div key={a.id} id={`hr-dashboard-broadcast-${a.id}`} data-testid={`hr-dashboard-broadcast-${a.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ padding: 8, background: "white", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <Megaphone size={16} stroke="#115E59" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>{a.type || "General"}{a.startDate ? ` · ${formatDate(a.startDate)}` : ""}</div>
                      </div>
                    </div>
                    {a.isPinned && <span style={{ fontSize: 10, fontWeight: 800, color: "#115E59", background: "rgba(17,94,89,0.1)", padding: "4px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pinned</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* WORKFORCE DEMOGRAPHICS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 24 }}>
          <div id="hr-dashboard-department-breakdown" data-testid="hr-dashboard-department-breakdown" style={card}>
            <h3 style={cardTitle}>Department Breakdown</h3>
            <p style={cardSub}>Distribution of staff across teams.</p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {departments.map((department, index) => (
                <div key={department.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    <span>{department.name}</span><span>{department.value} ({pct(department.value, stats.employees)}%)</span>
                  </div>
                  <div style={{ width: "100%", background: "#f1f5f9", height: 8, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct(department.value, stats.employees)}%`, background: ["#55349A", "#10b981", "#f59e0b"][index % 3], height: "100%", borderRadius: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div id="hr-dashboard-tenure-average" data-testid="hr-dashboard-tenure-average" style={card}>
            <h3 style={cardTitle}>Tenure Average</h3>
            <p style={cardSub}>Employee retention health.</p>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", marginTop: 16, fontFamily: "'Outfit',sans-serif" }}>{tenureAverage} yrs</div>
            <div style={{ fontSize: 12, color: "#10b981", marginTop: 4, fontWeight: 700 }}>{retentionChange}% YoY retention</div>
          </div>
          <div id="hr-dashboard-diversity-ratio" data-testid="hr-dashboard-diversity-ratio" style={card}>
            <h3 style={cardTitle}>Diversity Ratio</h3>
            <p style={cardSub}>Gender distribution.</p>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginTop: 16, fontFamily: "'Outfit',sans-serif" }}>{femalePercent}% / {malePercent}%</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Female / Male ratio</div>
          </div>
        </div>
      </div>
    </section>
  );
}
