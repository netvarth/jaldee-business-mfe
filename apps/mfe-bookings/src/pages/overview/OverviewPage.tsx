import { useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { Button, PageHeader, Badge } from "@jaldee/design-system";
import { useBookingAnalytics, type Period } from "../../services/useBookingAnalytics";
import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";
import { useCalendars } from "../../services/useCalendars";

/**
 * Bookings analytics overview.
 * Numbers are computed from booking API records for the selected period.
 */
const card: CSSProperties = { background: "white", border: "1px solid #f1f5f9", borderRadius: 24, padding: 24 };
const cardTitle: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", margin: 0, letterSpacing: "0.05em", fontFamily: "'Outfit',sans-serif" };
const cardSub: CSSProperties = { fontSize: 11, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 };

interface Kpi {
  label: string; value: number; color: string; bg: string;
  badge: ReactNode; icon: ReactNode; bar?: number; barColor?: string; sub?: ReactNode;
}

function pct(n: number, total: number) { return total > 0 ? Math.round((n / total) * 100) : 0; }

function formatTimeOnly(isoString?: string) {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>("week");

  const { total, confirmed, completed, pending, cancelled, online, walkin, revenue, live, loading, rawBookings } = useBookingAnalytics(period);
  
  const { services } = useServices();
  const { users } = useUsers();
  const { calendars } = useCalendars();

  const serviceMap = useMemo(() => new Map(services.map(s => [s.uid ?? s.id, s.name])), [services]);
  const userMap = useMemo(() => new Map(users.map(u => [u.userUid, u.displayName])), [users]);
  const calendarMap = useMemo(() => new Map(calendars.map(c => [c.uid, c.name])), [calendars]);

  const { topServices, topUsers, topCalendars, peakHours, upcoming } = useMemo(() => {
    const serviceCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    const calendarCounts = new Map<string, number>();

    rawBookings.forEach(b => {
      // We often exclude cancelled for "top performance" stats, but including everything gives a full picture. Let's exclude cancelled/no-shows for true utilization.
      const isCancelled = b.status?.toUpperCase().includes("CANCEL") || b.status?.toUpperCase().includes("NO_SHOW");
      if (!isCancelled) {
        if (b.serviceUid) serviceCounts.set(b.serviceUid, (serviceCounts.get(b.serviceUid) || 0) + 1);
        if (b.userUid) userCounts.set(b.userUid, (userCounts.get(b.userUid) || 0) + 1);
        if (b.calendarUid) calendarCounts.set(b.calendarUid, (calendarCounts.get(b.calendarUid) || 0) + 1);
        
        if (b.startTime) {
          try {
            const d = new Date(b.startTime);
            if (!isNaN(d.getTime())) {
              const hr = d.getHours();
              hourCounts.set(hr, (hourCounts.get(hr) || 0) + 1);
            }
          } catch (e) {}
        }
      }
    });

    // Valid bookings total for percentage bars
    const validTotal = Array.from(serviceCounts.values()).reduce((a, b) => a + b, 0) || 1;

    const tServices = Array.from(serviceCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([uid, count]) => ({ name: serviceMap.get(uid) || "Unknown Service", count }));

    const tUsers = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([uid, count]) => ({ name: userMap.get(uid) || "Unknown Provider", count }));

    const tCalendars = Array.from(calendarCounts.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([uid, count]) => ({ name: calendarMap.get(uid) || "Unknown Calendar", count }));

    const maxHourCount = Math.max(...Array.from(hourCounts.values()), 1);
    const pHours = Array.from(hourCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hr, count]) => ({ 
        label: `${hr % 12 || 12} ${hr >= 12 ? 'PM' : 'AM'}`, 
        count,
        pct: (count / maxHourCount) * 100 
      }));

    const now = new Date();
    const upc = rawBookings
      .filter(b => {
        const status = b.status?.toUpperCase() || "";
        return !status.includes("CANCEL") && !status.includes("NO_SHOW") && !status.includes("COMPLET");
      })
      .filter(b => {
        if (!b.startTime) return false;
        const d = new Date(b.startTime);
        return !isNaN(d.getTime()) && d.getTime() >= now.getTime();
      })
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
      .slice(0, 5);

    return { topServices: tServices, topUsers: tUsers, topCalendars: tCalendars, peakHours: pHours, upcoming: upc, validTotal };
  }, [rawBookings, serviceMap, userMap, calendarMap]);

  const kpis: Kpi[] = [
    {
      label: "Total Bookings", value: total, color: "#6366f1",
      bg: "radial-gradient(circle at top right, #eef2ff 0%, transparent 65%)",
      badge: null,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>,
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
      badge: <span style={{ fontSize: 10, fontWeight: 900, color: "#b91c1c", background: "#fee2e2", padding: "3px 7px", borderRadius: 10 }}>{pct(cancelled, total)}%</span>,
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
        {(loading || live) && (
          <div className="mb-4">
            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 8, color: "#065f46", background: "#d1fae5" }}>
              {loading ? "Loading…" : "● Live"}
            </span>
          </div>
        )}

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

        {/* TOP WIDGETS ROW 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* UPCOMING APPOINTMENTS FEED */}
          <div style={{ ...card, gridColumn: "span 2" }}>
            <h3 style={cardTitle}>Upcoming Appointments</h3>
            <p style={cardSub}>Next scheduled visits</p>
            <div style={{ marginTop: 20 }}>
              {upcoming.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f1f5f9", color: "#94a3b8", textAlign: "left" }}>
                      <th style={{ paddingBottom: 10, fontWeight: 600 }}>Time</th>
                      <th style={{ paddingBottom: 10, fontWeight: 600 }}>Patient</th>
                      <th style={{ paddingBottom: 10, fontWeight: 600 }}>Service</th>
                      <th style={{ paddingBottom: 10, fontWeight: 600 }}>Provider</th>
                      <th style={{ paddingBottom: 10, fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((b, i) => (
                      <tr key={b.uid || i} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "12px 0", fontWeight: 700, color: "#334155" }}>
                          {formatTimeOnly(b.startTime)}
                        </td>
                        <td style={{ padding: "12px 0", fontWeight: 600, color: "#0f172a" }}>
                          {b.customerName || b.patientName || b.customer?.firstName || "Walk-in"}
                        </td>
                        <td style={{ padding: "12px 0", color: "#64748b" }}>
                          {serviceMap.get(b.serviceUid ?? "") || "Service"}
                        </td>
                        <td style={{ padding: "12px 0", color: "#64748b" }}>
                          {userMap.get(b.userUid ?? "") || "Any Provider"}
                        </td>
                        <td style={{ padding: "12px 0" }}>
                          <Badge variant={b.status?.toUpperCase() === "CONFIRMED" ? "success" : "warning"}>
                            {b.status || "PENDING"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 13 }}>
                  No upcoming appointments found.
                </div>
              )}
            </div>
          </div>

          {/* PEAK HOURS CHART */}
          <div style={card}>
            <h3 style={cardTitle}>Peak Hours</h3>
            <p style={cardSub}>Booking frequency by time of day</p>
            <div style={{ marginTop: 20, display: "flex", alignItems: "flex-end", height: 160, gap: 8 }}>
              {peakHours.length > 0 ? (
                peakHours.map(h => (
                  <div key={h.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1" }}>{h.count}</div>
                    <div style={{ 
                      width: "100%", 
                      background: "#c7d2fe", 
                      height: `${h.pct}%`, 
                      minHeight: 4,
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.3s ease"
                    }} />
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{h.label}</div>
                  </div>
                ))
              ) : (
                <div style={{ width: "100%", textAlign: "center", alignSelf: "center", color: "#94a3b8", fontSize: 13 }}>
                  No time data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE WIDGETS ROW 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* TOP SERVICES */}
          <div style={card}>
            <h3 style={cardTitle}>Top Services</h3>
            <p style={cardSub}>Most popular service offerings.</p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {topServices.length > 0 ? topServices.map((srv) => (
                <div key={srv.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{srv.name}</span>
                    <span>{srv.count}</span>
                  </div>
                  <div style={{ width: "100%", background: "#f1f5f9", height: 8, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct(srv.count, topServices[0].count)}%`, background: "#3b82f6", height: "100%", borderRadius: 10 }} />
                  </div>
                </div>
              )) : (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>No services booked.</div>
              )}
            </div>
          </div>

          {/* TOP PROVIDERS */}
          <div style={card}>
            <h3 style={cardTitle}>Provider Utilization</h3>
            <p style={cardSub}>Busiest staff members.</p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {topUsers.length > 0 ? topUsers.map((usr) => (
                <div key={usr.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{usr.name}</span>
                    <span>{usr.count}</span>
                  </div>
                  <div style={{ width: "100%", background: "#f1f5f9", height: 8, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct(usr.count, topUsers[0].count)}%`, background: "#8b5cf6", height: "100%", borderRadius: 10 }} />
                  </div>
                </div>
              )) : (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>No providers booked.</div>
              )}
            </div>
          </div>

          {/* CALENDAR TRAFFIC */}
          <div style={card}>
            <h3 style={cardTitle}>Calendar Traffic</h3>
            <p style={cardSub}>Distribution across schedules.</p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {topCalendars.length > 0 ? topCalendars.map((cal) => (
                <div key={cal.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{cal.name}</span>
                    <span>{cal.count}</span>
                  </div>
                  <div style={{ width: "100%", background: "#f1f5f9", height: 8, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct(cal.count, topCalendars[0].count)}%`, background: "#10b981", height: "100%", borderRadius: 10 }} />
                  </div>
                </div>
              )) : (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>No calendars booked.</div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW (ORIGINAL CHANNELS/REVENUE) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
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
            <p style={cardSub}>Recorded value from non-cancelled bookings.</p>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#0f172a", marginTop: 16, fontFamily: "'Outfit',sans-serif" }}>₹{revenue.toLocaleString("en-IN")}</div>
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

      </div>
    </section>
  );
}
