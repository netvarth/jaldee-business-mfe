import React from "react";
import { Loader2, MapPin } from "lucide-react";
import { formatDate } from "../../lib/utils";
import type { AttendanceRecord, LocationLogRecord, CompOffRecord, OnDutyRecord } from "../../services/useAttendanceData";
import {
  th, tdc, lbl, sel, card, fmtTime, StatusBadge, OvertimePill,
  type SubTab,
} from "./AttendanceHelpers";

interface SubTabsProps {
  subtab: SubTab;
  viewMode: "table" | "cards";
  pendingVerifs: AttendanceRecord[];
  pendingOvertime: AttendanceRecord[];
  overtimeDrafts: Record<string, number>;
  setOvertimeDrafts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  approverFor: (empUid?: string) => { uid: string; name: string } | undefined;
  empName: (uid?: string) => string;
  actOvertime: (id: string, mins: number) => Promise<void>;
  attendance: {
    verify: (id: string, status: "Approved" | "Rejected", approverUid?: string) => Promise<void>;
  };
  actorEmp?: { name?: string };
  geoMsg: string | null;
  autoTrack: boolean;
  setAutoTrack: (val: boolean) => void;
  geoBusy: boolean;
  captureLocation: () => void;
  locationLogs: { data: LocationLogRecord[] };
  compoffs: { data: CompOffRecord[] };
  onduty: {
    data: OnDutyRecord[];
    update: (id: string, patch: Partial<OnDutyRecord>) => Promise<void>;
  };
}

export function AttendanceSubTabs(props: SubTabsProps) {
  const {
    subtab, viewMode, pendingVerifs, pendingOvertime, overtimeDrafts, setOvertimeDrafts,
    approverFor, empName, actOvertime, attendance, actorEmp, geoMsg, autoTrack,
    setAutoTrack, geoBusy, captureLocation, locationLogs, compoffs, onduty,
  } = props;

  if (subtab === "pending") {
    return viewMode === "table" ? (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Mode</th><th style={th}>Clock In</th><th style={th}>Designated Approver</th><th style={{ ...th, textAlign: "right" }}>Verification</th></tr></thead>
        <tbody>{pendingVerifs.length === 0 ? <tr><td colSpan={6} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No pending WFH or on-field attendance approvals.</td></tr> : pendingVerifs.map((a) => {
          const approver = approverFor(a.employeeUid);
          return (
            <tr key={a.id}>
              <td style={{ ...tdc, fontWeight: 600 }}>{empName(a.employeeUid)}</td>
              <td style={tdc}>{formatDate(a.dateStr)}</td>
              <td style={tdc}><span style={{ ...lbl, color: "var(--primary-color)" }}>{a.clockInType || "—"}</span></td>
              <td style={tdc}>{fmtTime(a.clockIn)}</td>
              <td style={tdc}>{approver ? <span style={{ fontWeight: 600 }}>{approver.name}</span> : <span style={{ ...lbl }}>HR / Admin</span>}</td>
              <td style={{ ...tdc, textAlign: "right" }}>
                <button id={`hr-attendance-approve-${a.id}`} data-testid={`hr-attendance-approve-${a.id}`} onClick={() => void attendance.verify(a.id, "Approved", approver?.uid)} className="btn-grid-action" style={{ marginRight: 8 }}>Approve</button>
                <button id={`hr-attendance-reject-${a.id}`} data-testid={`hr-attendance-reject-${a.id}`} onClick={() => void attendance.verify(a.id, "Rejected", approver?.uid)} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "#e11d48", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Reject</button>
              </td>
            </tr>
          );})}</tbody>
      </table>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
        {pendingVerifs.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No pending WFH or on-field attendance approvals.</div>
        ) : (
          pendingVerifs.map((a) => {
            const approver = approverFor(a.employeeUid);
            return (
              <div key={a.id} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 14 }}>{empName(a.employeeUid)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                  <div>
                    <div style={lbl}>Date</div>
                    <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{formatDate(a.dateStr)}</div>
                  </div>
                  <div>
                    <div style={lbl}>Mode</div>
                    <div style={{ fontWeight: 600, color: "var(--primary-color)", marginTop: 2 }}>{a.clockInType || "—"}</div>
                  </div>
                  <div>
                    <div style={lbl}>Clock In</div>
                    <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{fmtTime(a.clockIn)}</div>
                  </div>
                  <div>
                    <div style={lbl}>Approver</div>
                    <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{approver ? approver.name : "HR / Admin"}</div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", gap: 8, marginTop: 4 }}>
                  <button id={`hr-attendance-card-approve-${a.id}`} data-testid={`hr-attendance-card-approve-${a.id}`} onClick={() => void attendance.verify(a.id, "Approved", approver?.uid)} className="btn-grid-action" style={{ flex: 1 }}>Approve</button>
                  <button id={`hr-attendance-card-reject-${a.id}`} data-testid={`hr-attendance-card-reject-${a.id}`} onClick={() => void attendance.verify(a.id, "Rejected", approver?.uid)} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "#e11d48", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Reject</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  if (subtab === "overtime") {
    return viewMode === "table" ? (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Shift Time</th><th style={th}>Worked</th><th style={th}>Requested OT</th><th style={th}>Approved Minutes</th><th style={{ ...th, textAlign: "right" }}>Action</th></tr></thead>
        <tbody>{pendingOvertime.length === 0 ? <tr><td colSpan={7} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No pending overtime requests.</td></tr> : pendingOvertime.map((a) => {
          const approved = overtimeDrafts[a.id] ?? a.overtimeMinutes ?? 0;
          const shiftTime = a.shiftStartTime || a.shiftEndTime ? `${fmtTime(a.shiftStartTime)} - ${fmtTime(a.shiftEndTime)}` : "—";
          return (
            <tr key={a.id}>
              <td style={{ ...tdc, fontWeight: 600 }}>{empName(a.employeeUid)}</td>
              <td style={tdc}>{formatDate(a.dateStr)}</td>
              <td style={tdc}>{shiftTime}</td>
              <td style={tdc}>{a.workedHours != null ? `${a.workedHours.toFixed(2)}h` : "—"}</td>
              <td style={tdc}><OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} /></td>
              <td style={tdc}>
                <input
                  id={`hr-attendance-overtime-minutes-${a.id}`}
                  data-testid={`hr-attendance-overtime-minutes-${a.id}`}
                  type="number"
                  min={0}
                  value={approved}
                  onChange={(event) => setOvertimeDrafts((drafts) => ({ ...drafts, [a.id]: Math.max(0, Number(event.target.value) || 0) }))}
                  style={{ ...sel, width: 120, height: 36 }}
                />
              </td>
              <td style={{ ...tdc, textAlign: "right" }}>
                <button id={`hr-attendance-overtime-approve-${a.id}`} data-testid={`hr-attendance-overtime-approve-${a.id}`} onClick={() => void actOvertime(a.id, approved)} className="btn-grid-action" style={{ marginRight: 8 }}>Approve</button>
                <button id={`hr-attendance-overtime-reject-${a.id}`} data-testid={`hr-attendance-overtime-reject-${a.id}`} onClick={() => void actOvertime(a.id, 0)} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "#e11d48", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Reject</button>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
        {pendingOvertime.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No pending overtime requests.</div>
        ) : (
          pendingOvertime.map((a) => {
            const approved = overtimeDrafts[a.id] ?? a.overtimeMinutes ?? 0;
            const shiftTime = a.shiftStartTime || a.shiftEndTime ? `${fmtTime(a.shiftStartTime)} - ${fmtTime(a.shiftEndTime)}` : "—";
            return (
              <div key={a.id} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 14 }}>{empName(a.employeeUid)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                  <div>
                    <div style={lbl}>Date</div>
                    <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{formatDate(a.dateStr)}</div>
                  </div>
                  <div>
                    <div style={lbl}>Shift Time</div>
                    <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{shiftTime}</div>
                  </div>
                  <div>
                    <div style={lbl}>Worked Hours</div>
                    <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{a.workedHours != null ? `${a.workedHours.toFixed(2)}h` : "—"}</div>
                  </div>
                  <div>
                    <div style={lbl}>Requested OT</div>
                    <div style={{ marginTop: 2 }}><OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} /></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <span style={lbl}>Approved Minutes</span>
                  <input
                    id={`hr-attendance-card-overtime-minutes-${a.id}`}
                    data-testid={`hr-attendance-card-overtime-minutes-${a.id}`}
                    type="number"
                    min={0}
                    value={approved}
                    onChange={(event) => setOvertimeDrafts((drafts) => ({ ...drafts, [a.id]: Math.max(0, Number(event.target.value) || 0) }))}
                    style={{ ...sel, width: "100%", height: 38 }}
                  />
                </div>
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", gap: 8 }}>
                  <button id={`hr-attendance-card-overtime-approve-${a.id}`} data-testid={`hr-attendance-card-overtime-approve-${a.id}`} onClick={() => void actOvertime(a.id, approved)} className="btn-grid-action" style={{ flex: 1 }}>Approve</button>
                  <button id={`hr-attendance-card-overtime-reject-${a.id}`} data-testid={`hr-attendance-card-overtime-reject-${a.id}`} onClick={() => void actOvertime(a.id, 0)} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "#e11d48", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Reject</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  if (subtab === "field") {
    return (
      <>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid var(--border-color)", background: "rgba(100,116,139,0.03)" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--dark-text)" }}>Live Field Tracking</div>
            <div style={{ fontSize: 11, color: "var(--light-text)" }}>Capture GPS for {actorEmp?.name || "the selected employee"} using this device.</div>
            {geoMsg && <div data-testid="hr-attendance-location-message" style={{ fontSize: 11, marginTop: 4, color: /denied|Failed|Could not|not supported|first/.test(geoMsg) ? "#e11d48" : "#059669" }}>{geoMsg}</div>}
          </div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--light-text)" }}>
            <input id="hr-attendance-auto-track" data-testid="hr-attendance-auto-track" type="checkbox" checked={autoTrack} onChange={(e) => setAutoTrack(e.target.checked)} /> Auto every 30s
          </label>
          <button id="hr-attendance-capture-location" data-testid="hr-attendance-capture-location" onClick={captureLocation} disabled={geoBusy} style={{ height: 38, padding: "0 18px", borderRadius: 10, border: "none", background: "var(--primary-color)", color: "white", fontWeight: 800, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {geoBusy ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />} Capture Location
          </button>
        </div>
        {viewMode === "table" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>User</th><th style={th}>Timestamp</th><th style={th}>Coordinates</th><th style={th}>Accuracy</th></tr></thead>
            <tbody>{locationLogs.data.length === 0 ? <tr><td colSpan={4} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No field tracking data available.</td></tr> : locationLogs.data.map((l) => (
              <tr key={l.id}><td style={{ ...tdc, fontWeight: 600 }}>{l.userId || "—"}</td><td style={tdc}>{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</td><td style={{ ...tdc, fontFamily: "monospace", fontSize: 12 }}>{l.latitude != null && l.longitude != null ? `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}` : "—"}</td><td style={tdc}>{l.accuracy != null ? `${l.accuracy.toFixed(0)} m` : "—"}</td></tr>
            ))}</tbody>
          </table>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
            {locationLogs.data.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No field tracking data available.</div>
            ) : (
              locationLogs.data.map((l) => (
                <div key={l.id} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 14 }}>{l.userId || "—"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                    <div>
                      <div style={lbl}>Timestamp</div>
                      <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</div>
                    </div>
                    <div>
                      <div style={lbl}>Accuracy</div>
                      <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{l.accuracy != null ? `${l.accuracy.toFixed(0)} m` : "—"}</div>
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <div style={lbl}>Coordinates</div>
                      <div style={{ fontWeight: 600, color: "var(--dark-text)", fontFamily: "monospace", fontSize: 12, marginTop: 2 }}>{l.latitude != null && l.longitude != null ? `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}` : "—"}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </>
    );
  }

  if (subtab === "compoff") {
    return viewMode === "table" ? (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>Employee</th><th style={th}>Credited Days</th><th style={th}>Expiry</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
        <tbody>{compoffs.data.length === 0 ? <tr><td colSpan={4} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No comp-off credits.</td></tr> : compoffs.data.map((c) => (
          <tr key={c.id}><td style={{ ...tdc, fontWeight: 600 }}>{empName(c.employeeUid)}</td><td style={tdc}>{c.creditedDays ?? "—"}</td><td style={tdc}>{formatDate(c.expiryDate)}</td><td style={{ ...tdc, textAlign: "right" }}><span style={lbl}>{c.status || "—"}</span></td></tr>
        ))}</tbody>
      </table>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
        {compoffs.data.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No comp-off credits.</div>
        ) : (
          compoffs.data.map((c) => (
            <div key={c.id} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 14 }}>{empName(c.employeeUid)}</span>
                <span style={{ ...lbl, color: "var(--primary-color)" }}>{c.status || "—"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div>
                  <div style={lbl}>Credited Days</div>
                  <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{c.creditedDays ?? "—"}</div>
                </div>
                <div>
                  <div style={lbl}>Expiry</div>
                  <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{formatDate(c.expiryDate)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (subtab === "onduty") {
    return viewMode === "table" ? (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Client Site</th><th style={th}>Reason</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
        <tbody>{onduty.data.length === 0 ? <tr><td colSpan={5} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No on-duty requests.</td></tr> : onduty.data.map((o) => (
          <tr key={o.id}><td style={{ ...tdc, fontWeight: 600 }}>{empName(o.employeeUid)}</td><td style={tdc}>{formatDate(o.date)}</td><td style={tdc}>{o.clientSite || "—"}</td><td style={{ ...tdc, color: "var(--light-text)" }}>{o.reason || "—"}</td><td style={{ ...tdc, textAlign: "right" }}>
            {(o.status || "").toLowerCase() === "pending" ? <button id={`hr-attendance-onduty-approve-${o.id}`} data-testid={`hr-attendance-onduty-approve-${o.id}`} onClick={() => void onduty.update(o.id, { status: "Approved" })} className="btn-grid-action">Approve</button> : <span style={lbl}>{o.status || "—"}</span>}
          </td></tr>
        ))}</tbody>
      </table>
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
        {onduty.data.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No on-duty requests.</div>
        ) : (
          onduty.data.map((o) => (
            <div key={o.id} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 14 }}>{empName(o.employeeUid)}</span>
                <span style={{ ...lbl, color: o.status === "Approved" ? "#10b981" : "var(--light-text)" }}>{o.status || "—"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                <div>
                  <div style={lbl}>Date</div>
                  <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{formatDate(o.date)}</div>
                </div>
                <div>
                  <div style={lbl}>Client Site</div>
                  <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{o.clientSite || "—"}</div>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <div style={lbl}>Reason</div>
                  <div style={{ color: "var(--light-text)", marginTop: 2 }}>{o.reason || "—"}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return null;
}
