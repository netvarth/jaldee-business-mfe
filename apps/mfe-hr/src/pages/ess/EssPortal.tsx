import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarDays, Clock, FileText, History, Info, LayoutGrid, Loader2, LogOut, MessageSquare, Plus, Receipt, Rows3, Timer, User, Wallet, X, type LucideIcon } from "lucide-react";
import { Button, DataTable, DataTablePagination, DatePicker, Dialog, FileUpload, Input, SectionCard, Select, Textarea, type ColumnDef } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { NavLink, useLocation } from "react-router-dom";
import {
  useMyAttendance,
  useMyLeaveBalances,
  useMyLeaves,
  useMyPayslips,
  useMyProfile,
} from "../../services/useEss";
import { useBranches } from "../../services/useBranches";
import { useDocumentRequests, type DocumentRequest } from "../../services/useDocumentRequests";
import Announcements from "../announcements/Announcements";
import Expenses from "../expenses/Expenses";
import Tickets from "../tickets/Tickets";
import { useAttendanceRules, useLeaveTypes } from "../../services/useSettingsData";
import { formatCurrency, formatDate } from "../../lib/utils";
import { useExits } from "../../services/useExits";

const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));

type Section = "overview" | "profile" | "attendance" | "leave" | "documents" | "payslips" | "staffspace" | "expenses" | "separation" | "helpdesk";

const ESS_ROUTES: Array<{ key: Section; route: string; label: string; Icon: LucideIcon }> = [
  { key: "overview", route: "", label: "Overview", Icon: User },
  { key: "profile", route: "profile", label: "My Profile", Icon: User },
  { key: "attendance", route: "attendance", label: "Attendance", Icon: Clock },
  { key: "leave", route: "leave", label: "Leave", Icon: CalendarDays },
  { key: "documents", route: "documents", label: "My Documents", Icon: FileText },
  { key: "staffspace", route: "staffspace", label: "StaffSpace", Icon: FileText },
  { key: "payslips", route: "payslips", label: "Payslips", Icon: Wallet },
  { key: "expenses", route: "expenses", label: "Expenses", Icon: Receipt },
  { key: "separation", route: "separation", label: "Separation", Icon: LogOut },
  { key: "helpdesk", route: "helpdesk", label: "HelpDesk", Icon: MessageSquare },
];

const SECTION_DESCRIPTIONS: Record<Section, string> = {
  overview: "Your HR profile, attendance, documents and requests.",
  profile: "Your HR profile, identity details and employment information.",
  attendance: "Track work mode, punch status and attendance history.",
  leave: "Review leave balances and past requests.",
  documents: "Documents requested by your company and the files you have submitted.",
  payslips: "View payroll statements and generated payslips.",
  staffspace: "Company announcements and internal updates.",
  expenses: "Submit and track employee expense claims.",
  separation: "Raise and track your resignation request.",
  helpdesk: "Raise support requests and follow updates.",
};

function sectionFromPath(pathname: string): Section {
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments.at(-1);
  if (segment === "me") return "overview";
  const match = ESS_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "overview";
}

function calcLeaveDays(start?: string, end?: string, half?: boolean): number {
  if (!start || !end) return 0;
  if (half && start === end) return 0.5;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
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

function getPreferredViewMode() {
  if (typeof window === "undefined") return "table" as ViewMode;
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
  const [faceOpen, setFaceOpen] = useState(false);
  const [punchBusy, setPunchBusy] = useState(false);
  const [leaveApplyOpen, setLeaveApplyOpen] = useState(false);
  const [leaveApplyBusy, setLeaveApplyBusy] = useState(false);
  const [leaveApplyError, setLeaveApplyError] = useState<string | null>(null);
  const [exitBusy, setExitBusy] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitForm, setExitForm] = useState({ noticePeriodDays: "30", reason: "" });
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
    reason: "",
  });
  const profile = useMyProfile();
  const exits = useExits({ enabled: section === "separation" });
  const showAttendanceData = section === "overview" || section === "attendance";
  const showLeaveData = section === "overview" || section === "leave";
  const showPayslipData = section === "overview" || section === "payslips";
  const attendanceRules = useAttendanceRules({ enabled: section === "attendance" });
  const leaveTypes = useLeaveTypes({ enabled: section === "leave" });
  const attendance = useMyAttendance({ enabled: showAttendanceData });
  const leaves = useMyLeaves({ enabled: section === "leave" });
  const balances = useMyLeaveBalances({ enabled: showLeaveData });
  const payslips = useMyPayslips({ enabled: showPayslipData });
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
  const branches = useBranches({ enabled: section === "attendance" });
  const [selectedLocationUid, setSelectedLocationUid] = useState("");
  const todayAttendance = useMemo(
    () => attendance.data.find((item) => item.dateStr === today),
    [attendance.data, today],
  );
  const faceRequired = !!attendanceRules.data?.faceRecognitionRequired;
  const shouldShowLocationSelect = branches.data.length > 1;

  useEffect(() => {
    if (selectedLocationUid) return;
    if (profile.data?.locationUid) {
      setSelectedLocationUid(profile.data.locationUid);
      return;
    }
    if (branches.data.length === 1) {
      setSelectedLocationUid(branches.data[0].id);
    }
  }, [branches.data, profile.data?.locationUid, selectedLocationUid]);

  const resolveCurrentPosition = () =>
    new Promise<{ latitude: number; longitude: number; accuracy: number | null }>((resolve, reject) => {
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
            reject(new Error("Location permission is required to punch in."));
            return;
          }
          reject(new Error("Unable to fetch your current location."));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const punchIn = async (selfieDataUrl?: string) => {
    setPunchBusy(true);
    try {
      const currentPosition = await resolveCurrentPosition();
      await attendance.punchIn(mode, {
        selfieDataUrl,
        locationUid: selectedLocationUid || profile.data?.locationUid || branches.data[0]?.id || null,
        location: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracy: currentPosition.accuracy,
        },
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
      value: payslips.data[0]?.month || "Not available",
      detail: payslips.data[0]?.status || "No generated statement yet",
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
    if (!employeeUid || !leaveApplyForm.leaveTypeUid || !leaveApplyForm.startDate || !leaveApplyForm.reason) {
      setLeaveApplyError("Leave type, start date and reason are required.");
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
      const documentUrl = await documents.uploadFile(employeeUid, documentFiles[0]);
      await documents.update(uid, {
        documentType: selectedDocument?.documentType,
        documentUrl,
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
        <div style={contentPanel}>
          <div className="overflow-hidden rounded-t-2xl rounded-b-none border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_22%),radial-gradient(circle_at_75%_20%,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(135deg,#fff8ef_0%,#f4fbff_48%,#eefbf6_100%)] px-6 py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Employee Self-Service</div>
                  <h1 className="mt-3 text-[24px] font-black tracking-tight text-slate-950 md:text-[27px] lg:text-[30px]">
                    {section === "overview" ? "Your workday, requests and updates in one place." : currentRoute.label}
                  </h1>
                  <p className="mt-3 text-[13px] leading-6 text-slate-600 md:text-[14px] md:leading-6 lg:text-[15px] lg:leading-7">
                    {section === "overview"
                      ? "Access HR details, attendance, leave, documents and support without moving between multiple screens."
                      : SECTION_DESCRIPTIONS[section]}
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

          <nav className="hidden flex-wrap gap-2 rounded-b-xl rounded-t-none border border-slate-200 bg-white/95 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur md:flex">
            {navItems.map((item) => (
              <NavLink
                data-testid={`hr-ess-nav-${item.key}`}
                key={item.key}
                to={item.to}
                end={item.key === "overview"}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
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
          <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
            <div className="min-w-0 flex-1">
              {section === "overview" && (
                <div className="mt-6 flex flex-col gap-6">
                  <div>
                    <SectionCard className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                      <div>
                        <h2 className="text-[21px] font-black tracking-tight text-slate-950 md:text-[23px] lg:text-[24px]">Popular services</h2>
                        <p className="mt-2 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">Quick access to the employee self-service areas you use most.</p>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
                        {primaryServices.map((item) => (
                          <NavLink
                            key={item.key}
                            to={item.to}
                            className="group rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[linear-gradient(135deg,#ffffff_0%,#f6fffb_100%)] hover:shadow-[0_16px_32px_rgba(15,118,110,0.10)]"
                          >
                            <div className="space-y-3 text-center sm:space-y-4 md:text-left">
                              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700 sm:h-12 sm:w-12 md:mx-0">
                                <item.Icon className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
                              </div>
                              <div>
                                <div className="text-[12px] font-bold text-slate-950 sm:mt-3 sm:text-[14px] md:text-[15px] md:font-black lg:text-[16px]">
                                  {item.label}
                                </div>
                                <p className="mt-2 text-[10px] leading-normal text-slate-500 sm:text-[11px] md:text-[12px] md:leading-5 lg:text-sm lg:leading-6">
                                  {SECTION_DESCRIPTIONS[item.key]}
                                </p>
                              </div>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                    <div>
                      <h2 className="text-[21px] font-black tracking-tight text-slate-950 md:text-[23px] lg:text-[24px]">Featured journeys</h2>
                      <p className="mt-2 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">Everything beyond core HR, grouped into the next actions employees usually need.</p>
                    </div>
                    <div className="mt-6 grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                      {featuredRoutes.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          className="group rounded-xl border border-slate-200 bg-white p-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[linear-gradient(135deg,#ffffff_0%,#f6fffb_100%)] hover:shadow-[0_16px_32px_rgba(15,118,110,0.10)] sm:p-5 md:text-left"
                        >
                          <div className="space-y-3 sm:space-y-4">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700 sm:h-12 sm:w-12 md:mx-0">
                              <item.Icon className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
                            </div>
                            <div>
                              <div className="text-[12px] font-bold text-slate-950 sm:mt-3 sm:text-[14px] md:text-[15px] md:font-black lg:text-[16px]">
                                {item.label}
                              </div>
                              <p className="mt-2 text-[10px] leading-normal text-slate-500 sm:text-[11px] md:text-[12px] md:leading-5 lg:text-sm lg:leading-6">
                                {featureDescriptions[item.key]}
                              </p>
                            </div>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </SectionCard>

                </div>
              )}

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
                        value={todayAttendance?.workedHours != null ? `${todayAttendance.workedHours.toFixed(2)}h` : "--"}
                        detail={todayAttendance?.clockOut ? "Session closed" : todayAttendance?.clockIn ? "Live shift running" : "Starts after punch in"}
                        tone="sky"
                      />
                      <AttendanceMetricCard
                        icon={History}
                        label="This Week"
                        value={`${attendance.data
                          .filter((item) => item.dateStr && new Date(item.dateStr) >= startOfWeek(today))
                          .reduce((sum, item) => sum + (item.workedHours ?? 0), 0)
                          .toFixed(1)}h`}
                        detail={`${attendance.data.filter((item) => item.dateStr && new Date(item.dateStr) >= startOfWeek(today) && item.clockIn).length} logged day(s)`}
                        tone="amber"
                      />
                      <AttendanceMetricCard
                        icon={CalendarDays}
                        label="Break Time"
                        value={formatMinutes(todayAttendance?.totalBreakMinutes)}
                        detail={todayAttendance?.breaks?.length ? `${todayAttendance.breaks.length} recorded break(s)` : "No breaks recorded"}
                        tone="violet"
                      />
                    </div>

                    <div className={`${todayAttendance?.clockIn ? "order-2" : "order-1"} grid gap-5 sm:order-2 xl:grid-cols-[1.15fr_0.85fr]`}>
                      <SectionCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbfb_52%,#eef6ff_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.04)] max-sm:!border-0 max-sm:!bg-transparent max-sm:!p-0 max-sm:!shadow-none">
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
                                  ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
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
                                <Button
                                  data-testid="ess-attendance-punch-out"
                                  onClick={() => void attendance.punchOut(todayAttendance.id)}
                                  disabled={punchBusy}
                                  className="h-11 w-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800"
                                >
                                  Punch Out
                                </Button>
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

                      <SectionCard className="border-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Today&apos;s Timeline</div>
                          <h3 className="mt-1.5 text-[22px] font-black tracking-tight text-slate-950 md:text-[24px] lg:text-[24px]">{formatDate(today)}</h3>
                        </div>
                        {todayAttendance ? (
                          <div className="mt-4 space-y-2.5">
                            <AttendanceTimelineRow label="Clock In" value={time(todayAttendance.clockIn)} detail={todayAttendance.clockInType ?? "Office"} />
                            <AttendanceTimelineRow label="Clock Out" value={time(todayAttendance.clockOut)} detail={todayAttendance.clockOut ? "Shift completed" : "Still active"} />
                            <AttendanceTimelineRow label="Worked Hours" value={todayAttendance.workedHours != null ? `${todayAttendance.workedHours.toFixed(2)}h` : "--"} detail={todayAttendance.status ?? "Present"} />
                            <AttendanceTimelineRow label="Break Time" value={formatMinutes(todayAttendance.totalBreakMinutes)} detail={todayAttendance.breaks?.length ? `${todayAttendance.breaks.length} break(s)` : "No breaks"} />
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center text-sm text-slate-500">
                            No attendance activity recorded for today.
                          </div>
                        )}
                      </SectionCard>
                    </div>

                    <SectionCard className="order-3 border-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">History</div>
                          <h3 className="mt-2 text-[17px] font-black tracking-tight text-slate-950 md:text-[19px] lg:text-[20px]">
                            Recent Attendance Logs ({attendance.data.length})
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
                            headers={["Date", "In", "Out", "Mode", "Hours", "Status"]}
                            rows={attendance.data.map((item) => [
                              item.dateStr ? formatDate(item.dateStr) : "--",
                              time(item.clockIn),
                              time(item.clockOut),
                              item.clockInType ?? "--",
                              item.workedHours?.toFixed(2) ? `${item.workedHours.toFixed(2)}h` : "--",
                              item.status ?? "--",
                            ])}
                          />
                        ) : attendance.data.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                            No attendance records found.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {attendance.data.map((item, index) => (
                              <AttendanceHistoryCard
                                key={item.id || `${item.dateStr ?? "attendance"}-${index}`}
                                date={item.dateStr ? formatDate(item.dateStr) : "--"}
                                clockIn={time(item.clockIn)}
                                clockOut={time(item.clockOut)}
                                mode={item.clockInType ?? "--"}
                                hours={item.workedHours?.toFixed(2) ? `${item.workedHours.toFixed(2)}h` : "--"}
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
                  {pastBalances.length > 0 && (
                    <details className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                      <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-slate-700">Past/Expired Balances</summary>
                      <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pastBalances.map((item) => (
                          <SectionCard key={item.id} className="border-slate-200 bg-white opacity-70 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[12px] text-slate-500 md:text-[13px] lg:text-sm">{item.leaveTypeName ?? "Leave"}</div>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                {item.status ?? "Inactive"}
                              </span>
                            </div>
                            <div className="mt-1 text-[19px] font-bold text-slate-500 md:text-[21px] lg:text-2xl">{item.available ?? 0}</div>
                            <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
                          </SectionCard>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
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
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                        No leave records found.
                      </div>
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
                    <div>
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
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                        No document requests found.
                      </div>
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
                              const actionLabel = item.documentUrl ? "View" : status === "VERIFIED" ? "Verified" : "Submit";
                              return (
                                <tr key={item.id || `${item.documentType ?? "document"}-${index}`}>
                                  <td className="border-b px-3 py-4 font-semibold text-slate-950">{item.documentType || "Document"}</td>
                                  <td className="border-b px-3 py-4">
                                    <DocumentStatusBadge status={status} />
                                  </td>
                                  <td className="border-b px-3 py-4 text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</td>
                                  <td className="border-b px-3 py-4 text-right">
                                    <div className="inline-flex gap-2">
                                      {item.documentUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => void openSubmittedDocument(item.documentUrl)}
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
                          return (
                            <DocumentRequestCard
                              key={item.id || `${item.documentType ?? "document"}-${index}`}
                              title={item.documentType || "Document"}
                              status={status}
                              updated={formatDate(item.updatedAt || item.createdAt)}
                              hasFile={!!item.documentUrl}
                              onView={item.documentUrl ? () => void openSubmittedDocument(item.documentUrl) : undefined}
                              onSubmit={!item.documentUrl ? () => openDocumentSubmit(item) : undefined}
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
                    <div>
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
                    {payslipViewMode === "table" ? (
                      <DataTable
                        data={payslips.data}
                        columns={payslipColumns}
                        getRowId={(item, index) => item.id ?? item.month ?? `${item.generatedAt ?? "payslip"}-${index}`}
                        data-testid="ess-payslips-table"
                      />
                    ) : payslips.data.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                        No payslip statements found.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {payslips.data.map((item, index) => (
                          <PayslipCard
                            key={item.id || `${item.month ?? "payslip"}-${index}`}
                            month={item.month ?? "--"}
                            netPay={formatCurrency(item.netPay ?? 0)}
                            status={item.status ?? "--"}
                            generated={formatDate(item.generatedAt)}
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
                        <p className="mt-3 text-sm text-slate-500">No exit requests submitted.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {exits.data
                            .filter((item) => item.employeeUid === (profile.data?.id || profile.data?.uid))
                            .map((item) => (
                              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                <div>
                                  <div className="font-bold text-slate-900">{item.separationType || "Resignation"}</div>
                                  <div className="mt-1 text-xs text-slate-500">{item.reason || "No reason provided"}</div>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{(item.status || "Pending").replaceAll("_", " ")}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
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
              <label style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(100,116,139,0.06)", padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, color: "var(--dark-text)" }}>
                <input
                  id="ess-leave-half-day"
                  data-testid="ess-leave-half-day"
                  type="checkbox"
                  checked={leaveApplyForm.isHalfDay}
                  onChange={(e) => setLeaveApplyForm((current) => ({ ...current, isHalfDay: e.target.checked }))}
                /> Apply as Half Day (0.5 days)
              </label>
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
    <div className={`min-w-0 rounded-lg bg-slate-50/80 px-4 py-3 ${className}`}>
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
    <SectionCard className="border-slate-200 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-3 text-[18px] font-black leading-none tracking-tight text-slate-950 md:text-[19px] lg:text-[20px]">{value}</div>
          <div className="mt-2 text-[12px] text-slate-500 md:text-[13px] lg:text-sm">{detail}</div>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneClass}`}>
          <Icon size={18} />
        </div>
      </div>
    </SectionCard>
  );
}

function AttendanceTimelineRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</div>
        <div className="mt-0.5 truncate text-[12px] text-slate-500 md:text-[13px] lg:text-sm">{detail}</div>
      </div>
      <div className="shrink-0 text-[14px] font-black text-slate-950 md:text-[15px] lg:text-[16px]">{value}</div>
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
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-label="Table view"
        className={[
          "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          value === "table" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50",
        ].join(" ")}
      >
        <Rows3 size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-label="Card view"
        className={[
          "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          value === "cards" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-50",
        ].join(" ")}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Attendance Day</div>
          <div className="mt-1.5 text-[20px] font-black leading-none text-slate-950 md:text-[22px] lg:text-[24px]">{date}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
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
    <div className="rounded-md bg-slate-50 px-3 py-2 md:px-3.5 md:py-2.5">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-[13px] font-semibold text-slate-950 md:text-[14px] lg:text-[15px]">{value}</div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Leave Type</div>
          <div className="mt-1.5 truncate text-[18px] font-black leading-none text-slate-950 md:text-[20px] lg:text-[22px]">{type}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
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
}: {
  month: string;
  netPay: string;
  status: string;
  generated: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Payslip Month</div>
          <div className="mt-1.5 truncate text-[18px] font-black leading-none text-slate-950 md:text-[20px] lg:text-[22px]">{month}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <AttendanceHistoryField label="Net Pay" value={netPay} />
        <AttendanceHistoryField label="Status" value={status} />
        <AttendanceHistoryField label="Generated" value={generated} />
        <AttendanceHistoryField label="Month" value={month} />
      </div>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  const tone =
    status === "VERIFIED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "SUBMITTED"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "REJECTED"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${tone}`}>{status}</span>;
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Requested Document</div>
          <div className="mt-1.5 truncate text-[18px] font-black leading-none text-slate-950 md:text-[20px] lg:text-[22px]">{title}</div>
        </div>
        <DocumentStatusBadge status={status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <AttendanceHistoryField label="Status" value={status} />
        <AttendanceHistoryField label="Updated" value={updated} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {hasFile && onView ? (
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            View
          </button>
        ) : null}
        {!hasFile && onSubmit ? (
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Submit
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px] md:text-[14px] lg:text-base">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b px-3 py-3 text-[12px] uppercase text-slate-500 md:text-[13px] lg:text-sm">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-[13px] text-slate-500 md:text-[14px] lg:text-base">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((value, cell) => (
                  <td key={cell} className="border-b px-3 py-4 text-[13px] md:text-[14px] lg:text-base">
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
