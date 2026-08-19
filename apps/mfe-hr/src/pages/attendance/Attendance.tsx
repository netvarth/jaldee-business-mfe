import { useEffect, useMemo, useState, lazy, Suspense, type CSSProperties } from "react";
import { CheckCircle2, Clock, Filter, History, LayoutGrid, Loader2, MapPin, MoreVertical, Table as Rows3, ScanFace, Timer, XCircle, ShieldAlert, Download, AlertTriangle } from "lucide-react";
import { Combobox, Popover, Select, SkeletonTable, Drawer, Button, DataTable, DataTablePagination, EmptyState, Dialog } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import type { ColumnDef } from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema, SearchSchemaField } from "@jaldee/shared-modules";
import { useLocation, useNavigate } from "react-router-dom";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../../lib/hrNavigation";
import { useMFEProps } from "@jaldee/auth-context";
const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));
import { useEmployees } from "../../services/useEmployees";
import { usePagedEmployeeOptions } from "../../services/usePagedEmployeeOptions";
import { useBranches } from "../../services/useBranches";
import { useAttendance, useOnDuty, useCompOffs, useLocationLogs, type AttendanceRecord } from "../../services/useAttendanceData";
import { useAnnouncements, type Announcement } from "../../services/useEngagement";
import { useAttendanceSearchSchema } from "../../services/useAttendanceSearchSchema";
import { useAttendanceRules } from "../../services/useSettingsData";
import { useHrApi } from "../../services/useHrApi";
import { formatDate } from "../../lib/utils";
import { CLOCK_TYPE_OPTIONS, ClockType } from "../../types";
import type { AttendanceBreak } from "../../types";
import { AttendanceBreakManager } from "../../components/AttendanceBreakManager";

type SubTab = "logs" | "pending" | "overtime" | "field" | "compoff" | "onduty" | "kiosk";

const ATTENDANCE_FILTER_FIELDS: Array<{ label: string; names: string[] }> = [
  { label: "Clock In", names: ["clockIn", "clockInTime", "checkIn"] },
  { label: "Location", names: ["location", "locationUid", "locationName", "branch", "branchUid"] },
  { label: "Clock Out", names: ["clockOut", "clockOutTime", "checkOut"] },
  { label: "WFH Status", names: ["wfhStatus", "workFromHomeStatus", "isWfh"] },
  { label: "Clock In Type", names: ["clockInType", "punchInType", "workMode"] },
  { label: "Is Early Departure", names: ["isEarlyDeparture", "earlyDeparture"] },
];

function normalizeAttendanceFilterName(value?: string): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function attendanceFilterSchema(schema: SearchSchema | null): SearchSchema | null {
  if (!schema) return null;

  const remaining = [...schema.fields];
  const fields = ATTENDANCE_FILTER_FIELDS.flatMap(({ label, names }) => {
    const allowedNames = new Set(names.map(normalizeAttendanceFilterName));
    const index = remaining.findIndex((field) =>
      [field.key, field.name, field.label, ...(field.aliases || [])]
        .some((candidate) => allowedNames.has(normalizeAttendanceFilterName(candidate))),
    );
    if (index < 0) return [];

    const [field] = remaining.splice(index, 1);
    return [{ ...field, label } satisfies SearchSchemaField];
  });

  return { ...schema, fields };
}

import {
  card, lbl, th, tdc, sel, fmtTime, minutesToHours, statusBadge, formatDuration,
  StatusBadge, OvertimePill, isSystemFlagged, hasNoShiftFlag, effectiveShiftLabel,
  ATTENDANCE_ROUTES, type SubTab,
} from "./AttendanceHelpers";
import { AttendanceSubTabs } from "./AttendanceSubTabs";
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
          reject(new Error("Location permission is required to punch in or out."));
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
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
      <button
        type="button"
        id="hr-attendance-view-table"
        data-testid="hr-attendance-view-table"
        data-active={value === "table"}
        onClick={() => onChange("table")}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          value === "table" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        ].join(" ")}
        aria-label="Table view"
        title="Table view"
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        id="hr-attendance-view-cards"
        data-testid="hr-attendance-view-cards"
        data-active={value === "cards"}
        onClick={() => onChange("cards")}
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          value === "cards" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        ].join(" ")}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

export default function Attendance() {
  const { location: activeLocation } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const fromAnalytics = isAnalyticsNavigation(location.state);
  const { data: employees, loading: empLoading, error: empError } = useEmployees();
  const branches = useBranches();
  const attendanceRules = useAttendanceRules();
  const onduty = useOnDuty();
  const compoffs = useCompOffs();
  const locationLogs = useLocationLogs();
  const isLoading = empLoading || onduty.loading || compoffs.loading || locationLogs.loading;

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

  // Attendance search + pagination state
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [attPage, setAttPage] = useState(0);
  const [attPageSize, setAttPageSize] = useState(20);
  const { schema: fullAttendanceSchema, loading: schemaLoading } = useAttendanceSearchSchema();
  const attendanceSchema = useMemo(
    () => attendanceFilterSchema(fullAttendanceSchema),
    [fullAttendanceSchema],
  );
  const attendance = useAttendance(advancedFilters, fullAttendanceSchema, {
    enabled: !schemaLoading,
    page: attPage,
    pageSize: attPageSize,
  });
  const selectedEmployeeFilters = useMemo<SearchFilterClause[]>(
    () => actor ? [{ field: "employeeUid", operator: "EQ", values: [actor] }] : [],
    [actor]
  );
  const selectedEmployeeAttendance = useAttendance(selectedEmployeeFilters, fullAttendanceSchema, {
    enabled: !schemaLoading && !!actor,
    page: 0,
    pageSize: 100,
  });
  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, attendanceSchema).length,
    [advancedFilters, attendanceSchema]
  );

  const openFilters = () => {
    setDraftFilters(advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(attendanceSchema));
    setFiltersOpen(true);
  };
  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(attendanceSchema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
    setAttPage(0);
  };
  const resetFilters = () => { clearFilters(); setFiltersOpen(false); };
  const applyFilters = () => { setAdvancedFilters(draftFilters); setAttPage(0); setFiltersOpen(false); };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => setViewMode(media.matches ? "cards" : "table");
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

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
  const locationEmployees = useMemo(
    () => selectedLocationUid
      ? employees.filter((employee) => employee.locationUid === selectedLocationUid)
      : employees,
    [employees, selectedLocationUid]
  );
  const attendanceEmployeeFilters = useMemo<SearchFilterClause[]>(
    () => selectedLocationUid
      ? [{ id: "attendance-employee-location", field: "locationUid", operator: "EQ", values: [selectedLocationUid] }]
      : [],
    [selectedLocationUid]
  );
  const attendanceEmployeeOptions = usePagedEmployeeOptions({
    enabled: Boolean(selectedLocationUid),
    filters: attendanceEmployeeFilters,
  });
  useEffect(() => {
    if (actor && attendanceEmployeeOptions.data.some((employee) => employee.id === actor)) return;
    setActor(attendanceEmployeeOptions.data[0]?.id ?? "");
  }, [actor, attendanceEmployeeOptions.data]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const empName = useMemo(() => { const m = new Map(employees.map((e) => [e.id, e.name] as const)); return (uid?: string) => (uid ? m.get(uid) ?? uid : "—"); }, [employees]);
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);
  // The approver of a WFH/field punch is the employee's reporting manager (HR/Admin otherwise).
  const approverFor = (employeeUid?: string) => { const m = employeeUid ? empById.get(employeeUid)?.reportingManagerUid : undefined; return m ? { uid: m, name: empName(m) } : null; };
  const today = new Date().toISOString().slice(0, 10);
  const open = useMemo(() => selectedEmployeeAttendance.data.find((a) => a.employeeUid === actor && a.dateStr === today && a.clockIn && !a.clockOut), [selectedEmployeeAttendance.data, actor, today]);
  const clockedIn = !!open;

  const api = useHrApi();
  const [detailedBreaks, setDetailedBreaks] = useState<AttendanceBreak[]>([]);

  useEffect(() => {
    if (!open?.id) {
      setDetailedBreaks([]);
      return;
    }
    let isMounted = true;
    const loadBreaks = async () => {
      try {
        let rec: Record<string, unknown> | null = null;
        try {
          rec = await api.get<Record<string, unknown>>(`/attendance/${open.id}`);
        } catch {
          try {
            const list = await api.get<Record<string, unknown>[]>("/me/attendance");
            if (Array.isArray(list)) {
              rec = list.find((item) => item.id === open.id || item.uid === open.id) || null;
            }
          } catch { rec = null; }
        }
        if (rec && isMounted) {
          const raw = rec.breaks || rec.attendanceBreaks || rec.breakList || [];
          if (Array.isArray(raw)) setDetailedBreaks(raw as AttendanceBreak[]);
        }
      } catch {
        if (isMounted) setDetailedBreaks([]);
      }
    };
    void loadBreaks();
    return () => { isMounted = false; };
  }, [api, open?.id]);
  const weekHours = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 7);
    return selectedEmployeeAttendance.data.filter((a) => a.employeeUid === actor && a.dateStr && new Date(a.dateStr) >= since).reduce((t, a) => t + (a.workedHours ?? 0), 0);
  }, [selectedEmployeeAttendance.data, actor, today]);
  const todayLogs = useMemo(() => selectedEmployeeAttendance.data.filter((a) => a.employeeUid === actor && a.dateStr === today), [selectedEmployeeAttendance.data, actor, today]);
  const faceRequired = !!attendanceRules.data?.faceRecognitionRequired;
  const pendingOvertime = useMemo(() => attendance.data.filter((a) => (a.overtimeStatus || "").toLowerCase() === "pending" && (a.overtimeMinutes ?? 0) > 0), [attendance.data]);
  const shouldShowLocationSelect = branches.data.length > 1;

  const essAnnouncements = useAnnouncements([], null, { scope: "ess" });
  const [mandatoryAckNotice, setMandatoryAckNotice] = useState<Announcement | null>(null);
  const [ackSaving, setAckSaving] = useState(false);

  const pendingMandatoryAnnouncements = useMemo(() => {
    return essAnnouncements.data.filter(
      (a) => a.mandatoryAck && !a.isAcknowledged && a.status !== "Disabled"
    );
  }, [essAnnouncements.data]);

  const actorEmp = useMemo(() => employees.find((e) => e.id === actor), [employees, actor]);

  const doPunch = async (secured: boolean, selfieDataUrl?: string) => {
    setBusy(true); setMsg(null);
    try {
      if (clockedIn && open) {
        const currentPosition = await resolveCurrentPosition();
        const locationUid = selectedLocationUid || activeLocation?.id || "";
        const selectedBranch = branches.data.find((branch) => branch.id === locationUid);
        await selectedEmployeeAttendance.punchOut(open.id, {
          locationUid,
          punchOutLocation: {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            address: selectedBranch?.address || "",
          },
        });
        await attendance.reload();
        setMsg("Clocked out.");
      } else {
        const currentPosition = await resolveCurrentPosition();
          await selectedEmployeeAttendance.punchIn({
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
        await attendance.reload();
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
    if (clockedIn && pendingMandatoryAnnouncements.length > 0) {
      setMandatoryAckNotice(pendingMandatoryAnnouncements[0]);
      return;
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

  const clockText = clockedIn ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }) : "--:--:--";

  return (
    <section id="hr-attendance-page" data-testid="hr-attendance-page" className="page-section active hr-page-shell">
      {faceOpen && (
        <Suspense fallback={null}>
          <FaceCaptureModal title="Verify Face to Clock In" subtitle={actorEmp?.name} busy={busy} onCapture={verifyAndPunch} onClose={() => setFaceOpen(false)} />
        </Suspense>
      )}
      <PageHeader
        variant={fromAnalytics ? "navigation" : "default"}
        back={fromAnalytics ? HR_ANALYTICS_BACK : undefined}
        onNavigate={(href) => navigate(href)}
        title="Attendance"
        subtitle="Shift and activity tracking"
      />

      {/* console + stats + timeline grid layout */}
      <div className="attendance-console-grid" style={{ display: "grid", gridTemplateColumns: "45fr 25fr 30fr", gap: 24, marginBottom: 24, alignItems: "stretch" }}>
        
        {/* Column 2: Consolidated Stats Overview */}
        <div className="attendance-stats-summary-card" style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--dark-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Summary Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            <div>
              <div style={lbl}>Hours Worked</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dark-text)", marginTop: 2 }}>{formatDuration(undefined, weekHours)}</div>
              <div style={{ fontSize: 8.5, color: "var(--light-text)", marginTop: 1, fontWeight: 800, letterSpacing: "0.04em" }}>THIS WEEK</div>
            </div>
            <div>
              <div style={lbl}>Current Mode</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary-color)", marginTop: 2 }}>{mode}</div>
              <div style={{ fontSize: 8.5, color: "var(--light-text)", marginTop: 1, fontWeight: 800, letterSpacing: "0.04em" }}>ACTIVE SESSION</div>
            </div>
            {pendingVerifs.length > 0 && (
              <div>
                <div style={{ ...lbl, color: "#b45309" }}>Pending WFH</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#b45309", marginTop: 2 }}>{pendingVerifs.length}</div>
                <div style={{ fontSize: 8.5, color: "var(--light-text)", marginTop: 1, fontWeight: 800, letterSpacing: "0.04em" }}>NEEDS APPROVAL</div>
              </div>
            )}
            {pendingOvertime.length > 0 && (
              <div>
                <div style={{ ...lbl, color: "#7c3aed" }}>Pending OT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed", marginTop: 2 }}>{pendingOvertime.length}</div>
                <div style={{ fontSize: 8.5, color: "var(--light-text)", marginTop: 1, fontWeight: 800, letterSpacing: "0.04em" }}>NEEDS VERIFICATION</div>
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
              <Combobox
                id="hr-attendance-actor"
                data-testid="hr-attendance-actor"
                label="Acting Employee"
                value={actor}
                onValueChange={setActor}
                placeholder={selectedLocationUid ? "Select employee" : "Select location first"}
                searchPlaceholder="Search employees..."
                searchValue={attendanceEmployeeOptions.searchValue}
                onSearchChange={attendanceEmployeeOptions.onSearchChange}
                loading={attendanceEmployeeOptions.loading}
                hasMore={attendanceEmployeeOptions.hasMore}
                onEndReached={attendanceEmployeeOptions.onLoadMore}
                disabled={!selectedLocationUid}
                options={attendanceEmployeeOptions.data.map((employee) => ({
                  value: employee.id || "",
                  label: employee.name || employee.employeeId || employee.id || "Employee",
                }))}
              />
              <Select
                id="hr-attendance-mode"
                testId="hr-attendance-mode"
                label="Work Mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as ClockType)}
                options={CLOCK_TYPE_OPTIONS.map((value) => ({ value, label: value }))}
              />
              <div className="attendance-face-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--border-color)", borderRadius: 12, background: "rgba(100,116,139,0.03)" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dark-text)", letterSpacing: "0.04em" }}>FACE RECOGNITION SCAN</div>
                  <div style={{ fontSize: 10, color: "var(--light-text)", marginTop: 2 }}>{faceRequired ? "Required by attendance policy" : "Verify check-in with your camera feed"}</div>
                </div>
                <button id="hr-attendance-face-toggle" data-testid="hr-attendance-face-toggle" data-active={faceRequired || face ? "true" : "false"} disabled={faceRequired} onClick={() => setFace((v) => !v)} aria-label="toggle face" style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: faceRequired ? "not-allowed" : "pointer", background: faceRequired || face ? "var(--primary-color)" : "var(--border-color)", position: "relative", opacity: faceRequired ? 0.75 : 1 }}><span style={{ position: "absolute", top: 2, left: faceRequired || face ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .15s" }} /></button>
              </div>
              <Button id="hr-attendance-punch-button" data-testid="hr-attendance-punch-button" variant={clockedIn ? "danger" : "primary"} size="lg" onClick={handlePunch} disabled={!actor} loading={busy} fullWidth>
                {clockedIn ? "Clock Out" : "Clock In"}
              </Button>
              <AttendanceBreakManager
                attendanceUid={open?.id}
                employeeUid={actor}
                breaks={open?.breaks}
                isPunchedIn={clockedIn}
                isPunchedOut={!clockedIn}
                onStartBreak={async (breakType, opts) => {
                  if (open?.id) {
                    const res = await attendance.startBreak(
                      opts?.attendanceUid || open.id,
                      breakType,
                      opts?.employeeUid || actor,
                      opts?.breakIn
                    );
                    await attendance.reload();
                    try {
                      const rec = await api.get<Record<string, unknown>>(`/attendance/${open.id}`);
                      const raw = rec?.breaks || rec?.attendanceBreaks || rec?.breakList || [];
                      if (Array.isArray(raw)) setDetailedBreaks(raw as AttendanceBreak[]);
                    } catch { /* ignore */ }
                    return res;
                  }
                }}
                onEndBreak={async (breakUid, breakOutIso, opts) => {
                  if (open?.id) {
                    const res = await attendance.endBreak(
                      opts?.attendanceUid || open.id,
                      breakUid,
                      breakOutIso,
                      opts?.employeeUid || actor,
                      opts?.breakType
                    );
                    await attendance.reload();
                    try {
                      const rec = await api.get<Record<string, unknown>>(`/attendance/${open.id}`);
                      const raw = rec?.breaks || rec?.attendanceBreaks || rec?.breakList || [];
                      if (Array.isArray(raw)) setDetailedBreaks(raw as AttendanceBreak[]);
                    } catch { /* ignore */ }
                    return res;
                  }
                }}
                compact
              />
              {(msg || empError) && <div data-testid="hr-attendance-punch-message" style={{ fontSize: 12, textAlign: "center", color: empError && !msg ? "var(--danger-color)" : "var(--light-text)", marginTop: 4 }}>{msg || `Employees failed to load: ${empError}`}</div>}
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
              <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", border: "1px solid var(--border-color)", borderRadius: 14, background: "rgba(100,116,139,0.02)" }}>
                {/* Header Row: Work Mode + Badges */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800, color: "var(--dark-text)", fontSize: 13.5 }}>{a.clockInType || "Office"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} />
                    <StatusBadge status={a.status || "Present"} />
                  </div>
                </div>

                {/* Timing Row */}
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--light-text)" }}>In {fmtTime(a.clockIn)} · Out {fmtTime(a.clockOut)}</div>

                {/* Shift Label */}
                {effectiveShiftLabel(a) && effectiveShiftLabel(a) !== "—" && effectiveShiftLabel(a) !== "No shift assigned" && (
                  <div data-testid={`hr-attendance-timeline-effective-shift-${a.id}`} style={{ fontSize: 11, color: hasNoShiftFlag(a) ? "var(--color-warning)" : "var(--light-text)" }}>{effectiveShiftLabel(a)}</div>
                )}

                {/* Break Info Section */}
                {(() => {
                  const recordObj = a as Record<string, unknown>;
                  const rawList = (
                    (Array.isArray(a.breaks) && a.breaks.length > 0 ? a.breaks : null) ??
                    (a.id === open?.id && detailedBreaks.length > 0 ? detailedBreaks : null) ??
                    (Array.isArray(recordObj.attendanceBreaks) ? recordObj.attendanceBreaks : null) ??
                    (Array.isArray(recordObj.breakList) ? recordObj.breakList : null) ??
                    (recordObj.activeBreak && typeof recordObj.activeBreak === "object" ? [recordObj.activeBreak] : [])
                  ) as Record<string, unknown>[];
                  const breakList = Array.isArray(rawList) ? rawList : [];
                  if (breakList.length === 0) return null;

                  return (
                    <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 4 }}>
                      {breakList.map((b, idx) => {
                        const rawType = String(b.breakType || b.type || b.name || "Break");
                        const bType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
                        const bIn = (b.breakIn || b.breakInTime || b.startTime) as string | undefined;
                        const bOut = (b.breakOut || b.breakOutTime || b.endTime) as string | undefined;
                        const bDuration = Number(b.durationMinutes || b.duration || b.breakMinutes || 0);
                        const isActive = Boolean(bIn && !bOut);

                        let calculatedMins = bDuration;
                        if (!calculatedMins && bIn && bOut) {
                          const s = new Date(bIn).getTime();
                          const e = new Date(bOut).getTime();
                          if (!isNaN(s) && !isNaN(e) && e > s) {
                            calculatedMins = Math.round((e - s) / 60000);
                          }
                        }

                        return (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: isActive ? "rgba(245,158,11,0.08)" : "rgba(100,116,139,0.04)",
                              border: isActive ? "1px solid rgba(245,158,11,0.22)" : "1px solid var(--border-color)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13 }}>☕</span>
                              <span style={{ fontSize: 11, fontWeight: 800, color: isActive ? "#b45309" : "var(--dark-text)" }}>
                                {bType}
                              </span>
                              {isActive && (
                                <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>
                                  Active
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--light-text)", whiteSpace: "nowrap" }}>
                              {fmtTime(bIn)} {bOut ? `– ${fmtTime(bOut)}` : "→ Ongoing"} {calculatedMins > 0 ? `(${minutesToHours(calculatedMins)})` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
              <>
                {/* Logs toolbar: filter button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border-color)", gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--light-text)" }}>
                    {attendance.totalElements > 0 ? `${attendance.totalElements} records` : "Attendance Logs"}
                  </span>
                  <Button
                    type="button"
                    id="hr-attendance-filter-button"
                    data-testid="hr-attendance-filter-button"
                    variant={appliedFilterCount > 0 ? "primary" : "outline"}
                    icon={<Filter size={16} />}
                    aria-label="Filter attendance"
                    onClick={openFilters}
                  >
                    Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
                  </Button>
                </div>
                {viewMode === "table" ? (
                  <DataTable
                    data-testid="hr-attendance-logs-table"
                    data={attendance.data}
                    columns={[
                      {
                        key: "employeeUid",
                        header: "Employee",
                        width: "18.5%",
                        render: (a) => (
                          <div>
                            <div style={{ fontWeight: 600 }}>{empName(a.employeeUid)}</div>
                            {isSystemFlagged(a.status, a.systemGenerated, a.source, a.generatedBy) && (
                              <div style={{ fontSize: 10, color: "#b45309", fontWeight: 700, marginTop: 2 }}>Needs verification before payroll</div>
                            )}
                          </div>
                        ),
                      },
                      { key: "dateStr", header: "Date", width: "9.5%", render: (a) => <span className="whitespace-nowrap">{formatDate(a.dateStr)}</span> },
                      {
                        key: "effectiveShiftUid",
                        header: "Effective Shift",
                        width: "8%",
                        render: (a) => (
                          <span data-testid={`hr-attendance-effective-shift-${a.id}`} style={{ color: hasNoShiftFlag(a) ? "var(--color-warning)" : "var(--dark-text)", fontWeight: hasNoShiftFlag(a) ? 700 : 500 }}>
                            {effectiveShiftLabel(a)}
                          </span>
                        ),
                      },
                      { key: "clockInType", header: "Work Type", width: "7%", render: (a) => <span className="whitespace-nowrap" style={{ color: "var(--light-text)" }}>{a.clockInType || "—"}</span> },
                      { key: "clockIn", header: "Clock In", width: "7%", render: (a) => <span className="whitespace-nowrap">{fmtTime(a.clockIn)}</span> },
                      { key: "clockOut", header: "Clock Out", width: "7%", render: (a) => <span className="whitespace-nowrap">{fmtTime(a.clockOut)}</span> },
                      {
                        key: "workedHours",
                        header: "Worked Duration",
                        width: "10%",
                        render: (a) => (
                          <span className="whitespace-nowrap font-semibold text-[var(--dark-text)]">
                            {formatDuration(a.workedMinutes, a.workedHours, a.workedHoursFormatted)}
                          </span>
                        ),
                      },
                      {
                        key: "breaks",
                        header: "Breaks",
                        width: "7.5%",
                        render: (a) => {
                          const recordObj = a as Record<string, unknown>;
                          const rawList = (
                            (Array.isArray(a.breaks) && a.breaks.length > 0 ? a.breaks : null) ??
                            (a.id === open?.id && detailedBreaks.length > 0 ? detailedBreaks : null) ??
                            (Array.isArray(recordObj.attendanceBreaks) ? recordObj.attendanceBreaks : null) ??
                            (Array.isArray(recordObj.breakList) ? recordObj.breakList : null) ??
                            (recordObj.activeBreak && typeof recordObj.activeBreak === "object" ? [recordObj.activeBreak] : [])
                          ) as Record<string, unknown>[];

                          const breakList = Array.isArray(rawList) ? rawList : [];

                          let totalMinutes = breakList.reduce((acc, b) => {
                            const start = b.breakIn || b.breakInTime || b.startTime;
                            const end = b.breakOut || b.breakOutTime || b.endTime;
                            if (start && end) {
                              const s = new Date(start as string).getTime();
                              const e = new Date(end as string).getTime();
                              if (!isNaN(s) && !isNaN(e) && e > s) {
                                return acc + Math.round((e - s) / 60000);
                              }
                            }
                            return acc + Number(b.durationMinutes || b.duration || b.breakMinutes || 0);
                          }, 0);

                          if (totalMinutes === 0) {
                            const fallbackMins = Number(
                              recordObj.totalBreakMinutes ?? recordObj.breakMinutes ?? recordObj.totalBreakDuration ?? recordObj.breakDuration ?? 0
                            );
                            if (fallbackMins > 0) totalMinutes = fallbackMins;
                          }

                          const activeBreak = breakList.find((b) => (b.breakIn || b.breakInTime) && !(b.breakOut || b.breakOutTime));

                          if (totalMinutes === 0 && breakList.length === 0 && !activeBreak) {
                            return <span style={{ color: "var(--light-text)" }}>—</span>;
                          }

                          return (
                            <div className="flex flex-col gap-0.5 whitespace-nowrap" title={`${breakList.length || 1} break(s)`}>
                              <div className="flex items-center gap-1 font-semibold text-amber-900 text-xs">
                                <span>☕</span>
                                <span>{totalMinutes > 0 ? minutesToHours(totalMinutes) : `${breakList.length || 1} break`}</span>
                                {activeBreak && (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 animate-pulse">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        },
                      },
                      { key: "overtimeMinutes", header: "Overtime", width: "18.5%", render: (a) => <OvertimePill minutes={a.overtimeMinutes} status={a.overtimeStatus} approved={a.approvedOvertimeMinutes} /> },
                      { key: "status", header: "Status", width: "7%", align: "right", render: (a) => <StatusBadge status={a.status} /> },
                    ] as ColumnDef<typeof attendance.data[0]>[]}
                    getRowId={(a) => a.id}
                    loading={attendance.loading}
                    className="rounded-none border-0 bg-transparent shadow-none [&_td]:px-2 [&_th]:px-2"
                    tableClassName="w-full min-w-0"
                    pagination={{
                      page: attPage + 1,
                      pageSize: attPageSize,
                      total: attendance.totalElements,
                      mode: "server",
                      onChange: (p) => setAttPage(p - 1),
                      onPageSizeChange: (size) => {
                        setAttPageSize(size);
                        setAttPage(0);
                      },
                    }}
                    emptyState={(
                      <div data-testid="hr-attendance-logs-empty">
                        <EmptyState title="No attendance logs" description="Adjust filters or date range to find records." />
                      </div>
                    )}
                  />
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, padding: 16 }}>
                      {attendance.data.length === 0 ? (
                        <div data-testid="hr-attendance-logs-empty" style={{ textAlign: "center", color: "var(--light-text)", gridColumn: "1/-1", padding: 24 }}>No attendance logs.</div>
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
                              <div style={{ gridColumn: "1/-1" }}>
                                <div style={lbl}>Effective Shift</div>
                                <div data-testid={`hr-attendance-card-effective-shift-${a.id}`} style={{ fontWeight: 600, color: hasNoShiftFlag(a) ? "var(--color-warning)" : "var(--dark-text)", marginTop: 2 }}>{effectiveShiftLabel(a)}</div>
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
                    <DataTablePagination
                      testId="hr-attendance-cards-pagination"
                      page={attPage + 1}
                      pageSize={attPageSize}
                      total={attendance.totalElements}
                      onChange={(p) => setAttPage(p - 1)}
                      onPageSizeChange={(size) => {
                        setAttPageSize(size);
                        setAttPage(0);
                      }}
                      position="top"
                    />
                  </>
                )}
              </>
            )}
            <AttendanceSubTabs
              subtab={subtab}
              viewMode={viewMode}
              pendingVerifs={pendingVerifs}
              pendingOvertime={pendingOvertime}
              overtimeDrafts={overtimeDrafts}
              setOvertimeDrafts={setOvertimeDrafts}
              approverFor={approverFor}
              empName={empName}
              actOvertime={actOvertime}
              attendance={attendance}
              actorEmp={actorEmp}
              geoMsg={geoMsg}
              autoTrack={autoTrack}
              setAutoTrack={setAutoTrack}
              geoBusy={geoBusy}
              captureLocation={captureLocation}
              locationLogs={locationLogs}
              compoffs={compoffs}
              onduty={onduty}
            />
            {subtab === "kiosk" && <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--light-text)", fontSize: 13 }}>Face Kiosk Mode — webcam capture is pending; the backend enrollment endpoint is wired.</div>}
          </>
        )}
      </div>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Attendance Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-attendance-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={attendanceSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No attendance filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button type="button" variant="outline" className="flex-1" data-testid="hr-attendance-filter-reset" onClick={resetFilters}>Reset All</Button>
            <Button type="button" variant="primary" className="flex-1" data-testid="hr-attendance-filter-apply" onClick={applyFilters}>Apply Filters</Button>
          </div>
        </div>
      </Drawer>

      {/* Mandatory Announcement Enforcement Modal on Punch-Out */}
      <Dialog
        open={Boolean(mandatoryAckNotice)}
        onClose={() => setMandatoryAckNotice(null)}
        testId="hr-mandatory-ack-enforcement-modal"
        title="Action Required: Mandatory Announcement"
        description="You must acknowledge this company notice before clocking out."
        contentClassName="max-w-[560px]"
      >
        {mandatoryAckNotice && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
                <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                <span>{mandatoryAckNotice.title}</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed m-0">
                {mandatoryAckNotice.description}
              </p>
            </div>

            {mandatoryAckNotice.attachments?.length ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attached Guidelines & Documents</div>
                {mandatoryAckNotice.attachments.map((item, idx) => {
                  const att = typeof item === "string" ? { filePath: item } : item;
                  const href = att.filePath || att.shortUrl || att.url;
                  const name = att.fileName || `Attachment ${idx + 1}`;
                  return (
                    <a
                      key={idx}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-teal-800 no-underline"
                    >
                      <span className="truncate">{name}</span>
                      <Download size={14} />
                    </a>
                  );
                })}
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
              <Button
                id="hr-mandatory-ack-cancel"
                data-testid="hr-mandatory-ack-cancel"
                variant="outline"
                onClick={() => setMandatoryAckNotice(null)}
              >
                Cancel
              </Button>
              <Button
                id="hr-mandatory-ack-confirm-btn"
                data-testid="hr-mandatory-ack-confirm-btn"
                variant="primary"
                className="bg-teal-700 hover:bg-teal-800 font-extrabold"
                loading={ackSaving}
                onClick={async () => {
                  setAckSaving(true);
                  try {
                    await essAnnouncements.acknowledge(mandatoryAckNotice.id, actor);
                    setMandatoryAckNotice(null);
                    await doPunch(false);
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : "Failed to acknowledge announcement.");
                  } finally {
                    setAckSaving(false);
                  }
                }}
              >
                I Acknowledge and Understand
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
