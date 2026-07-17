import { useEffect, useMemo, useState, lazy, Suspense, type CSSProperties } from "react";
import { CheckCircle2, Clock, History, LayoutGrid, Loader2, MapPin, MoreVertical, Rows3, ScanFace, Timer, XCircle } from "lucide-react";
import { PageHeader, Popover, Select, SkeletonTable } from "@jaldee/design-system";
import { useLocation, useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));
import { useEmployees } from "../../services/useEmployees";
import { useBranches } from "../../services/useBranches";
import { useAttendance, useOnDuty, useCompOffs, useLocationLogs } from "../../services/useAttendanceData";
import { useAttendanceRules } from "../../services/useSettingsData";
import { formatDate } from "../../lib/utils";
import { CLOCK_TYPE_OPTIONS, ClockType } from "../../types";

type SubTab = "logs" | "pending" | "overtime" | "field" | "compoff" | "onduty" | "kiosk";

const ATTENDANCE_ROUTES: Array<{ key: SubTab; route: string; label: string }> = [
  { key: "logs", route: "logs", label: "Logs History" },
  { key: "pending", route: "pending-verifications", label: "Pending Verifications" },
  { key: "overtime", route: "pending-overtime", label: "Pending Overtime" },
  { key: "field", route: "field-track", label: "Field Track" },
  { key: "compoff", route: "comp-off", label: "Comp-Off" },
  { key: "onduty", route: "on-duty", label: "On-Duty" },
  { key: "kiosk", route: "face-kiosk", label: "Face Kiosk Mode" },
];

const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 24, boxShadow: "var(--shadow-sm)" };
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--light-text)" };
const th: CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)" };
const tdc: CSSProperties = { padding: "14px 16px", fontSize: 13, color: "var(--dark-text)", borderTop: "1px solid var(--border-color)" };
const sel: CSSProperties = { width: "100%", height: 44, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", padding: "0 12px", fontSize: 14, fontWeight: 600, color: "var(--dark-text)" };

function fmtTime(iso?: string) { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function minutesToHours(minutes?: number) {
  if (!minutes || minutes <= 0) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}
function statusBadge(status?: string): CSSProperties {
  const key = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "present") return { background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" };
  if (key === "absent") return { background: "rgba(244,63,94,0.08)", color: "#e11d48", border: "1px solid rgba(244,63,94,0.2)" };
  if (key === "half_day") return { background: "rgba(245,158,11,0.1)", color: "#b45309", border: "1px solid rgba(245,158,11,0.25)" };
  if (key === "leave") return { background: "rgba(59,130,246,0.08)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.2)" };
  if (key === "holiday") return { background: "rgba(139,92,246,0.09)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.22)" };
  if (key === "rest_day") return { background: "rgba(100,116,139,0.1)", color: "#64748b", border: "1px solid rgba(100,116,139,0.22)" };
  return { background: "rgba(100,116,139,0.08)", color: "var(--light-text)", border: "1px solid var(--border-color)" };
}
function StatusBadge({ status }: { status?: string }) {
  return <span style={{ ...statusBadge(status), display: "inline-flex", alignItems: "center", padding: "4px 9px", borderRadius: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{status || "—"}</span>;
}
function OvertimePill({ minutes, status, approved }: { minutes?: number; status?: string; approved?: number }) {
  if (!minutes || minutes <= 0) return null;
  const normalized = (status || "Pending").toLowerCase();
  const Icon = normalized === "approved" ? CheckCircle2 : normalized === "rejected" ? XCircle : Timer;
  const color = normalized === "approved" ? "#059669" : normalized === "rejected" ? "#e11d48" : "#b45309";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: `${color}12`, color, border: `1px solid ${color}30`, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
      <Icon size={12} /> OT {minutesToHours(minutes)}
      {normalized === "approved" ? ` / ${minutesToHours(approved ?? minutes)} approved` : ` ${status || "Pending"}`}
    </span>
  );
}
function isSystemFlagged(status?: string, generated?: boolean, source?: string, generatedBy?: string) {
  const key = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  return !!generated || /system|cron|auto/i.test(source || "") || /system|cron|auto/i.test(generatedBy || "") || key === "absent" || key === "holiday";
}
function subtabFromPath(pathname: string): SubTab {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  const match = ATTENDANCE_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "logs";
}
function StatCard({ k, t, v, dot, dotColor }: { k: string; t: string; v: string; dot: string; dotColor: string }) {
  return (
    <div style={{ ...card, borderRadius: 16, padding: "18px 20px", flex: 1, minWidth: 180 }}>
      <div style={lbl}>{k}</div>
      <div style={{ ...lbl, fontSize: 11, marginTop: 2 }}>{t}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dark-text)", margin: "6px 0 10px", letterSpacing: "-0.5px" }}>{v}</div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 8, background: "rgba(100,116,139,0.08)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor }} />{dot}</div>
    </div>
  );
}

type ViewMode = "table" | "cards";

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

function resolveCurrentPosition() {
  return new Promise<{ latitude: number; longitude: number; accuracy: number | null }>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location access is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission is required to clock in."));
          return;
        }
        reject(new Error("Unable to fetch the current location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

function AttendanceViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 3, border: "1px solid var(--border-color)", borderRadius: 8, background: "var(--surface-bg)" }}>
      <button
        type="button"
        id="hr-attendance-view-table"
        data-testid="hr-attendance-view-table"
        onClick={() => onChange("table")}
        style={{
          display: "inline-flex",
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: value === "table" ? "var(--primary-color)" : "transparent",
          color: value === "table" ? "white" : "var(--light-text)",
          transition: "background-color 0.15s, color 0.15s"
        }}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={15} />
      </button>
      <button
        type="button"
        id="hr-attendance-view-cards"
        data-testid="hr-attendance-view-cards"
        onClick={() => onChange("cards")}
        style={{
          display: "inline-flex",
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          background: value === "cards" ? "var(--primary-color)" : "transparent",
          color: value === "cards" ? "white" : "var(--light-text)",
          transition: "background-color 0.15s, color 0.15s"
        }}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}

export default function Attendance() {
  const { location: activeLocation } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: employees, loading: empLoading, error: empError } = useEmployees();
  const branches = useBranches();
  const attendance = useAttendance();
  const attendanceRules = useAttendanceRules();
  const onduty = useOnDuty();
  const compoffs = useCompOffs();
  const locationLogs = useLocationLogs();
  const isLoading = empLoading || attendance.loading || onduty.loading || compoffs.loading || locationLogs.loading;

  const [viewMode, setViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [actor, setActor] = useState("");
  const [selectedLocationUid, setSelectedLocationUid] = useState(activeLocation?.id ?? "");
  const [mode, setMode] = useState<ClockType>(ClockType.Office);
  const [face, setFace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const subtab = subtabFromPath(location.pathname);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [autoTrack, setAutoTrack] = useState(false);
  const [overtimeDrafts, setOvertimeDrafts] = useState<Record<string, number>>({});
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => setViewMode(media.matches ? "cards" : "table");
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  useEffect(() => { if (!actor && employees.length) setActor(employees[0].id); }, [employees, actor]);
  useEffect(() => {
    if (selectedLocationUid) return;
    if (activeLocation?.id) {
      setSelectedLocationUid(activeLocation.id);
      return;
    }
    if (branches.data.length) {
      setSelectedLocationUid(branches.data[0].id);
    }
  }, [activeLocation?.id, branches.data, selectedLocationUid]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const empName = useMemo(() => { const m = new Map(employees.map((e) => [e.id, e.name] as const)); return (uid?: string) => (uid ? m.get(uid) ?? uid : "—"); }, [employees]);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);
  // The approver of a WFH/field punch is the employee's reporting manager (HR/Admin otherwise).
  const approverFor = (employeeUid?: string) => { const m = employeeUid ? empById.get(employeeUid)?.reportingManagerUid : undefined; return m ? { uid: m, name: empName(m) } : null; };
  const today = new Date().toISOString().slice(0, 10);
  const open = useMemo(() => attendance.data.find((a) => a.employeeUid === actor && a.dateStr === today && a.clockIn && !a.clockOut), [attendance.data, actor, today]);
  const clockedIn = !!open;
  const weekHours = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 7);
    return attendance.data.filter((a) => a.employeeUid === actor && a.dateStr && new Date(a.dateStr) >= since).reduce((t, a) => t + (a.workedHours ?? 0), 0);
  }, [attendance.data, actor, today]);
  const todayLogs = useMemo(() => attendance.data.filter((a) => a.employeeUid === actor && a.dateStr === today), [attendance.data, actor, today]);
  const faceRequired = !!attendanceRules.data?.faceRecognitionRequired;
  const pendingOvertime = useMemo(() => attendance.data.filter((a) => (a.overtimeStatus || "").toLowerCase() === "pending" && (a.overtimeMinutes ?? 0) > 0), [attendance.data]);
  const shouldShowLocationSelect = branches.data.length > 1;

  const actorEmp = useMemo(() => employees.find((e) => e.id === actor), [employees, actor]);

  const doPunch = async (secured: boolean, selfieDataUrl?: string) => {
    setBusy(true); setMsg(null);
    try {
      if (clockedIn && open) {
        await attendance.punchOut(open.id);
        setMsg("Clocked out.");
      } else {
        const currentPosition = await resolveCurrentPosition();
          await attendance.punchIn({
            employeeUid: actor,
            locationUid: selectedLocationUid || activeLocation?.id || null,
            location: {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              accuracy: currentPosition.accuracy,
            },
            clockInType: mode,
            securedCheck: secured,
            selfieDataUrl: selfieDataUrl || null,
          });
        setMsg(secured ? "Face verified — clocked in." : "Clocked in.");
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : "Punch failed.";
      setMsg(/ALREADY_PUNCHED_IN|409/.test(m) ? "This employee already has an attendance record for today." : m);
    } finally { setBusy(false); }
  };

  const handlePunch = () => {
    if (!actor) {
      if (empLoading) { setMsg("Still loading employees — one moment…"); return; }
      if (empError) { setMsg(`Couldn't load employees: ${empError}`); return; }
      if (!employees.length) { setMsg("No employees found. Add an employee (or check the backend connection) before clocking in."); return; }
      setMsg("Select an employee first."); return;
    }
    if (!clockedIn && (faceRequired || face)) {
      if (!actorEmp?.faceDescriptor) { setMsg("No enrolled face for this employee — enroll Face ID on their profile first."); return; }
      setFaceOpen(true); return;
    }
    void doPunch(false);
  };

  const verifyAndPunch = async (descriptor: number[], selfieDataUrl?: string) => {
    const stored = actorEmp?.faceDescriptor;
    if (!stored) { setFaceOpen(false); setMsg("No enrolled face for this employee."); return; }
    try {
      const parsed = JSON.parse(stored) as number[];
      const { faceDistance, FACE_MATCH_THRESHOLD } = await import("../../lib/face");
      const dist = faceDistance(descriptor, parsed);
      setFaceOpen(false);
      if (dist <= FACE_MATCH_THRESHOLD) await doPunch(true, selfieDataUrl);
      else setMsg(`Face not recognized (distance ${dist.toFixed(2)}). Try again.`);
    } catch {
      setFaceOpen(false); setMsg("Stored face data is invalid — re-enroll the employee.");
    }
  };

  const pendingVerifs = useMemo(() => attendance.data.filter((a) => (a.wfhStatus || "").toLowerCase() === "pending"), [attendance.data]);

  const actOvertime = async (uid: string, approvedMinutes: number) => {
    setMsg(null);
    try {
      await attendance.approveOvertime(uid, approvedMinutes);
      setOvertimeDrafts((drafts) => {
        const next = { ...drafts };
        delete next[uid];
        return next;
      });
      setMsg(approvedMinutes > 0 ? "Overtime approved." : "Overtime rejected.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Overtime action failed.");
    }
  };

  const captureLocation = () => {
    if (!actor) { setGeoMsg("Select an acting employee first."); return; }
    if (!navigator.geolocation) { setGeoMsg("Geolocation is not supported by this browser."); return; }
    setGeoBusy(true); setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await locationLogs.create({
            userId: actorEmp?.employeeId || actor,
            latitude: pos.coords.latitude, longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy, timestamp: new Date().toISOString(),
            activity: autoTrack ? "Auto track" : "Manual capture",
          });
          setGeoMsg(`Location logged (±${Math.round(pos.coords.accuracy)}m).`);
        } catch (e) { setGeoMsg(e instanceof Error ? e.message : "Failed to log location."); }
        finally { setGeoBusy(false); }
      },
      (err) => { setGeoBusy(false); setGeoMsg(err.code === err.PERMISSION_DENIED ? "Location permission denied — allow it and retry." : "Could not get your location."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!autoTrack) return;
    const t = setInterval(captureLocation, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrack, actor]);

  const clockText = clockedIn ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";

  return (
    <section id="hr-attendance-page" data-testid="hr-attendance-page" className="page-section active hr-page-shell">
      {faceOpen && (
        <Suspense fallback={null}>
          <FaceCaptureModal title="Verify Face to Clock In" subtitle={actorEmp?.name} busy={busy} onCapture={verifyAndPunch} onClose={() => setFaceOpen(false)} />
        </Suspense>
      )}
      <PageHeader title="Attendance" subtitle="Shift and activity tracking" />

      {/* console + stats + timeline grid layout */}
      <div className="attendance-console-grid" style={{ display: "grid", gridTemplateColumns: "45fr 25fr 30fr", gap: 24, marginBottom: 24, alignItems: "stretch" }}>
        
        {/* Column 2: Consolidated Stats Overview */}
        <div className="attendance-stats-summary-card" style={{ ...card, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dark-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>Summary Overview</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={lbl}>Hours Worked</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dark-text)", marginTop: 4 }}>{weekHours.toFixed(1)}h</div>
              <div style={{ fontSize: 9, color: "var(--light-text)", marginTop: 2, fontWeight: 800, letterSpacing: "0.04em" }}>THIS WEEK</div>
            </div>
            <div>
              <div style={lbl}>Current Mode</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary-color)", marginTop: 4 }}>{mode}</div>
              <div style={{ fontSize: 9, color: "var(--light-text)", marginTop: 2, fontWeight: 800, letterSpacing: "0.04em" }}>ACTIVE SESSION</div>
            </div>
            {pendingVerifs.length > 0 && (
              <div>
                <div style={{ ...lbl, color: "#b45309" }}>Pending WFH</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#b45309", marginTop: 4 }}>{pendingVerifs.length}</div>
                <div style={{ fontSize: 9, color: "var(--light-text)", marginTop: 2, fontWeight: 800, letterSpacing: "0.04em" }}>NEEDS APPROVAL</div>
              </div>
            )}
            {pendingOvertime.length > 0 && (
              <div>
                <div style={{ ...lbl, color: "#7c3aed" }}>Pending OT</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#7c3aed", marginTop: 4 }}>{pendingOvertime.length}</div>
                <div style={{ fontSize: 9, color: "var(--light-text)", marginTop: 2, fontWeight: 800, letterSpacing: "0.04em" }}>NEEDS VERIFICATION</div>
              </div>
            )}
          </div>
        </div>

        {/* Column 1: Streamlined Clock In/Out Widget */}
        <div className="attendance-console-card" style={{ ...card, padding: "28px 20px" }}>
          <div className="attendance-console-layout">
            
            {/* Clock Column (Right Side on desktop, but top on mobile) */}
            <div className="attendance-console-clock">
              {/* Clock Icon Dial */}
              <div className="attendance-console-clock__dial" style={{ width: 140, height: 140, borderRadius: "50%", border: "2px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--light-text)" }}>
                <Clock size={48} strokeWidth={1.2} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 16 }}>
                <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "1px", color: "var(--dark-text)", fontFamily: "monospace", lineHeight: 1 }}>
                  {clockText}
                </div>
                {/* Status pill directly below clock */}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: clockedIn ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
                  color: clockedIn ? "#10b981" : "#64748b",
                  border: clockedIn ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(148,163,184,0.2)",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap"
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: clockedIn ? "#10b981" : "#64748b" }} />
                  {clockedIn ? "ON DUTY" : "OFF DUTY"}
                </span>
              </div>
            </div>

            {/* Fields Column (Left Side on desktop, but bottom on mobile) */}
            <div className="attendance-console-fields" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Select
                id="hr-attendance-actor"
                testId="hr-attendance-actor"
                label="Acting Employee"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
              />
              <Select
                id="hr-attendance-mode"
                testId="hr-attendance-mode"
                label="Work Mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as ClockType)}
                options={CLOCK_TYPE_OPTIONS.map((value) => ({ value, label: value }))}
              />
              {shouldShowLocationSelect ? (
                <Select
                  id="hr-attendance-location"
                  testId="hr-attendance-location"
                  label="Location"
                  value={selectedLocationUid}
                  onChange={(e) => setSelectedLocationUid(e.target.value)}
                  placeholder={branches.loading ? "Loading locations" : "Select location"}
                  options={[
                    { value: "", label: branches.loading ? "Loading locations..." : "Select location" },
                    ...branches.data.map((branch) => ({
                      value: branch.id,
                      label: branch.code ? `${branch.name} (${branch.code})` : branch.name,
                    })),
                  ]}
                />
              ) : null}
              <div className="attendance-face-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--border-color)", borderRadius: 12, background: "rgba(100,116,139,0.03)" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dark-text)", letterSpacing: "0.04em" }}>FACE RECOGNITION SCAN</div>
                  <div style={{ fontSize: 10, color: "var(--light-text)", marginTop: 2 }}>{faceRequired ? "Required by attendance policy" : "Verify check-in with your camera feed"}</div>
                </div>
                <button id="hr-attendance-face-toggle" data-testid="hr-attendance-face-toggle" data-active={faceRequired || face ? "true" : "false"} disabled={faceRequired} onClick={() => setFace((v) => !v)} aria-label="toggle face" style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: faceRequired ? "not-allowed" : "pointer", background: faceRequired || face ? "var(--primary-color)" : "var(--border-color)", position: "relative", opacity: faceRequired ? 0.75 : 1 }}><span style={{ position: "absolute", top: 2, left: faceRequired || face ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .15s" }} /></button>
              </div>
              <button id="hr-attendance-punch-button" data-testid="hr-attendance-punch-button" onClick={handlePunch} disabled={busy} style={{ height: 52, borderRadius: 14, border: "none", cursor: busy ? "not-allowed" : "pointer", background: clockedIn ? "#e11d48" : "var(--primary-color)", color: "white", fontWeight: 800, fontSize: 15, letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy || !actor ? 0.6 : 1, transition: "background-color 0.2s, opacity 0.15s" }}>
                {busy ? <Loader2 size={18} className="animate-spin" /> : null} {clockedIn ? "CLOCK OUT" : "CLOCK IN"}
              </button>
              {(msg || empError) && <div style={{ fontSize: 12, textAlign: "center", color: empError && !msg ? "var(--danger-color)" : "var(--light-text)", marginTop: 4 }}>{msg || `Employees failed to load: ${empError}`}</div>}
            </div>

          </div>
        </div>

        {/* Column 3: Today's Timeline Card */}
        <div className="attendance-timeline-card" style={{ ...card, padding: 24 }}>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 15, fontWeight: 800, color: "var(--dark-text)" }}>Today's Timeline</div><div style={lbl}>{now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div></div>
          {todayLogs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 180, color: "var(--light-text)", gap: 10 }}><History size={36} strokeWidth={1.2} /><span style={{ ...lbl }}>No Records</span></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{todayLogs.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid var(--border-color)", borderRadius: 12, background: "rgba(100,116,139,0.02)" }}>
                <div><div style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 13 }}>{a.clockInType || "Office"}</div><div style={{ fontSize: 12, color: "var(--light-text)", marginTop: 2 }}>In {fmtTime(a.clockIn)} · Out {fmtTime(a.clockOut)}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} />
                  <StatusBadge status={a.status || "Present"} />
                </div>
              </div>
            ))}</div>
          )}
        </div>

      </div>

      {/* sub tabs */}
      <div className="attendance-tabs-mobile" style={{ alignItems: "center", gap: 12, padding: "6px 8px 6px 16px", marginBottom: 16 }}>
        <div 
          className="attendance-tabs-mobile__active" 
          onClick={() => setMobileTabsOpen(true)}
          style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
        >
          <span>{ATTENDANCE_ROUTES.find((item) => item.key === subtab)?.label || "Logs History"}</span>
        </div>
        
        {subtab !== "kiosk" && (
          <div>
            <AttendanceViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        )}

        <Popover
          portal
          open={mobileTabsOpen}
          onOpenChange={setMobileTabsOpen}
          placement="bottom"
          align="end"
          contentClassName="!w-56 !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 overflow-hidden !z-[9999]"
          trigger={
            <button
              type="button"
              className="attendance-tabs-mobile__trigger"
              onClick={() => setMobileTabsOpen((openState) => !openState)}
              aria-label="Open attendance tabs"
              style={{ margin: 0 }}
            >
              <MoreVertical size={18} />
            </button>
          }
        >
          <div className="attendance-tabs-mobile__menu">
            {ATTENDANCE_ROUTES.map(({ key, route, label }) => {
              const displayLabel = key === "pending" ? `${label} (${pendingVerifs.length})` : key === "overtime" ? `${label} (${pendingOvertime.length})` : label;
              return (
                <button
                  key={key}
                  type="button"
                  className="attendance-tabs-mobile__menu-item"
                  data-active={subtab === key}
                  onClick={() => {
                    navigate(`/attendance/${route}`);
                    setMobileTabsOpen(false);
                  }}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </Popover>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div className="attendance-tabs-desktop" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ATTENDANCE_ROUTES.map(({ key, route, label }) => {
            const displayLabel = key === "pending" ? `${label} (${pendingVerifs.length})` : key === "overtime" ? `${label} (${pendingOvertime.length})` : label;
            return (
              <button id={`hr-attendance-subtab-${key}`} data-testid={`hr-attendance-subtab-${key}`} data-active={subtab === key ? "true" : "false"} key={key} onClick={() => navigate(`/attendance/${route}`)} style={{ padding: "8px 18px", borderRadius: 999, border: subtab === key ? "1px solid var(--primary-color)" : "1px solid transparent", background: subtab === key ? "var(--surface-bg)" : "transparent", cursor: "pointer", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: subtab === key ? "var(--dark-text)" : "var(--light-text)" }}>{displayLabel}</button>
            );
          })}
        </div>
        {subtab !== "kiosk" && (
          <div className="attendance-tabs-desktop-toggle" style={{ display: "block" }}>
            <AttendanceViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        )}
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {isLoading && subtab !== "kiosk" ? (
          <div className="p-4">
            <SkeletonTable rows={4} columns={5} />
          </div>
        ) : (
          <>
            {subtab === "logs" && (
              viewMode === "table" ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Work Type</th><th style={th}>Clock In</th><th style={th}>Clock Out</th><th style={th}>Overtime</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
                  <tbody>{attendance.data.length === 0 ? <tr><td colSpan={7} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No attendance logs.</td></tr> : attendance.data.map((a) => (
                    <tr key={a.id} style={isSystemFlagged(a.status, a.systemGenerated, a.source, a.generatedBy) ? { background: "rgba(245,158,11,0.04)" } : undefined}><td style={{ ...tdc, fontWeight: 600 }}>{empName(a.employeeUid)}{isSystemFlagged(a.status, a.systemGenerated, a.source, a.generatedBy) && <span style={{ display: "block", marginTop: 3, ...lbl, color: "#b45309" }}>Needs verification before payroll</span>}</td><td style={tdc}>{formatDate(a.dateStr)}</td><td style={{ ...tdc, color: "var(--light-text)" }}>{a.clockInType || "—"}</td><td style={tdc}>{fmtTime(a.clockIn)}</td><td style={tdc}>{fmtTime(a.clockOut)}</td><td style={tdc}><OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} /></td><td style={{ ...tdc, textAlign: "right" }}><StatusBadge status={a.status} /></td></tr>
                  ))}</tbody>
                </table>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
                  {attendance.data.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No attendance logs.</div>
                  ) : (
                    attendance.data.map((a) => (
                      <div key={a.id} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 12, background: isSystemFlagged(a.status, a.systemGenerated, a.source, a.generatedBy) ? "rgba(245,158,11,0.02)" : "var(--surface-bg)", border: isSystemFlagged(a.status, a.systemGenerated, a.source, a.generatedBy) ? "1px solid rgba(245,158,11,0.2)" : "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--dark-text)", fontSize: 14 }}>{empName(a.employeeUid)}</div>
                            {isSystemFlagged(a.status, a.systemGenerated, a.source, a.generatedBy) && (
                              <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700, marginTop: 2 }}>Needs verification</div>
                            )}
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                          <div>
                            <div style={lbl}>Date</div>
                            <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{formatDate(a.dateStr)}</div>
                          </div>
                          <div>
                            <div style={lbl}>Mode</div>
                            <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{a.clockInType || "—"}</div>
                          </div>
                          <div>
                            <div style={lbl}>Clock In</div>
                            <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{fmtTime(a.clockIn)}</div>
                          </div>
                          <div>
                            <div style={lbl}>Clock Out</div>
                            <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{fmtTime(a.clockOut)}</div>
                          </div>
                        </div>
                        {a.overtimeMinutes > 0 && (
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={lbl}>Overtime</span>
                            <OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )
            )}
            {subtab === "pending" && (
              viewMode === "table" ? (
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
                          <button id={`hr-attendance-approve-${a.id}`} data-testid={`hr-attendance-approve-${a.id}`} onClick={() => attendance.verify(a.id, "Approved", approver?.uid)} className="btn-grid-action" style={{ marginRight: 8 }}>Approve</button>
                          <button id={`hr-attendance-reject-${a.id}`} data-testid={`hr-attendance-reject-${a.id}`} onClick={() => attendance.verify(a.id, "Rejected", approver?.uid)} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "#e11d48", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Reject</button>
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
                            <button id={`hr-attendance-card-approve-${a.id}`} data-testid={`hr-attendance-card-approve-${a.id}`} onClick={() => attendance.verify(a.id, "Approved", approver?.uid)} className="btn-grid-action" style={{ flex: 1 }}>Approve</button>
                            <button id={`hr-attendance-card-reject-${a.id}`} data-testid={`hr-attendance-card-reject-${a.id}`} onClick={() => attendance.verify(a.id, "Rejected", approver?.uid)} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "#e11d48", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Reject</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )
            )}
            {subtab === "overtime" && (
              viewMode === "table" ? (
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
              )
            )}
            {subtab === "field" && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid var(--border-color)", background: "rgba(100,116,139,0.03)" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--dark-text)" }}>Live Field Tracking</div>
                    <div style={{ fontSize: 11, color: "var(--light-text)" }}>Capture GPS for {actorEmp?.name || "the selected employee"} using this device.</div>
                    {geoMsg && <div style={{ fontSize: 11, marginTop: 4, color: /denied|Failed|Could not|not supported|first/.test(geoMsg) ? "#e11d48" : "#059669" }}>{geoMsg}</div>}
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
            )}
            {subtab === "compoff" && (
              viewMode === "table" ? (
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
              )
            )}
            {subtab === "onduty" && (
              viewMode === "table" ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Employee</th><th style={th}>Date</th><th style={th}>Client Site</th><th style={th}>Reason</th><th style={{ ...th, textAlign: "right" }}>Status</th></tr></thead>
                  <tbody>{onduty.data.length === 0 ? <tr><td colSpan={5} style={{ ...tdc, textAlign: "center", color: "var(--light-text)" }}>No on-duty requests.</td></tr> : onduty.data.map((o) => (
                    <tr key={o.id}><td style={{ ...tdc, fontWeight: 600 }}>{empName(o.employeeUid)}</td><td style={tdc}>{formatDate(o.date)}</td><td style={tdc}>{o.clientSite || "—"}</td><td style={{ ...tdc, color: "var(--light-text)" }}>{o.reason || "—"}</td><td style={{ ...tdc, textAlign: "right" }}>
                      {(o.status || "").toLowerCase() === "pending" ? <button id={`hr-attendance-onduty-approve-${o.id}`} data-testid={`hr-attendance-onduty-approve-${o.id}`} onClick={() => onduty.update(o.id, { status: "Approved" })} className="btn-grid-action">Approve</button> : <span style={lbl}>{o.status || "—"}</span>}
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
                            <div style={{ fontWeight: 600, color: "var(--dark-text)", marginTop: 2 }}>{o.reason || "—"}</div>
                          </div>
                        </div>
                        {(o.status || "").toLowerCase() === "pending" && (
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", gap: 8 }}>
                            <button id={`hr-attendance-card-onduty-approve-${o.id}`} data-testid={`hr-attendance-card-onduty-approve-${o.id}`} onClick={() => onduty.update(o.id, { status: "Approved" })} className="btn-grid-action" style={{ flex: 1 }}>Approve</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )
            )}
            {subtab === "kiosk" && <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--light-text)", fontSize: 13 }}>Face Kiosk Mode — webcam capture is pending; the backend enrollment endpoint is wired.</div>}
          </>
        )}
      </div>
    </section>
  );
}
