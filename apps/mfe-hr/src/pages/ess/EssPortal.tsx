// Employee Self Service (ESS) main portal module - clean build verified
import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarDays, Clock, Eye, FileText, History, Info, LayoutGrid, Loader2, LogOut, MessageSquare, MoreHorizontal, Plus, Receipt, ShieldAlert, Table as Rows3, Timer, User, Wallet, X, type LucideIcon } from "lucide-react";
import { Button, DataTable, DataTablePagination, DatePicker, Dialog, EmptyState, FileUpload, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  useMyAttendance,
  useMyLeaveBalances,
  useMyLeaves,
  useMyPayslips,
  useMyProfile,
  sortAttendanceLatestFirst,
  type MyPayslip,
} from "../../services/useEss";
import { useBranches } from "../../services/useBranches";
import { useDocumentRequests, type DocumentRequest } from "../../services/useDocumentRequests";
import Announcements from "../announcements/Announcements";
import Expenses from "../expenses/Expenses";
import Tickets from "../tickets/Tickets";
import EssMemos from "./EssMemos";
import { useAttendanceRules, useLeaveTypes } from "../../services/useSettingsData";
import { formatCurrency, formatDate } from "../../lib/utils";
import { useExits } from "../../services/useExits";
import { PayslipStatementDialog } from "../../components/PayslipStatementDialog";
import { AttendanceBreakManager, BREAK_TYPE_OPTIONS, calculateDurationMinutes } from "../../components/AttendanceBreakManager";
import { useHrApi } from "../../services/useHrApi";
import type { AttendanceBreak } from "../../types";

const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));

type Section = "attendance" | "profile" | "leave" | "documents" | "payslips" | "staffspace" | "expenses" | "memos" | "separation" | "helpdesk";

const ESS_ROUTES: Array<{ key: Section; route: string; label: string; Icon: LucideIcon }> = [
  { key: "attendance", route: "", label: "Attendance", Icon: Clock },
  { key: "profile", route: "profile", label: "My Profile", Icon: User },
  { key: "leave", route: "leave", label: "Leave", Icon: CalendarDays },
  { key: "documents", route: "documents", label: "My Documents", Icon: FileText },
  { key: "staffspace", route: "staffspace", label: "StaffSpace", Icon: FileText },
  { key: "payslips", route: "payslips", label: "Payslips", Icon: Wallet },
  { key: "expenses", route: "expenses", label: "Expenses", Icon: Receipt },
  { key: "memos", route: "memos", label: "Warning Memos", Icon: ShieldAlert },
  { key: "separation", route: "separation", label: "Separation", Icon: LogOut },
  { key: "helpdesk", route: "helpdesk", label: "HelpDesk", Icon: MessageSquare },
];

const SECTION_DESCRIPTIONS: Record<Section, string> = {
  attendance: "Track work mode, punch status and attendance history.",
  profile: "Your HR profile, identity details and employment information.",
  leave: "Review leave balances and past requests.",
  documents: "Documents requested by your company and the files you have submitted.",
  payslips: "View payroll statements and generated payslips.",
  staffspace: "Company announcements and internal updates.",
  expenses: "Submit and track employee expense claims.",
  memos: "Review warning notices and acknowledge disclosures.",
  separation: "Raise and track your resignation request.",
  helpdesk: "Raise support requests and follow updates.",
};

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning! Hope you have a productive day ahead.";
  if (hour < 17) return "Good Afternoon! Hope your day is going well.";
  return "Good Evening! Hope you had a great and productive day.";
}

function getUserDisplayName(fullName?: string | null): string {
  if (!fullName) return "there";
  const clean = fullName.trim();
  return clean || "there";
}

function sectionFromPath(pathname: string): Section {
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments.at(-1);
  if (segment === "me" || segment === "attendance") return "attendance";
  const match = ESS_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "attendance";
}

function calcLeaveDays(start?: string, end?: string, half?: boolean): number {
  if (!start || !end) return 0;
  if (half && start === end) return 0.5;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
}

function formatHoursAndMinutes(workedHours?: number, workedMinutes?: number, workedHoursFormatted?: string): string {
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
  return "--";
}

function mergeLeaveBalanceBuckets<T extends { leaveTypeName?: string; total?: number; used?: number; available?: number; status?: string }>(
  items: T[],
) {
  const grouped = new Map<string, T & { total: number; used: number; available: number }>();
  for (const item of items) {
    const key = `${item.leaveTypeName || "Leave"}::${item.status || "ACTIVE"}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.total += item.total ?? 0;
      existing.used += item.used ?? 0;
      existing.available += item.available ?? 0;
      continue;
    }
    grouped.set(key, {
      ...item,
      total: item.total ?? 0,
      used: item.used ?? 0,
      available: item.available ?? 0,
    });
  }
  return Array.from(grouped.values());
}

const contentPanel: CSSProperties = {
  minWidth: 0,
  padding: 0,
  borderRadius: 0,
  background: "transparent",
  border: "none",
  boxShadow: "none",
};

const snapshotGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  marginTop: 0,
};

const pageStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
  paddingBottom: 20,
};

type ViewMode = "table" | "cards";
const EMPTY_DOCUMENT_FILTERS: [] = [];

function getPreferredViewMode(): ViewMode {
  if (typeof window === "undefined") return "table";
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "table";
}

export default function EssPortal() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const section = sectionFromPath(location.pathname);
  const [mode, setMode] = useState("Office");
  const [attendanceViewMode, setAttendanceViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [leaveViewMode, setLeaveViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [documentViewMode, setDocumentViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [payslipViewMode, setPayslipViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [selectedPayslip, setSelectedPayslip] = useState<MyPayslip | null>(null);
  const [faceOpen, setFaceOpen] = useState(false);
  const [punchBusy, setPunchBusy] = useState(false);
  const [leaveApplyOpen, setLeaveApplyOpen] = useState(false);
  const [leaveApplyBusy, setLeaveApplyBusy] = useState(false);
  const [leaveApplyError, setLeaveApplyError] = useState<string | null>(null);
  const [exitBusy, setExitBusy] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitForm, setExitForm] = useState({ noticePeriodDays: "30", reason: "" });
  const [selectedExitDetail, setSelectedExitDetail] = useState<ExitRequest | null>(null);
  const navigate = useNavigate();
  const [essMenuOpen, setEssMenuOpen] = useState(false);
  const [exitDetailLoading, setExitDetailLoading] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentSubmitBusy, setDocumentSubmitBusy] = useState(false);
  const [documentSubmitError, setDocumentSubmitError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRequest | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentPage, setDocumentPage] = useState(1);
  const [documentPageSize, setDocumentPageSize] = useState(20);
  const [leaveApplyForm, setLeaveApplyForm] = useState({
    leaveTypeUid: "",
    type: "",
    startDate: "",
    endDate: "",
    isHalfDay: false,
    halfDayType: "FIRST_HALF" as "FIRST_HALF" | "SECOND_HALF",
    reason: "",
  });
  const profile = useMyProfile();
  const exits = useExits({ enabled: section === "separation" });
  const attendanceRules = useAttendanceRules();
  const leaveTypes = useLeaveTypes({ enabled: section === "leave" });
  const attendance = useMyAttendance();
  const leaves = useMyLeaves({ enabled: section === "leave" });
  const balances = useMyLeaveBalances();
  const payslips = useMyPayslips();
  const documents = useDocumentRequests(profile.data?.id ?? profile.data?.uid, EMPTY_DOCUMENT_FILTERS, null, {
    enabled: section === "documents",
    page: documentPage - 1,
    pageSize: documentPageSize,
  });
  const activeBalances = useMemo(
    () => mergeLeaveBalanceBuckets(balances.data.filter((item) => (item.status || "ACTIVE").toUpperCase() === "ACTIVE")),
    [balances.data],
  );
  const pastBalances = useMemo(
    () => mergeLeaveBalanceBuckets(balances.data.filter((item) => (item.status || "ACTIVE").toUpperCase() !== "ACTIVE")),
    [balances.data],
  );
  const assignedLeaveTypes = useMemo(() => {
    const assignedBalances = balances.data.filter(
      (balance) => (balance.status || "ACTIVE").toUpperCase() === "ACTIVE",
    );
    return leaveTypes.data.filter((leaveType) =>
      assignedBalances.some((balance) => {
        const leaveTypeUid = String(leaveType.uid || leaveType.id || "").trim();
        const balanceUid = String(balance.leaveTypeUid || "").trim();
        if (leaveTypeUid && balanceUid) return leaveTypeUid === balanceUid;

        const leaveTypeName = String(leaveType.name || "").trim().toLowerCase();
        const balanceName = String(balance.leaveTypeName || balance.leaveType || "").trim().toLowerCase();
        return Boolean(leaveTypeName && balanceName && leaveTypeName === balanceName);
      }),
    );
  }, [balances.data, leaveTypes.data]);
  const today = new Date().toISOString().slice(0, 10);
  const branches = useBranches();
  const [selectedLocationUid, setSelectedLocationUid] = useState("");
  const [isOnBreak, setIsOnBreak] = useState(false);
  const sortedAttendance = useMemo(
    () => sortAttendanceLatestFirst(attendance.data),
    [attendance.data],
  );
  const todayAttendance = useMemo(
    () => sortedAttendance.find((item) => item.dateStr === today),
    [sortedAttendance, today],
  );

  const api = useHrApi();
  const [essDetailedBreaks, setEssDetailedBreaks] = useState<AttendanceBreak[]>([]);

  useEffect(() => {
    if (!todayAttendance?.id) {
      setEssDetailedBreaks([]);
      return;
    }
    let isMounted = true;
    const loadBreaks = async () => {
      try {
        let rec: Record<string, unknown> | null = null;
        try {
          rec = await api.get<Record<string, unknown>>(`/attendance/${todayAttendance.id}`);
        } catch {
          try {
            const list = await api.get<Record<string, unknown>[]>("/me/attendance");
            if (Array.isArray(list)) {
              rec = list.find((item) => item.id === todayAttendance.id || item.uid === todayAttendance.id) || null;
            }
          } catch {
            // ignore
          }
        }
        if (!isMounted || !rec) return;
        const rawBreaks = rec.breaks ?? rec.attendanceBreaks ?? rec.breakList ?? rec.breakRecords ?? rec.activeBreak;
        let list: unknown[] = [];
        if (Array.isArray(rawBreaks)) list = rawBreaks;
        else if (rawBreaks && typeof rawBreaks === "object") list = [rawBreaks];

        if (list.length > 0) {
          const normalized = list.map((item) => {
            const b = item as Record<string, unknown>;
            return {
              ...b,
              id: String(b.id || b.uid || b.breakUid || ""),
              uid: (b.uid || b.id || b.breakUid) as string,
              breakIn: (b.breakIn || b.breakInTime || b.startTime || b.startedAt) as string,
              breakOut: (b.breakOut || b.breakOutTime || b.endTime || b.endedAt) as string,
              breakType: (b.breakType || b.type || "LUNCH") as string,
            };
          });
          setEssDetailedBreaks(normalized);
        }
      } catch {
        // ignore
      }
    };
    void loadBreaks();
    return () => { isMounted = false; };
  }, [api, todayAttendance?.id]);

  const activeBreaksList = useMemo(() => {
    if (Array.isArray(todayAttendance?.breaks) && todayAttendance.breaks.length > 0) {
      return todayAttendance.breaks;
    }
    if (essDetailedBreaks.length > 0) {
      return essDetailedBreaks;
    }
    return [];
  }, [todayAttendance?.breaks, essDetailedBreaks]);

  const calculatedTotalBreakMinutes = useMemo(() => {
    if (todayAttendance?.totalBreakMinutes && todayAttendance.totalBreakMinutes > 0) {
      return todayAttendance.totalBreakMinutes;
    }
    return activeBreaksList.reduce((acc, b) => {
      if (b.durationMinutes) return acc + b.durationMinutes;
      if (b.breakIn && b.breakOut) {
        const start = new Date(b.breakIn).getTime();
        const end = new Date(b.breakOut).getTime();
        if (end > start) return acc + Math.round((end - start) / 60000);
      }
      return acc;
    }, 0);
  }, [todayAttendance?.totalBreakMinutes, activeBreaksList]);

function formatHoursAndMinutes(hoursVal?: number | null): string {
  if (hoursVal == null || isNaN(hoursVal) || hoursVal <= 0) return "--";
  const totalMinutes = Math.round(hoursVal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

  const liveHoursToday = useMemo(() => {
    if (!todayAttendance?.clockIn) return null;
    if (todayAttendance.workedHours != null && todayAttendance.workedHours > 0) {
      return formatHoursAndMinutes(todayAttendance.workedHours);
    }
    const clockInMs = new Date(todayAttendance.clockIn).getTime();
    if (isNaN(clockInMs)) return null;

    const clockOutMs = todayAttendance.clockOut ? new Date(todayAttendance.clockOut).getTime() : Date.now();
    if (isNaN(clockOutMs) || clockOutMs <= clockInMs) return "0m";

    const grossMins = (clockOutMs - clockInMs) / 60000;
    const breakMins = calculatedTotalBreakMinutes || 0;
    const netMins = Math.max(0, grossMins - breakMins);
    return formatHoursAndMinutes(netMins / 60);
  }, [todayAttendance?.clockIn, todayAttendance?.clockOut, todayAttendance?.workedHours, calculatedTotalBreakMinutes]);

  const faceRequired = !!attendanceRules.data?.faceRecognitionRequired;
  const shouldShowLocationSelect = branches.data.length > 1;

  useEffect(() => {
    if (selectedLocationUid) return;
    if (profile.data?.locationUid) {
      setSelectedLocationUid(profile.data.locationUid);
      return;
    }
    if (branches.data.length > 0) {
      setSelectedLocationUid(branches.data[0].id);
    }
  }, [branches.data, profile.data?.locationUid, selectedLocationUid]);

  const resolveCurrentPosition = () =>
    new Promise<{ latitude: number | null; longitude: number | null; accuracy: number | null }>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ latitude: null, longitude: null, accuracy: null });
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
        () => {
          resolve({ latitude: null, longitude: null, accuracy: null });
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    });

  const punchIn = async (selfieDataUrl?: string) => {
    setPunchBusy(true);
    try {
      const currentPosition = await resolveCurrentPosition();
      const locationUid = selectedLocationUid || profile.data?.locationUid || branches.data[0]?.id || null;
      await attendance.punchIn(mode, {
        selfieDataUrl,
        locationUid,
        location: currentPosition.latitude != null ? {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
        } : undefined,
      });
      setFaceOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Punch in failed.";
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Attendance",
        message,
      });
    } finally {
      setPunchBusy(false);
    }
  };
  const raiseResignation = async () => {
    const employeeUid = profile.data?.id || profile.data?.uid;
    if (!employeeUid) {
      setExitError("Employee profile is not available.");
      return;
    }
    if (!exitForm.reason.trim()) {
      setExitError("Reason is required.");
      return;
    }
    setExitBusy(true);
    setExitError(null);
    try {
      await exits.raise({
        employeeUid,
        separationType: "Resignation",
        reason: exitForm.reason.trim(),
        noticePeriodDays: Number(exitForm.noticePeriodDays) || undefined,
      });
      setExitForm({ noticePeriodDays: "30", reason: "" });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Resignation Request",
        message: "Your resignation request has been submitted.",
      });
    } catch (error) {
      setExitError(error instanceof Error ? error.message : "Failed to raise resignation request.");
    } finally {
      setExitBusy(false);
    }
  };
  const currentRoute = ESS_ROUTES.find((item) => item.key === section) ?? ESS_ROUTES[0];
  const navItems = ESS_ROUTES.map((item) => ({
    ...item,
    to: item.route ? `/me/${item.route}` : "/me",
  }));
  const mainMobileSections: Section[] = ["attendance", "leave", "payslips", "profile"];
  const mainMobileNavItems = navItems.filter((item) => mainMobileSections.includes(item.key));
  const moreMobileNavItems = navItems.filter((item) => !mainMobileSections.includes(item.key));
  const isMoreSectionActive = !mainMobileSections.includes(section);
  const activeSectionItem = ESS_ROUTES.find((item) => item.key === section) ?? ESS_ROUTES[0];
  const railClassName = "hidden xl:block xl:flex-[0_0_32%] xl:pt-6";

  const snapshotItems = [
    {
      icon: Clock,
      label: "Today",
      value: todayAttendance?.clockOut ? "Completed" : todayAttendance?.clockIn ? "Checked in" : "Not punched in",
      detail: todayAttendance?.clockIn ? `In ${time(todayAttendance.clockIn)}` : "Awaiting first punch",
    },
    {
      icon: CalendarDays,
      label: "Leave Balance",
      value: String(activeBalances.reduce((sum, item) => sum + (item.available ?? 0), 0)),
      detail: `${activeBalances.length} active leave bucket${activeBalances.length === 1 ? "" : "s"}`,
    },
    {
      icon: Wallet,
      label: "Latest Payslip",
      value: payslips.data[0]
        ? payslips.data[0].month || formatDate(payslips.data[0].generatedAt) || "Available"
        : "Not available",
      detail: payslips.data[0]
        ? [
            payslips.data[0].netPay != null && payslips.data[0].netPay > 0
              ? formatCurrency(payslips.data[0].netPay)
              : null,
            payslips.data[0].status || "Generated",
          ]
            .filter(Boolean)
            .join(" · ")
        : "No generated statement yet",
    },
  ];
  const featuredRoutes = navItems.filter((item) => ["staffspace", "expenses", "helpdesk"].includes(item.key));
  const primaryServices = navItems.filter((item) => ["profile", "attendance", "leave", "documents", "payslips", "separation"].includes(item.key));
  const featureDescriptions: Record<string, string> = {
    staffspace: "Company announcements, policy updates and internal communication.",
    expenses: "Submit claims, review reimbursements and track approvals.",
    helpdesk: "Raise employee support requests and follow ticket updates.",
  };
  const documentRows = useMemo(
    () =>
      [...documents.data].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [documents.data],
  );
  const leaveColumns = useMemo<ColumnDef<(typeof leaves.data)[number]>[]>(
    () => [
      { key: "leaveTypeName", header: "Type", render: (item) => item.leaveTypeName ?? "--" },
      { key: "startDate", header: "From", render: (item) => formatDate(item.startDate) },
      { key: "endDate", header: "To", render: (item) => formatDate(item.endDate) },
      { key: "duration", header: "Duration", render: (item) => String(item.duration ?? "--") },
      { key: "status", header: "Status", render: (item) => item.status ?? "--" },
    ],
    [leaves.data],
  );
  const payslipColumns = useMemo<ColumnDef<(typeof payslips.data)[number]>[]>(
    () => [
      { key: "month", header: "Month", render: (item) => item.month ?? "--" },
      { key: "netPay", header: "Net Pay", align: "right", render: (item) => formatCurrency(item.netPay ?? 0) },
      { key: "status", header: "Status", render: (item) => item.status ?? "--" },
      { key: "generatedAt", header: "Generated", render: (item) => formatDate(item.generatedAt) },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (item) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Eye size={15} />}
            data-testid={`ess-payslip-view-${item.id}`}
            onClick={() => setSelectedPayslip(item)}
          >
            View
          </Button>
        ),
      },
    ],
    [payslips.data],
  );
  const essRequestedBalances = useMemo(() => {
    const employeeUid = profile.data?.id ?? profile.data?.uid;
    if (!employeeUid || !leaveApplyForm.type) return [];
    return activeBalances.filter((item) => {
      const leaveTypeName = (item.leaveTypeName || "").toLowerCase();
      const selectedType = leaveApplyForm.type.toLowerCase();
      return leaveTypeName === selectedType;
    });
  }, [activeBalances, leaveApplyForm.type, profile.data?.id, profile.data?.uid]);
  const essRequestedAvailable = useMemo(
    () => essRequestedBalances.reduce((sum, item) => sum + (item.available ?? 0), 0),
    [essRequestedBalances],
  );
  const essRequestedDuration = calcLeaveDays(
    leaveApplyForm.startDate,
    leaveApplyForm.endDate || leaveApplyForm.startDate,
    leaveApplyForm.isHalfDay,
  );
  const essShowInsufficientBalanceWarning =
    !!leaveApplyForm.leaveTypeUid && essRequestedDuration > 0 && essRequestedAvailable < essRequestedDuration;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => {
      const nextMode: ViewMode = media.matches ? "cards" : "table";
      setAttendanceViewMode(nextMode);
      setLeaveViewMode(nextMode);
      setDocumentViewMode(nextMode);
      setPayslipViewMode(nextMode);
    };
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

  useEffect(() => {
    if (!documentDialogOpen) {
      setSelectedDocument(null);
      setDocumentFiles([]);
      setDocumentSubmitError(null);
    }
  }, [documentDialogOpen]);

  const submitEssLeaveApply = async () => {
    const employeeUid = profile.data?.id ?? profile.data?.uid;
    const validationMessage = !employeeUid
      ? "Employee profile is unavailable."
      : !leaveApplyForm.leaveTypeUid
        ? "Select a leave type."
        : !leaveApplyForm.startDate
          ? "Select a start date."
          : !leaveApplyForm.reason.trim()
            ? "Enter a reason for the leave request."
            : null;
    if (validationMessage) {
      setLeaveApplyError(validationMessage);
      return;
    }

    setLeaveApplyBusy(true);
    setLeaveApplyError(null);
    try {
      const selectedLeaveType = leaveTypes.data.find(
        (type) => type.id === leaveApplyForm.leaveTypeUid || type.uid === leaveApplyForm.leaveTypeUid,
      );
      const leaveTypeName = selectedLeaveType?.name || leaveApplyForm.type || leaveApplyForm.leaveTypeUid;
      const endDate = leaveApplyForm.endDate || leaveApplyForm.startDate;
      const duration = calcLeaveDays(leaveApplyForm.startDate, endDate, leaveApplyForm.isHalfDay);
      await leaves.apply({
        employeeUid,
        leaveTypeUid: leaveApplyForm.leaveTypeUid,
        leaveTypeName,
        type: leaveTypeName,
        startDate: leaveApplyForm.startDate,
        endDate,
        isHalfDay: leaveApplyForm.isHalfDay,
        halfDayType: leaveApplyForm.isHalfDay ? leaveApplyForm.halfDayType : undefined,
        duration,
        reason: leaveApplyForm.reason,
        status: "Pending",
      });
      setLeaveApplyForm({
        leaveTypeUid: "",
        type: "",
        startDate: "",
        endDate: "",
        isHalfDay: false,
        halfDayType: "FIRST_HALF",
        reason: "",
      });
      setLeaveApplyOpen(false);
    } catch (error) {
      setLeaveApplyError(error instanceof Error ? error.message : "Failed to submit.");
    } finally {
      setLeaveApplyBusy(false);
    }
  };

  const openDocumentSubmit = (document: DocumentRequest) => {
    setSelectedDocument(document);
    setDocumentFiles([]);
    setDocumentSubmitError(null);
    setDocumentDialogOpen(true);
  };

  const openSubmittedDocument = async (filePathOrUrl?: string | null) => {
    try {
      const resolvedUrl = await documents.resolveDocumentUrl(filePathOrUrl);
      if (!resolvedUrl) {
        setDocumentSubmitError("Document file is unavailable.");
        return;
      }
      window.open(resolvedUrl, "_blank", "noreferrer");
    } catch (error) {
      setDocumentSubmitError(error instanceof Error ? error.message : "Unable to open document.");
    }
  };

  const submitEmployeeDocument = async () => {
    const uid = selectedDocument?.uid || selectedDocument?.id;
    const employeeUid = profile.data?.id ?? profile.data?.uid;
    if (!uid) {
      setDocumentSubmitError("Document request id is missing.");
      return;
    }
    if (!employeeUid) {
      setDocumentSubmitError("Employee id is missing.");
      return;
    }
    if (!documentFiles[0]) {
      setDocumentSubmitError("Document file is required.");
      return;
    }

    setDocumentSubmitBusy(true);
    setDocumentSubmitError(null);
    try {
      const attachment = await documents.uploadFile(employeeUid, documentFiles[0]);
      await documents.update(uid, {
        documentType: selectedDocument?.documentType,
        attachment,
        status: "SUBMITTED",
      });
      setDocumentDialogOpen(false);
    } catch (error) {
      setDocumentSubmitError(error instanceof Error ? error.message : "Failed to submit document.");
    } finally {
      setDocumentSubmitBusy(false);
    }
  };

  return (
    <section id="hr-ess-page" data-testid="hr-ess-page" className="page-section active hr-page-shell">
      {faceOpen && (
        <Suspense fallback={null}>
          <FaceCaptureModal
            title="Verify Face to Punch In"
            subtitle={profile.data?.name}
            busy={punchBusy}
            onCapture={(_descriptor, selfieDataUrl) => punchIn(selfieDataUrl)}
            onClose={() => setFaceOpen(false)}
          />
        </Suspense>
      )}
      <div style={pageStack}>
        <div style={contentPanel} className="ess-mobile-unified-card">
          <div className="ess-mobile-hero overflow-hidden rounded-t-2xl rounded-b-none border border-slate-200 bg-white shadow-sm">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_22%),radial-gradient(circle_at_75%_20%,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(135deg,#fff8ef_0%,#f4fbff_48%,#eefbf6_100%)] px-6 py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Employee Self-Service</div>
                  <h1 className="mt-3 text-[24px] font-black tracking-tight text-slate-950 md:text-[27px] lg:text-[30px]">
                    Hi {getUserDisplayName(profile.data?.name)},
                  </h1>
                  <p className="mt-3 text-[13px] leading-6 text-slate-600 md:text-[14px] md:leading-6 lg:text-[15px] lg:leading-7">
                    {getTimeBasedGreeting()}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 max-sm:hidden">
                  <div className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)] backdrop-blur">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Employee ID</div>
                    <div className="mt-2 text-base font-black text-slate-950 md:text-[17px] lg:text-lg">{profile.data?.employeeId ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)] backdrop-blur">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Department</div>
                    <div className="mt-2 text-base font-black text-slate-950 md:text-[17px] lg:text-lg">{profile.data?.department ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)] backdrop-blur">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Designation</div>
                    <div className="mt-2 text-base font-black text-slate-950 md:text-[17px] lg:text-lg">{profile.data?.designation ?? "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="hidden flex-wrap gap-2 rounded-b-xl rounded-t-none border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur md:flex">
            {navItems.map((item) => (
              <NavLink
                data-testid={`hr-ess-nav-${item.key}`}
                key={item.key}
                to={item.to}
                end={item.key === "attendance"}
                className={({ isActive }) =>
                  [
                    "inline-flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all",
                    isActive
                      ? "bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white shadow-[0_10px_20px_rgba(15,118,110,0.22)]"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-slate-900",
                  ].join(" ")
                }
              >
                <item.Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ess-mobile-content flex flex-col gap-6 xl:flex-row xl:items-stretch">
            <div className="ess-mobile-main min-w-0 flex-1">


              {section === "profile" && (
                <Panel loading={profile.loading} error={profile.error} className="mt-2 lg:mt-6">
                  <div className="flex flex-col gap-6">
                    <div className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbfb_52%,#eef6ff_100%)] p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#d1fae5_0%,#e0f2fe_100%)] text-xl font-black text-emerald-800 shadow-sm md:h-18 md:w-18 md:text-2xl lg:h-20 lg:w-20">
                            {(profile.data?.name || "E").trim().charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Employee Profile</div>
                            <h2 className="mt-2 text-[21px] font-black tracking-tight text-slate-950 md:text-[23px] lg:text-[24px]">
                              {[humanizeProfileValue(profile.data?.salutation), profile.data?.name ?? "-"].filter((value) => value && value !== "--").join(" ")}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-600 md:text-[13px] lg:text-sm">
                              <span className="rounded-md bg-white/80 px-3 py-1 font-semibold shadow-sm">{profile.data?.designation ?? "Designation pending"}</span>
                              <span className="rounded-md bg-white/80 px-3 py-1 font-semibold shadow-sm">{profile.data?.department ?? "Department pending"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ProfileStat label="Status" value={humanizeProfileValue(profile.data?.status)} />
                          <ProfileStat label="Employment Type" value={humanizeProfileValue(profile.data?.employmentType)} />
                        </div>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
                      <ProfileField label="Email" value={profile.data?.email} className="col-span-2 lg:col-span-2" />
                      <ProfileField label="Contact Number" value={profile.data?.contactNumber} className="col-span-2 sm:col-span-1" />
                      <ProfileField label="Gender" value={humanizeProfileValue(profile.data?.gender)} />
                      <ProfileField label="Date of Birth" value={formatDate(profile.data?.dob)} />
                      <ProfileField label="Date of Joining" value={formatDate(profile.data?.doj)} />
                      <ProfileField label="Location" value={profile.data?.locationName} />
                      <ProfileField label="Auth Access" value={profile.data?.isSystemUser || profile.data?.loginId || profile.data?.role ? "Enabled" : "Not available"} className="col-span-2 lg:col-span-1" />
                      <ProfileField label="Bank Name" value={profile.data?.bankDetails?.bankName} />
                      <ProfileField label="Account Number" value={profile.data?.bankDetails?.accountNumber} />
                      <ProfileField label="IFSC Code" value={profile.data?.bankDetails?.ifscCode} />
                    </dl>
                  </div>
                </Panel>
              )}

              {section === "attendance" && (
                <Panel loading={attendance.loading} error={attendance.error} className="mt-2 lg:mt-6">
                  <div className="flex flex-col gap-6">
                      <div className={`${todayAttendance?.clockIn ? "order-1" : "order-2"} grid gap-4 sm:order-1 sm:grid-cols-2 xl:grid-cols-4`}>
                      <AttendanceMetricCard
                        icon={Clock}
                        label="Today Status"
                        value={todayAttendance?.clockOut ? "Completed" : todayAttendance?.clockIn ? "Checked in" : "Awaiting punch"}
                        detail={todayAttendance?.clockIn ? `In ${time(todayAttendance.clockIn)}` : "No check-in yet"}
                        tone="emerald"
                      />
                      <AttendanceMetricCard
                        icon={Timer}
                        label="Hours Today"
                        value={liveHoursToday ?? "--"}
                        detail={todayAttendance?.clockOut ? "Session closed" : todayAttendance?.clockIn ? "Live shift running" : "Starts after punch in"}
                        tone="sky"
                      />
                      <AttendanceMetricCard
                        icon={History}
                        label="This Week"
                        value={formatHoursAndMinutes(
                          attendance.data
                            .filter((item) => item.dateStr && new Date(item.dateStr) >= startOfWeek(today))
                            .reduce((sum, item) => sum + (item.workedHours ?? 0), 0)
                        )}
                        detail={`${attendance.data.filter((item) => item.dateStr && new Date(item.dateStr) >= startOfWeek(today) && item.clockIn).length} logged day(s)`}
                        tone="amber"
                      />
                      <AttendanceMetricCard
                        icon={CalendarDays}
                        label="Break Time"
                        value={formatMinutes(calculatedTotalBreakMinutes)}
                        detail={activeBreaksList.length ? `${activeBreaksList.length} recorded break(s)` : "No breaks recorded"}
                        tone="violet"
                      />
                    </div>

                    <div className={`${todayAttendance?.clockIn ? "order-2" : "order-1"} grid gap-5 sm:order-2 xl:grid-cols-[1.15fr_0.85fr]`}>
                      <SectionCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbfb_52%,#eef6ff_100%)] shadow-sm max-sm:!border-0 max-sm:!bg-transparent max-sm:!p-0 max-sm:!shadow-none">
                        <div className="flex flex-col gap-6">
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm sm:h-20 sm:w-20">
                              <Clock className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">Attendance Console</div>
                              <div className="mt-1.5 font-mono text-[18px] font-black tracking-tight text-slate-950 md:text-[20px] lg:text-[22px]">
                                {todayAttendance?.clockIn && !todayAttendance?.clockOut
                                  ? new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })
                                  : "--:--:--"}
                              </div>
                              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
                                <span className={`h-2 w-2 rounded-full ${todayAttendance?.clockIn && !todayAttendance?.clockOut ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {todayAttendance?.clockIn && !todayAttendance?.clockOut ? "On Duty" : "Off Duty"}
                              </div>
                            </div>
                            </div>
                          </div>

                            <div className="grid gap-4 border-t border-slate-200/80 pt-5">
                              <div className={`grid gap-4 ${shouldShowLocationSelect ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
                                <Select
                                  id="ess-attendance-work-mode"
                                  testId="ess-attendance-work-mode"
                                  label="Work mode"
                                  value={mode}
                                  onChange={(event) => setMode(event.target.value)}
                                  options={["Office", "WFH", "On Duty"].map((value) => ({ value, label: value }))}
                                />
                                {shouldShowLocationSelect ? (
                                  <Select
                                    id="ess-attendance-location"
                                    testId="ess-attendance-location"
                                    label="Location"
                                    value={selectedLocationUid}
                                    onChange={(event) => setSelectedLocationUid(event.target.value)}
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
                              </div>
                              {!todayAttendance?.clockIn ? (
                                <Button
                                  data-testid="ess-attendance-punch-in"
                                  onClick={() => (faceRequired ? setFaceOpen(true) : void punchIn())}
                                  disabled={punchBusy}
                                  className="h-11 w-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800"
                                >
                                  Punch In
                                </Button>
                              ) : !todayAttendance.clockOut ? (
                                <div className="space-y-3">
                                  <AttendanceBreakManager
                                    attendanceUid={todayAttendance.id}
                                    employeeUid={profile.data?.id || todayAttendance.employeeUid}
                                    breaks={activeBreaksList}
                                    isPunchedIn={!!todayAttendance.clockIn}
                                    isPunchedOut={!!todayAttendance.clockOut}
                                    onStartBreak={(breakType, opts) =>
                                      attendance.startBreak(
                                        opts?.attendanceUid || todayAttendance.id,
                                        breakType,
                                        opts?.employeeUid || profile.data?.id || todayAttendance.employeeUid,
                                        opts?.breakIn
                                      )
                                    }
                                    onEndBreak={(breakUid, breakOutIso, opts) =>
                                      attendance.endBreak(
                                        opts?.attendanceUid || todayAttendance.id,
                                        breakUid,
                                        breakOutIso,
                                        opts?.employeeUid || profile.data?.id || todayAttendance.employeeUid,
                                        opts?.breakType
                                      )
                                    }
                                    onBreakStateChange={setIsOnBreak}
                                    compact
                                  />

                                  <Button
                                    data-testid="ess-attendance-punch-out"
                                    onClick={() => void attendance.punchOut(todayAttendance.id)}
                                    disabled={punchBusy || isOnBreak}
                                    className={`h-11 w-full text-white shadow-sm ${
                                      isOnBreak
                                        ? "bg-slate-300 cursor-not-allowed text-slate-500 hover:bg-slate-300"
                                        : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                                    }`}
                                    title={isOnBreak ? "End active break before punching out" : undefined}
                                  >
                                    Punch Out
                                  </Button>
                                  {isOnBreak ? (
                                    <p className="text-center text-xs font-medium text-amber-700">
                                      Please end your active break before punching out.
                                    </p>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                                  Today&apos;s attendance is completed.
                                </div>
                              )}
                            </div>
                          </div>

                        <div className="mt-6 grid gap-3 border-t border-slate-200/80 pt-5 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Face Recognition</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 md:text-[15px] lg:text-base">{faceRequired ? "Required" : "Optional"}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">First In</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 md:text-[15px] lg:text-base">{time(todayAttendance?.clockIn)}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Last Out</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 md:text-[15px] lg:text-base">{time(todayAttendance?.clockOut)}</div>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard className="border-slate-200 shadow-sm">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Today&apos;s Timeline</div>
                          <h3 className="mt-1.5 text-[22px] font-black tracking-tight text-slate-950 md:text-[24px] lg:text-[24px]">{formatDate(today)}</h3>
                        </div>
                        {todayAttendance ? (
                          <div className="mt-4 space-y-2.5">
                            <AttendanceTimelineRow label="Clock In" value={time(todayAttendance.clockIn)} detail={todayAttendance.clockInType ?? "Office"} />
                            {activeBreaksList.length > 0 ? (
                              activeBreaksList.map((b, idx) => {
                                const type = (b.breakType || (b as Record<string, unknown>).type || "LUNCH") as string;
                                const opt = BREAK_TYPE_OPTIONS.find((o) => o.value === type) || BREAK_TYPE_OPTIONS[0];
                                const inStr = time(b.breakIn);
                                const outStr = b.breakOut ? time(b.breakOut) : "Active";
                                const dur = b.durationMinutes ? `${b.durationMinutes} mins` : (b.breakIn && b.breakOut ? `${calculateDurationMinutes(b.breakIn, b.breakOut)} mins` : "In Progress");
                                return (
                                  <AttendanceTimelineRow
                                    key={b.uid || b.id || idx}
                                    label={`${opt.icon} ${opt.label}`}
                                    value={`${inStr} – ${outStr}`}
                                    detail={`${dur} (${opt.description})`}
                                  />
                                );
                              })
                            ) : null}
                            <AttendanceTimelineRow label="Clock Out" value={time(todayAttendance.clockOut)} detail={todayAttendance.clockOut ? "Shift completed" : "Still active"} />
                            <AttendanceTimelineRow label="Worked Hours" value={liveHoursToday ?? (todayAttendance.workedHours != null ? formatHoursAndMinutes(todayAttendance.workedHours) : "--")} detail={todayAttendance.status ?? "Present"} />
                          </div>
                        ) : (
                          <EmptyState
                            title="No attendance activity recorded for today"
                            description="Clock in or set your work mode to begin tracking today's shift."
                            className="py-8 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl"
                          />
                        )}
                      </SectionCard>
                    </div>

                    <SectionCard className="order-3 border-slate-200 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div className="hidden md:block">
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">History</div>
                          <h3 className="mt-2 text-[17px] font-black tracking-tight text-slate-950 md:text-[19px] lg:text-[20px]">
                            Recent Attendance Logs ({sortedAttendance.length})
                          </h3>
                          <p className="mt-1 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">Daily check-in, check-out, work mode and worked hours.</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
                          <AttendanceViewToggle value={attendanceViewMode} onChange={setAttendanceViewMode} />
                        </div>
                      </div>
                      <div className="mt-5">
                        {attendanceViewMode === "table" ? (
                          <SimpleTable
                            headers={["Date", "Effective Shift", "In", "Out", "Mode", "Hours", "Status"]}
                            rows={sortedAttendance.map((item) => [
                              item.dateStr ? formatDate(item.dateStr) : "--",
                              item.noShiftAssigned || item.shiftResolutionSource?.toUpperCase() === "NONE"
                                ? "No shift assigned"
                                : item.effectiveShiftName || item.shiftName || "--",
                              time(item.clockIn),
                              time(item.clockOut),
                              item.clockInType ?? "--",
                              item.workedHours != null && item.workedHours > 0 ? formatHoursAndMinutes(item.workedHours, item.workedMinutes, item.workedHoursFormatted) : "--",
                              item.status ?? "--",
                            ])}
                          />
                        ) : sortedAttendance.length === 0 ? (
                          <EmptyState
                            title="No attendance records found"
                            description="Your historical shift logs and check-in times will appear here."
                            className="py-10 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl"
                          />
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {sortedAttendance.map((item, index) => (
                              <AttendanceHistoryCard
                                key={item.id || `${item.dateStr ?? "attendance"}-${index}`}
                                date={item.dateStr ? formatDate(item.dateStr) : "--"}
                                clockIn={time(item.clockIn)}
                                clockOut={time(item.clockOut)}
                                mode={item.clockInType ?? "--"}
                                hours={item.workedHours != null && item.workedHours > 0 ? formatHoursAndMinutes(item.workedHours, item.workedMinutes, item.workedHoursFormatted) : "--"}
                                status={item.status ?? "--"}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                </Panel>
              )}

              {section === "leave" && (
                <Panel loading={leaves.loading || balances.loading} error={leaves.error || balances.error} className="mt-2 lg:mt-6">
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activeBalances.map((item) => (
                      <SectionCard key={item.id} className="border-slate-200 shadow-sm">
                        <div className="text-[12px] text-slate-500 md:text-[13px] lg:text-sm">{item.leaveTypeName ?? "Leave"}</div>
                        <div className="mt-1 text-[19px] font-bold md:text-[21px] lg:text-2xl">{item.available ?? 0}</div>
                        <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
                      </SectionCard>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="hidden md:block">
                      <h3 className="text-[19px] font-black tracking-tight text-slate-950 md:text-[21px] lg:text-[20px]">
                        Leave requests ({leaves.data.length})
                      </h3>
                      <p className="mt-1 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">Recent leave history with balances and approval status.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
                      <Button
                        data-testid="ess-leave-apply-open"
                        onClick={() => {
                          setLeaveApplyError(null);
                          setLeaveApplyOpen(true);
                        }}
                        className="bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90"
                      >
                        <Plus size={16} /> Apply for Leave
                      </Button>
                      <AttendanceViewToggle value={leaveViewMode} onChange={setLeaveViewMode} />
                    </div>
                  </div>
                  <div className="mt-5">
                    {leaveViewMode === "table" ? (
                      <DataTable
                        data={leaves.data}
                        columns={leaveColumns}
                        getRowId={(item) => item.id}
                        data-testid="ess-leave-table"
                      />
                    ) : leaves.data.length === 0 ? (
                      <EmptyState
                        title="No leave records found"
                        description="Applied leave requests and balances will appear here."
                        className="py-10 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl"
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {leaves.data.map((item, index) => (
                          <LeaveHistoryCard
                            key={item.id || `${item.startDate ?? "leave"}-${index}`}
                            type={item.leaveTypeName ?? "--"}
                            from={formatDate(item.startDate)}
                            to={formatDate(item.endDate)}
                            duration={String(item.duration ?? "--")}
                            status={item.status ?? "--"}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {section === "documents" && (
                <Panel loading={documents.loading} error={documents.error} className="mt-2 lg:mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="hidden md:block">
                      <h3 className="text-[19px] font-black tracking-tight text-slate-950 md:text-[21px] lg:text-[20px]">
                        My Documents ({documentRows.length})
                      </h3>
                      <p className="mt-1 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">Documents requested by your company and the submission status for each one.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
                      <AttendanceViewToggle value={documentViewMode} onChange={setDocumentViewMode} />
                    </div>
                  </div>
                  <div className="mt-5">
                    {documentRows.length === 0 ? (
                      <EmptyState
                        title="No document requests found"
                        description="Documents requested by your organization will appear here."
                        className="py-10 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl"
                      />
                    ) : documentViewMode === "table" ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-[13px] md:text-[14px] lg:text-base">
                          <thead>
                            <tr>
                              <th className="border-b px-3 py-3 text-[12px] uppercase text-slate-500 md:text-[13px] lg:text-sm">Document</th>
                              <th className="border-b px-3 py-3 text-[12px] uppercase text-slate-500 md:text-[13px] lg:text-sm">Status</th>
                              <th className="border-b px-3 py-3 text-[12px] uppercase text-slate-500 md:text-[13px] lg:text-sm">Updated</th>
                              <th className="border-b px-3 py-3 text-right text-[12px] uppercase text-slate-500 md:text-[13px] lg:text-sm">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documentRows.map((item, index) => {
                              const status = (item.status || "REQUESTED").toUpperCase();
                              const documentFilePath = item.attachment?.filePath || item.documentUrl;
                              const actionLabel = documentFilePath ? "View" : status === "VERIFIED" ? "Verified" : "Submit";
                              return (
                                <tr key={item.id || `${item.documentType ?? "document"}-${index}`}>
                                  <td className="border-b px-3 py-4 font-semibold text-slate-950">{item.documentType || "Document"}</td>
                                  <td className="border-b px-3 py-4">
                                    <EssStatusBadge status={status} />
                                  </td>
                                  <td className="border-b px-3 py-4 text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</td>
                                  <td className="border-b px-3 py-4 text-right">
                                    <div className="inline-flex gap-2">
                                      {documentFilePath ? (
                                        <button
                                          type="button"
                                          onClick={() => void openSubmittedDocument(documentFilePath)}
                                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                        >
                                          {actionLabel}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openDocumentSubmit(item)}
                                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                        >
                                          {actionLabel}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {documentRows.map((item, index) => {
                          const status = (item.status || "REQUESTED").toUpperCase();
                          const documentFilePath = item.attachment?.filePath || item.documentUrl;
                          return (
                            <DocumentRequestCard
                              key={item.id || `${item.documentType ?? "document"}-${index}`}
                              title={item.documentType || "Document"}
                              status={status}
                              updated={formatDate(item.updatedAt || item.createdAt)}
                              hasFile={!!documentFilePath}
                              onView={documentFilePath ? () => void openSubmittedDocument(documentFilePath) : undefined}
                              onSubmit={!documentFilePath ? () => openDocumentSubmit(item) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}
                    <DataTablePagination
                      testId="ess-documents-pagination"
                      page={documentPage}
                      pageSize={documentPageSize}
                      total={documents.totalElements}
                      onChange={setDocumentPage}
                      onPageSizeChange={(size) => {
                        setDocumentPageSize(size);
                        setDocumentPage(1);
                      }}
                    />
                  </div>
                </Panel>
              )}

              {section === "payslips" && (
                <Panel loading={payslips.loading} error={payslips.error} className="mt-2 lg:mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="hidden md:block">
                      <h3 className="text-[19px] font-black tracking-tight text-slate-950 md:text-[21px] lg:text-[20px]">
                        Payslip statements ({payslips.data.length})
                      </h3>
                      <p className="mt-1 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">Generated salary statements and payout status.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
                      <AttendanceViewToggle value={payslipViewMode} onChange={setPayslipViewMode} />
                    </div>
                  </div>
                  <div className="mt-5">
                    {payslips.data.length === 0 ? (
                      <EmptyState
                        title="No payslip statements found"
                        description="Generated monthly payslips and payout statements will appear here."
                        className="py-10 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl"
                      />
                    ) : payslipViewMode === "table" ? (
                      <DataTable
                        data={payslips.data}
                        columns={payslipColumns}
                        getRowId={(item) => item.id || item.uid || item.month || "payslip"}
                        data-testid="ess-payslips-table"
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {payslips.data.map((item, index) => (
                          <PayslipCard
                            key={item.id || `${item.month ?? "payslip"}-${index}`}
                            month={item.month ?? "--"}
                            netPay={formatCurrency(item.netPay ?? 0)}
                            status={item.status ?? "--"}
                            generated={formatDate(item.generatedAt)}
                            onView={() => setSelectedPayslip(item)}
                            testId={`ess-payslip-view-card-${item.id}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>
              )}

              {section === "staffspace" && (
                <SectionCard className="mt-2 border-slate-200 shadow-sm lg:mt-6">
                  <Announcements />
                </SectionCard>
              )}

              {section === "expenses" && (
                <SectionCard className="mt-2 border-slate-200 shadow-sm lg:mt-6">
                  <Expenses />
                </SectionCard>
              )}
              <PayslipStatementDialog
                payslip={selectedPayslip}
                employee={profile.data}
                employeeName={profile.data?.name}
                onClose={() => setSelectedPayslip(null)}
              />

              {section === "separation" && (
                <SectionCard className="mt-2 border-slate-200 shadow-sm lg:mt-6">
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">Raise Exit Request</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Submit a resignation request for review by HR.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        id="ess-separation-type"
                        data-testid="ess-separation-type"
                        label="Separation Type"
                        value="Resignation"
                        readOnly
                      />
                      <Input
                        id="ess-separation-notice-days"
                        data-testid="ess-separation-notice-days"
                        label="Notice Period (days)"
                        type="number"
                        min={0}
                        value={exitForm.noticePeriodDays}
                        onChange={(event) => setExitForm((current) => ({ ...current, noticePeriodDays: event.target.value }))}
                      />
                    </div>
                    <Textarea
                      id="ess-separation-reason"
                      data-testid="ess-separation-reason"
                      label="Reason"
                      rows={4}
                      value={exitForm.reason}
                      onChange={(event) => setExitForm((current) => ({ ...current, reason: event.target.value }))}
                      placeholder="Share the reason for your resignation..."
                    />
                    {exitError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exitError}</div>}
                    <div className="flex justify-end">
                      <Button
                        id="ess-separation-submit"
                        data-testid="ess-separation-submit"
                        icon={<LogOut size={16} />}
                        loading={exitBusy}
                        disabled={exitBusy}
                        onClick={() => void raiseResignation()}
                      >
                        Raise Exit Request
                      </Button>
                    </div>
                    <div className="border-t border-slate-200 pt-5">
                      <h3 className="text-sm font-black text-slate-900">My Exit Requests</h3>
                      {exits.loading ? (
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading requests...</div>
                      ) : exits.data.filter((item) => item.employeeUid === (profile.data?.id || profile.data?.uid)).length === 0 ? (
                        <EmptyState
                          title="No exit requests submitted"
                          description="Submitted resignation requests will appear here."
                          className="py-8 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl"
                        />
                      ) : (
                        <div className="mt-3 space-y-2">
                          {exits.data
                            .filter((item) => item.employeeUid === (profile.data?.id || profile.data?.uid))
                            .map((item) => (
                              <div
                                key={item.id}
                                id={`ess-exit-item-${item.id}`}
                                data-testid={`ess-exit-item-${item.id}`}
                                onClick={async () => {
                                  setExitDetailLoading(true);
                                  try {
                                    const details = await exits.getExitDetails(item.id || item.uid || "");
                                    setSelectedExitDetail(details);
                                  } catch {
                                    setSelectedExitDetail(item);
                                  } finally {
                                    setExitDetailLoading(false);
                                  }
                                }}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{item.separationType || "Resignation"}</div>
                                  <div className="mt-1 text-xs text-slate-500">{item.reason || "No reason provided"}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{(item.status || "Pending").replaceAll("_", " ")}</span>
                                  <span className="text-xs font-bold text-teal-600 hover:underline">View Details →</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )}

              {section === "memos" && (
                <SectionCard className="mt-2 border-slate-200 shadow-sm lg:mt-6">
                  <EssMemos />
                </SectionCard>
              )}

              {section === "helpdesk" && (
                <SectionCard className="mt-2 border-slate-200 shadow-sm lg:mt-6">
                  <Tickets />
                </SectionCard>
              )}
            </div>

            <aside className={`${railClassName} xl:self-stretch`}>
              <SectionCard className="h-full rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                <div>
                  <h2 className="text-[18px] font-black tracking-tight text-slate-950 md:text-[19px] lg:text-[20px]">Today at a glance</h2>
                  <p className="mt-2 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">A quick summary of your current HR status.</p>
                </div>
                <div className="mt-6 space-y-3">
                  {snapshotItems.map((item) => (
                    <div key={item.label} className="rounded-xl border border-white bg-white/90 px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700 shadow-sm">
                          <item.icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:text-[13px]">{item.label}</div>
                          <div className="mt-1 text-[16px] font-black leading-none text-slate-900 md:text-[17px] lg:text-[18px]">{item.value}</div>
                          <div className="mt-1 truncate text-[11px] text-slate-500 md:text-[12px] lg:text-[13px]">{item.detail}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>
      </div>
      <Dialog
        open={!!selectedExitDetail}
        onClose={() => setSelectedExitDetail(null)}
        title="Exit Request Details"
        size="md"
        testId="ess-exit-detail-modal"
      >
        {selectedExitDetail && (
          <div className="grid gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">{selectedExitDetail.separationType || "Resignation"}</h4>
                <div className="mt-0.5 text-xs text-slate-500">
                  Employee: {selectedExitDetail.employeeName || profile.data?.name || "Self"}
                </div>
              </div>
              <EssStatusBadge status={selectedExitDetail.status || "Pending"} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Notice Period</div>
                <div className="mt-1 text-sm font-black text-slate-900">
                  {selectedExitDetail.noticePeriodDays ?? "—"} Days
                  {selectedExitDetail.noticeWaivedDays ? ` (−${selectedExitDetail.noticeWaivedDays} waived)` : ""}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Last Working Day</div>
                <div className="mt-1 text-sm font-black text-slate-900">
                  {formatDate(selectedExitDetail.lastWorkingDay) || "—"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Clearance Status</div>
                <div className="mt-1 text-sm font-black text-slate-900">
                  {selectedExitDetail.clearanceStatus || "Pending"}
                </div>
              </div>
            </div>

            {selectedExitDetail.reason && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Reason for Separation</div>
                <div className="mt-1 text-xs font-semibold text-slate-800 italic">
                  "{selectedExitDetail.reason}"
                </div>
              </div>
            )}

            {selectedExitDetail.clearances && selectedExitDetail.clearances.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">Department Clearances</div>
                <div className="grid gap-2">
                  {selectedExitDetail.clearances.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold">
                      <span className="text-slate-900">{c.departmentName}</span>
                      <EssStatusBadge status={c.status || "Pending"} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedExitDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={documentDialogOpen}
        onClose={() => setDocumentDialogOpen(false)}
        title="Submit Document"
        size="md"
      >
        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Requested Document</div>
            <div className="mt-2 text-[15px] font-bold text-slate-950">{selectedDocument?.documentType || "--"}</div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Document</label>
            <FileUpload
              onUpload={setDocumentFiles}
              multiple={false}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              testId="ess-documents-submit-file-upload"
              id="ess-documents-submit-file-upload"
            />
          </div>
          {documentSubmitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {documentSubmitError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void submitEmployeeDocument()} loading={documentSubmitBusy} disabled={documentSubmitBusy}>
              Submit Document
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={leaveApplyOpen}
        onClose={() => setLeaveApplyOpen(false)}
        closeOnOutsideClick={false}
        testId="ess-leave-apply-modal"
        hideHeader
        contentClassName="h-[100dvh] w-screen max-w-none rounded-none p-0 overflow-y-auto sm:h-auto sm:w-[calc(100vw-2rem)] sm:max-w-[900px] sm:rounded-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-start justify-between border-b border-[rgba(17,94,89,0.1)] bg-[rgba(17,94,89,0.05)] px-5 py-5 sm:px-8 sm:py-6">
          <div>
            <h3 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.6px", color: "#0f766e", margin: 0 }}>Apply for Leave</h3>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-color)", opacity: 0.8, margin: "4px 0 0" }}>Submit your absence request from the employee portal.</p>
          </div>
          <button
            type="button"
            onClick={() => setLeaveApplyOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:gap-7 md:p-7">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</label>
              <div className="flex h-12 items-center rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-900">
                {profile.data?.name ?? "Employee"}
              </div>
            </div>
            <Select
              id="ess-leave-type"
              testId="ess-leave-type"
              label="Leave Type"
              value={leaveApplyForm.leaveTypeUid}
              onChange={(e) => {
                const selectedLeaveType = assignedLeaveTypes.find((type) => type.id === e.target.value || type.uid === e.target.value);
                setLeaveApplyForm((current) => ({ ...current, leaveTypeUid: e.target.value, type: selectedLeaveType?.name || "" }));
              }}
              placeholder={leaveTypes.loading || balances.loading ? "Loading assigned leave types" : "Select leave type"}
              options={assignedLeaveTypes.map((type) => ({ value: type.id, label: type.name || type.id }))}
            />
            {!leaveTypes.loading && !balances.loading && assignedLeaveTypes.length === 0 && (
              <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", color: "#b45309", fontSize: 12, fontWeight: 700 }}>
                No leave types are currently assigned to you.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePicker
                id="ess-leave-start-date"
                data-testid="ess-leave-start-date"
                label="Start Date"
                value={leaveApplyForm.startDate}
                onChange={(e) => setLeaveApplyForm((current) => ({ ...current, startDate: e.target.value }))}
              />
              <DatePicker
                id="ess-leave-end-date"
                data-testid="ess-leave-end-date"
                label="End Date"
                value={leaveApplyForm.endDate}
                onChange={(e) => setLeaveApplyForm((current) => ({ ...current, endDate: e.target.value }))}
              />
            </div>
            {leaveApplyForm.startDate && (!leaveApplyForm.endDate || leaveApplyForm.startDate === leaveApplyForm.endDate) && (
              <div className="space-y-2">
                <label style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(100,116,139,0.06)", padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, color: "var(--dark-text)" }}>
                  <input
                    id="ess-leave-half-day"
                    data-testid="ess-leave-half-day"
                    type="checkbox"
                    checked={leaveApplyForm.isHalfDay}
                    onChange={(e) => setLeaveApplyForm((current) => ({ ...current, isHalfDay: e.target.checked }))}
                  /> Apply as Half Day (0.5 days)
                </label>

                {leaveApplyForm.isHalfDay && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Half-Day Session</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="ess-leave-half-day-first"
                        data-testid="ess-leave-half-day-first"
                        onClick={() => setLeaveApplyForm((f) => ({ ...f, halfDayType: "FIRST_HALF" }))}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          leaveApplyForm.halfDayType === "FIRST_HALF"
                            ? "bg-teal-50 border-2 border-teal-600 text-teal-800"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        First Half
                      </button>
                      <button
                        type="button"
                        id="ess-leave-half-day-second"
                        data-testid="ess-leave-half-day-second"
                        onClick={() => setLeaveApplyForm((f) => ({ ...f, halfDayType: "SECOND_HALF" }))}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          leaveApplyForm.halfDayType === "SECOND_HALF"
                            ? "bg-teal-50 border-2 border-teal-600 text-teal-800"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        Second Half
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {leaveApplyForm.startDate && (
              <div style={{ background: "rgba(17,94,89,0.05)", border: "1px solid rgba(17,94,89,0.1)", padding: 16, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Total Days Count</span>
                <span style={{ background: "var(--primary-color)", color: "white", fontWeight: 900, fontSize: 12, padding: "4px 12px", borderRadius: 999 }}>
                  {essRequestedDuration} Days
                </span>
              </div>
            )}
            {essShowInsufficientBalanceWarning && (
              <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", padding: 14, borderRadius: 14, color: "#92400e", fontSize: 12.5, fontWeight: 700, lineHeight: 1.45 }}>
                You have insufficient balance for this leave type. Your manager may approve this as Loss of Pay or reject it.
              </div>
            )}
            <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, padding: 16, display: "flex", gap: 14 }}>
              <div style={{ height: 40, width: 40, borderRadius: 12, background: "rgba(99,102,241,0.1)", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Info size={20} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#4338ca", lineHeight: 1.5, margin: 0 }}>
                Leave balances are real-time and auto-deducted once the request is reviewed and approved.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Textarea
              id="ess-leave-reason"
              data-testid="ess-leave-reason"
              label="Detailed Statement / Reason"
              placeholder="Share a short note detailing the cause of your request..."
              value={leaveApplyForm.reason}
              onChange={(e) => setLeaveApplyForm((current) => ({ ...current, reason: e.target.value }))}
              rows={6}
            />
          </div>
        </div>
        {leaveApplyError && (
          <div className="mx-5 rounded-xl border border-[rgba(244,63,94,0.18)] bg-[rgba(244,63,94,0.06)] px-3.5 py-2.5 text-[13px] text-[#e11d48] sm:mx-7">
            {leaveApplyError}
          </div>
        )}
        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[var(--border-color)] bg-[var(--app-bg)] p-5 sm:flex-row sm:justify-end sm:px-7">
          <Button data-testid="ess-leave-apply-close" className="w-full sm:w-auto" variant="outline" onClick={() => setLeaveApplyOpen(false)}>Close</Button>
          <Button data-testid="ess-leave-apply-submit" className="w-full bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90 sm:w-auto" onClick={() => void submitEssLeaveApply()} disabled={leaveApplyBusy || leaveTypes.loading || balances.loading || assignedLeaveTypes.length === 0} loading={leaveApplyBusy}>
            Submit Application
          </Button>
        </div>
      </Dialog>

      <nav
        id="hr-ess-mobile-footer"
        data-testid="hr-ess-mobile-footer"
        className="mobile-bottom-nav ess-mobile-bottom-nav md:hidden"
        aria-label="ESS Mobile navigation"
      >
        {mainMobileNavItems.map((item) => {
          const isActive = section === item.key;
          return (
            <button
              key={item.key}
              type="button"
              id={`hr-ess-mobile-nav-${item.key}`}
              data-testid={`hr-ess-mobile-nav-${item.key}`}
              className="mobile-bottom-nav__item"
              data-active={isActive}
              onClick={() => navigate(item.to)}
            >
              <span className="mobile-bottom-nav__icon">
                <item.Icon size={18} />
              </span>
              <span className="mobile-bottom-nav__label">{item.label.replace("My ", "")}</span>
            </button>
          );
        })}
        <Popover
          portal
          open={essMenuOpen}
          onOpenChange={setEssMenuOpen}
          placement="top"
          align="end"
          contentClassName="!w-60 !max-h-[70vh] !overflow-y-auto !p-0 !bg-[var(--surface-bg)] !border !border-[var(--border-color)] rounded-xl shadow-xl py-1.5 !z-[9999]"
          trigger={
            <button
              type="button"
              id="hr-ess-mobile-nav-more"
              data-testid="hr-ess-mobile-nav-more"
              className="mobile-bottom-nav__item"
              data-active={isMoreSectionActive}
              aria-label="More ESS sections"
              onClick={() => setEssMenuOpen((open) => !open)}
            >
              <span className="mobile-bottom-nav__icon">
                <MoreHorizontal size={18} />
              </span>
              <span className="mobile-bottom-nav__label">
                {isMoreSectionActive ? activeSectionItem.label.replace("My ", "") : "More"}
              </span>
            </button>
          }
        >
          <div className="flex w-full flex-col py-1">
            <div className="border-b border-[var(--border-color)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--light-text)]">
              Self Service
            </div>
            {moreMobileNavItems.map((item) => {
              const isActive = section === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    navigate(item.to);
                    setEssMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-xs font-bold hover:bg-[var(--primary-light)] transition-colors"
                  style={{
                    color: isActive ? "var(--primary-color)" : "var(--dark-text)",
                    background: isActive ? "rgba(17,94,89,0.06)" : "transparent",
                    border: "none",
                  }}
                >
                  <item.Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </Popover>
      </nav>
    </section>
  );
}

function Panel({
  loading,
  error,
  children,
  className = "",
}: {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <Loader2 className="animate-spin" size={18} /> Loading...
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">{error}</div>;
  }

  return <SectionCard className={`border-slate-200 shadow-sm ${className}`}>{children}</SectionCard>;
}

function Value({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 md:text-[13px] lg:text-sm">{label}</dt>
      <dd className="mt-1.5 text-[14px] font-medium text-slate-900 md:text-[15px] lg:text-base">{value ?? "-"}</dd>
    </div>
  );
}

function ProfileField({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg bg-white border border-slate-100 px-4 py-3 ${className}`}>
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-2 truncate text-[14px] font-semibold text-slate-950 md:text-[15px] lg:text-base" title={humanizeProfileValue(value)}>
        {humanizeProfileValue(value)}
      </dd>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500 md:text-xs">{label}</div>
      <div className="mt-1 text-[13px] font-bold text-slate-950 md:text-[14px] lg:text-[15px]">{value}</div>
    </div>
  );
}

function humanizeProfileValue(value?: string | number | null) {
  if (value == null || value === "") return "--";
  if (typeof value === "number") return String(value);
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim() || "--";
}

function AttendanceMetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "sky" | "amber" | "violet";
}) {
  const toneClass = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  }[tone];

  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-2.5 text-[22px] font-black leading-none tracking-tight text-slate-950 md:text-[24px] lg:text-[26px]">{value}</div>
          <div className="mt-2 text-xs text-slate-500 md:text-[13px] lg:text-sm">{detail}</div>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </SectionCard>
  );
}

function AttendanceTimelineRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5">
      <div className="min-w-0">
        <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500 md:text-[13px] lg:text-sm">{detail}</div>
      </div>
      <div className="shrink-0 text-[15px] font-black text-slate-950 md:text-[16px] lg:text-[17px]">{value}</div>
    </div>
  );
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
        onClick={() => onChange("table")}
        aria-label="Table view"
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          value === "table" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        ].join(" ")}
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-label="Card view"
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          value === "cards" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
        ].join(" ")}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

function EssStatusBadge({ status }: { status: string }) {
  const norm = (status || "").toUpperCase().replace(/_/g, " ");
  const tone =
    norm === "VERIFIED" || norm === "APPROVED" || norm === "PAID" || norm === "REIMBURSED" || norm === "PRESENT" || norm === "SUCCESS"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : norm === "SUBMITTED" || norm === "IN_PROGRESS" || norm === "IN PROGRESS" || norm === "HALF_DAY" || norm === "HALF DAY"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : norm === "REJECTED" || norm === "DECLINED" || norm === "ABSENT" || norm === "CANCELLED"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : norm === "ACKNOWLEDGED"
            ? "border-purple-200 bg-purple-50 text-purple-700"
            : "border-amber-200 bg-amber-50 text-amber-700";

  return <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.1em] ${tone}`}>{status || "—"}</span>;
}

function AttendanceHistoryCard({
  date,
  clockIn,
  clockOut,
  mode,
  hours,
  status,
}: {
  date: string;
  clockIn: string;
  clockOut: string;
  mode: string;
  hours: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Attendance Day</div>
          <div className="mt-0.5 text-sm sm:text-base font-extrabold text-slate-900 truncate">{date}</div>
        </div>
        <EssStatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AttendanceHistoryField label="Clock In" value={clockIn} />
        <AttendanceHistoryField label="Clock Out" value={clockOut} />
        <AttendanceHistoryField label="Work Mode" value={mode} />
        <AttendanceHistoryField label="Worked Hours" value={hours} />
      </div>
    </div>
  );
}

function AttendanceHistoryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50/80 border border-slate-100 px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-xs sm:text-[13px] font-bold text-slate-950 truncate">{value}</div>
    </div>
  );
}

function LeaveHistoryCard({
  type,
  from,
  to,
  duration,
  status,
}: {
  type: string;
  from: string;
  to: string;
  duration: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Leave Type</div>
          <div className="mt-0.5 text-sm sm:text-base font-extrabold text-slate-900 truncate">{type}</div>
        </div>
        <EssStatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AttendanceHistoryField label="From" value={from} />
        <AttendanceHistoryField label="To" value={to} />
        <AttendanceHistoryField label="Duration" value={duration} />
        <AttendanceHistoryField label="Status" value={status} />
      </div>
    </div>
  );
}

function PayslipCard({
  month,
  netPay,
  status,
  generated,
  onView,
  testId,
}: {
  month: string;
  netPay: string;
  status: string;
  generated: string;
  onView: () => void;
  testId: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Payslip Month</div>
          <div className="mt-0.5 text-sm sm:text-base font-extrabold text-slate-900 truncate">{month}</div>
        </div>
        <EssStatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AttendanceHistoryField label="Net Pay" value={netPay} />
        <AttendanceHistoryField label="Status" value={status} />
        <AttendanceHistoryField label="Generated" value={generated} />
        <AttendanceHistoryField label="Month" value={month} />
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3 w-full" icon={<Eye size={15} />} data-testid={testId} onClick={onView}>
        View Payslip
      </Button>
    </div>
  );
}

function DocumentRequestCard({
  title,
  status,
  updated,
  hasFile,
  onView,
  onSubmit,
}: {
  title: string;
  status: string;
  updated: string;
  hasFile: boolean;
  onView?: () => void;
  onSubmit?: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Requested Document</div>
          <div className="mt-0.5 text-sm sm:text-base font-extrabold text-slate-900 truncate">{title}</div>
        </div>
        <EssStatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AttendanceHistoryField label="Status" value={status} />
        <AttendanceHistoryField label="Updated" value={updated} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {hasFile && onView ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            View
          </button>
        ) : null}
        {!hasFile && onSubmit ? (
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Submit
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm sm:text-[15px]">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-sm font-medium text-slate-500">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-slate-50/60">
                {row.map((value, cell) => (
                  <td key={cell} className="px-4 py-4 font-semibold text-slate-900 whitespace-nowrap">
                    {value}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function time(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatMinutes(value?: number) {
  if (value == null || value <= 0) return "--";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function startOfWeek(value: string) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(date);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}
