import type { CSSProperties } from "react";
import { CheckCircle2, XCircle, Timer } from "lucide-react";
import type { AttendanceRecord } from "../../services/useAttendanceData";

export type SubTab = "logs" | "pending" | "overtime" | "field" | "compoff" | "onduty" | "kiosk";

export const ATTENDANCE_ROUTES: Array<{ key: SubTab; route: string; label: string }> = [
  { key: "logs", route: "logs", label: "Logs History" },
  { key: "pending", route: "pending-verifications", label: "Pending Verifications" },
  { key: "overtime", route: "pending-overtime", label: "Pending Overtime" },
  { key: "field", route: "field-track", label: "Field Track" },
  { key: "compoff", route: "comp-off", label: "Comp-Off" },
  { key: "onduty", route: "on-duty", label: "On-Duty" },
  { key: "kiosk", route: "face-kiosk", label: "Face Kiosk Mode" },
];

export const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 24, boxShadow: "var(--shadow-sm)" };
export const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)" };
export const th: CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)" };
export const tdc: CSSProperties = { padding: "14px 16px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
export const sel: CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: "0 12px", fontSize: 14, fontWeight: 600, color: "var(--dark-text)" };

export function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function TimeCell({ iso }: { iso?: string }) {
  if (!iso) return <span style={{ color: "var(--light-text)" }}>—</span>;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return <span style={{ color: "var(--light-text)" }}>—</span>;
  const formatted = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const [timeStr, ampm] = formatted.split(" ");
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.15 }}>
      <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--dark-text)" }}>{timeStr}</span>
      {ampm && <span style={{ fontSize: 9.5, opacity: 0.75, fontWeight: 700, textTransform: "uppercase", color: "var(--light-text)" }}>{ampm}</span>}
    </div>
  );
}

export function minutesToHours(minutes?: number) {
  if (!minutes || minutes <= 0) return "0 mins";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min${m === 1 ? "" : "s"}`;
  if (m === 0) return `${h} ${h > 1 ? "hrs" : "hr"}`;
  return `${h} hr ${m} min${m === 1 ? "" : "s"}`;
}

export function statusBadge(status?: string): CSSProperties {
  const key = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "present") return { background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" };
  if (key === "absent") return { background: "rgba(244,63,94,0.08)", color: "#e11d48", border: "1px solid rgba(244,63,94,0.2)" };
  if (key === "half_day") return { background: "rgba(245,158,11,0.1)", color: "#b45309", border: "1px solid rgba(245,158,11,0.25)" };
  if (key === "leave") return { background: "rgba(59,130,246,0.08)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.2)" };
  if (key === "holiday") return { background: "rgba(139,92,246,0.09)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.22)" };
  if (key === "rest_day") return { background: "rgba(100,116,139,0.1)", color: "#64748b", border: "1px solid rgba(100,116,139,0.22)" };
  return { background: "rgba(100,116,139,0.08)", color: "var(--light-text)", border: "1px solid var(--border-color)" };
}

export function formatDuration(workedMinutes?: number, workedHours?: number, workedHoursFormatted?: string): string {
  if (workedHoursFormatted && workedHoursFormatted.trim()) {
    return workedHoursFormatted;
  }
  if (workedMinutes !== undefined && workedMinutes !== null) {
    const hrs = Math.floor(workedMinutes / 60);
    const mins = workedMinutes % 60;
    const decimalStr = workedHours !== undefined && workedHours !== null ? ` (${workedHours.toFixed(2)}h)` : "";
    if (hrs === 0) return `${mins} mins${decimalStr}`;
    if (mins === 0) return `${hrs} ${hrs > 1 ? "hours" : "hour"}${decimalStr}`;
    return `${hrs} hr ${mins} mins${decimalStr}`;
  }
  if (workedHours !== undefined && workedHours !== null) {
    const totalMins = Math.round(workedHours * 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const decimalStr = ` (${workedHours.toFixed(2)}h)`;
    if (hrs === 0) return `${mins} mins${decimalStr}`;
    if (mins === 0) return `${hrs} ${hrs > 1 ? "hours" : "hour"}${decimalStr}`;
    return `${hrs} hr ${mins} mins${decimalStr}`;
  }
  return "—";
}

export function StatusBadge({ status, halfDayType, clockIn }: { status?: string; halfDayType?: string; clockIn?: string }) {
  const key = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  const isHalfDay = key === "half_day";
  const sessionText = halfDayType === "FIRST_HALF" ? "Morning Leave" : halfDayType === "SECOND_HALF" ? "Afternoon Leave" : undefined;
  const tooltipText = isHalfDay
    ? `Leave Session: ${sessionText || "Half-Day"} (Approved) • Work Session: ${clockIn ? `Clocked in at ${clockIn}` : "Active"}`
    : undefined;

  return (
    <span
      title={tooltipText}
      style={{
        ...statusBadge(status),
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 9px",
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        flexShrink: 0,
        cursor: tooltipText ? "help" : "default",
      }}
    >
      {status || "Pending"}
      {isHalfDay && sessionText && <span style={{ opacity: 0.85, fontWeight: 700 }}>({sessionText})</span>}
    </span>
  );
}

export function OvertimePill({ minutes, status, approved }: { minutes?: number; status?: string; approved?: number }) {
  if (!minutes || minutes <= 0) return null;
  const normalized = (status || "Pending").toLowerCase();
  const Icon = normalized === "approved" ? CheckCircle2 : normalized === "rejected" ? XCircle : Timer;
  const color = normalized === "approved" ? "#059669" : normalized === "rejected" ? "#e11d48" : "#b45309";
  const labelText = normalized === "approved"
    ? `OT ${minutesToHours(minutes)} / ${minutesToHours(approved ?? minutes)} approved`
    : `OT ${minutesToHours(minutes)} ${status || "Pending"}`;

  return (
    <span
      title={labelText}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 8,
        background: `${color}12`,
        color,
        border: `1px solid ${color}30`,
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1.35,
        maxWidth: "100%",
        boxSizing: "border-box",
        wordBreak: "break-word",
        whiteSpace: "normal",
      }}
    >
      <Icon size={12} style={{ flexShrink: 0 }} />
      <span>{labelText}</span>
    </span>
  );
}

export function isSystemFlagged(status?: string, generated?: boolean, source?: string, generatedBy?: string) {
  const key = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  return !!generated || /system|cron|auto/i.test(source || "") || /system|cron|auto/i.test(generatedBy || "") || key === "absent" || key === "holiday";
}

export function hasNoShiftFlag(record: AttendanceRecord) {
  const flags = [...(record.validationFlags ?? []), ...(record.attendanceFlags ?? [])];
  return record.noShiftAssigned === true
    || record.shiftResolutionSource?.toUpperCase() === "NONE"
    || flags.some((flag) => /NO[_\s-]?SHIFT/i.test(flag));
}

export function effectiveShiftLabel(record: AttendanceRecord) {
  if (hasNoShiftFlag(record)) return "No shift assigned";
  return record.effectiveShiftName || record.shiftName || "—";
}
