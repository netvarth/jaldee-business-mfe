import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarDays, Clock, FileText, History, LayoutGrid, Loader2, Menu, MessageSquare, Receipt, Rows3, Timer, User, Wallet, type LucideIcon } from "lucide-react";
import { Button, DataTable, Drawer, SectionCard, Select, type ColumnDef } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { NavLink, useLocation } from "react-router-dom";
import {
  useMyAttendance,
  useMyLeaveBalances,
  useMyLeaves,
  useMyPayslips,
  useMyProfile,
} from "../../services/useEss";
import Announcements from "../announcements/Announcements";
import Expenses from "../expenses/Expenses";
import Tickets from "../tickets/Tickets";
import { useAttendanceRules } from "../../services/useSettingsData";
import { formatCurrency, formatDate } from "../../lib/utils";

const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));

type Section = "overview" | "profile" | "attendance" | "leave" | "payslips" | "staffspace" | "expenses" | "helpdesk";

const ESS_ROUTES: Array<{ key: Section; route: string; label: string; Icon: LucideIcon }> = [
  { key: "overview", route: "", label: "Overview", Icon: User },
  { key: "profile", route: "profile", label: "My Profile", Icon: User },
  { key: "attendance", route: "attendance", label: "Attendance", Icon: Clock },
  { key: "leave", route: "leave", label: "Leave", Icon: CalendarDays },
  { key: "staffspace", route: "staffspace", label: "StaffSpace", Icon: FileText },
  { key: "payslips", route: "payslips", label: "Payslips", Icon: Wallet },
  { key: "expenses", route: "expenses", label: "Expenses", Icon: Receipt },
  { key: "helpdesk", route: "helpdesk", label: "HelpDesk", Icon: MessageSquare },
];

const SECTION_DESCRIPTIONS: Record<Section, string> = {
  overview: "Your HR profile, attendance, documents and requests.",
  profile: "Your HR profile, identity details and employment information.",
  attendance: "Track work mode, punch status and attendance history.",
  leave: "Review leave balances and past requests.",
  payslips: "View payroll statements and generated payslips.",
  staffspace: "Company announcements and internal updates.",
  expenses: "Submit and track employee expense claims.",
  helpdesk: "Raise support requests and follow updates.",
};

function sectionFromPath(pathname: string): Section {
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments.at(-1);
  if (segment === "me") return "overview";
  const match = ESS_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "overview";
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
  const [payslipViewMode, setPayslipViewMode] = useState<ViewMode>(() => getPreferredViewMode());
  const [faceOpen, setFaceOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [punchBusy, setPunchBusy] = useState(false);
  const profile = useMyProfile();
  const attendanceRules = useAttendanceRules();
  const attendance = useMyAttendance();
  const leaves = useMyLeaves();
  const balances = useMyLeaveBalances();
  const payslips = useMyPayslips();
  const activeBalances = useMemo(
    () => balances.data.filter((item) => (item.status || "ACTIVE").toUpperCase() === "ACTIVE"),
    [balances.data],
  );
  const pastBalances = useMemo(
    () => balances.data.filter((item) => (item.status || "ACTIVE").toUpperCase() !== "ACTIVE"),
    [balances.data],
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = useMemo(
    () => attendance.data.find((item) => item.dateStr === today),
    [attendance.data, today],
  );
  const faceRequired = !!attendanceRules.data?.faceRecognitionRequired;

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
        locationUid: profile.data?.locationUid ?? null,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        accuracy: currentPosition.accuracy,
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
  const primaryServices = navItems.filter((item) => ["profile", "attendance", "leave", "payslips"].includes(item.key));
  const featureDescriptions: Record<string, string> = {
    staffspace: "Company announcements, policy updates and internal communication.",
    expenses: "Submit claims, review reimbursements and track approvals.",
    helpdesk: "Raise employee support requests and follow ticket updates.",
  };
  const featureAccents: Record<string, string> = {
    staffspace: "from-[#f8fffc] via-[#eefbf6] to-[#def7ef]",
    expenses: "from-[#fffaf2] via-[#fff3de] to-[#ffe9c5]",
    helpdesk: "from-[#f8fbff] via-[#eef4ff] to-[#ddeaff]",
  };
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewMode = () => {
      const nextMode: ViewMode = media.matches ? "cards" : "table";
      setAttendanceViewMode(nextMode);
      setLeaveViewMode(nextMode);
      setPayslipViewMode(nextMode);
    };
    syncViewMode();
    media.addEventListener("change", syncViewMode);
    return () => media.removeEventListener("change", syncViewMode);
  }, []);

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
      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        size="sm"
        title="Employee menu"
        panelClassName="w-full max-w-full sm:w-96"
      >
        <div className="space-y-2">
          {navItems.map((item) => {
            const active = item.key === section;
            return (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.key === "overview"}
                onClick={() => setMobileNavOpen(false)}
                className={[
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                  active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  <item.Icon size={18} />
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </Drawer>
      <div style={pageStack}>
        <div style={contentPanel}>
          <div className="overflow-hidden rounded-t-2xl rounded-b-none border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_22%),radial-gradient(circle_at_75%_20%,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(135deg,#fff8ef_0%,#f4fbff_48%,#eefbf6_100%)] px-6 py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Employee Self-Service</div>
                  <h1 className="mt-3 text-[34px] font-black tracking-tight text-slate-950">
                    {section === "overview" ? "Your workday, requests and updates in one place." : currentRoute.label}
                  </h1>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">
                    {section === "overview"
                      ? "Access HR details, attendance, leave, documents and support without moving between multiple screens."
                      : SECTION_DESCRIPTIONS[section]}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 max-sm:hidden">
                  <div className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)] backdrop-blur">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Employee ID</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{profile.data?.employeeId ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)] backdrop-blur">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Department</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{profile.data?.department ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-white/90 px-4 py-3 shadow-[0_10px_25px_rgba(15,23,42,0.05)] backdrop-blur">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Designation</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{profile.data?.designation ?? "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-b-xl rounded-t-none border border-slate-200 bg-white/95 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Navigate</div>
                <div className="mt-1 flex items-center gap-2 text-base font-black text-slate-950">
                  <currentRoute.Icon size={18} className="text-emerald-700" />
                  <span className="truncate">{currentRoute.label}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open employee menu"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>

          <nav className="hidden flex-wrap gap-2 rounded-b-xl rounded-t-none border border-slate-200 bg-white/95 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur md:flex">
            {navItems.map((item) => (
              <NavLink
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
                        <h2 className="text-[28px] font-black tracking-tight text-slate-950">Popular services</h2>
                        <p className="mt-2 text-sm text-slate-500">Quick access to the employee self-service areas you use most.</p>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
                        {primaryServices.map((item) => (
                          <NavLink
                            key={item.key}
                            to={item.to}
                            className="group rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-[linear-gradient(135deg,#ffffff_0%,#f6fffb_100%)] hover:shadow-[0_16px_32px_rgba(15,118,110,0.10)]"
                          >
                            <div className="space-y-3 sm:space-y-4">
                              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700">
                                <item.Icon className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
                              </div>
                              <div>
                                <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-emerald-700">
                                  {item.label}
                                </div>
                                <div className="mt-1 sm:mt-3 text-sm sm:text-lg font-bold sm:font-black text-slate-950">{item.label}</div>
                                <p className="mt-2 text-xs sm:text-sm leading-normal sm:leading-6 text-slate-500 hidden sm:block">{SECTION_DESCRIPTIONS[item.key]}</p>
                              </div>
                              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-800 group-hover:border-emerald-200 group-hover:bg-emerald-50 hidden sm:inline-flex">
                                Open
                              </div>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    </SectionCard>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_22%),linear-gradient(135deg,#f4fbf8_0%,#eef8ff_100%)] px-6 py-7 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <div className="mb-6">
                      <h2 className="text-[28px] font-black tracking-tight text-slate-950">Featured journeys</h2>
                      <p className="mt-2 text-sm text-slate-500">Everything beyond core HR, grouped into the next actions employees usually need.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {featuredRoutes.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          className={`overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br ${featureAccents[item.key]} shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.10)]`}
                        >
                          <div className="flex min-h-[160px] flex-col justify-between p-5 md:min-h-[180px] xl:min-h-[220px]">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-slate-900 shadow-sm backdrop-blur">
                              <item.Icon size={18} />
                            </div>
                            <div>
                              <div className="text-lg font-black text-slate-950 md:text-xl">{item.label}</div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{featureDescriptions[item.key]}</p>
                              <div className="mt-4 inline-flex rounded-lg border border-white/80 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-800 backdrop-blur">
                                View
                              </div>
                            </div>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  <SectionCard className="rounded-xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Value label="Name" value={profile.data?.name} />
                      <Value label="Email" value={profile.data?.email} />
                      <Value label="Department" value={profile.data?.department} />
                      <Value label="Designation" value={profile.data?.designation} />
                    </div>
                  </SectionCard>
                </div>
              )}

              {section === "profile" && (
                <Panel loading={profile.loading} error={profile.error} className="mt-6">
                  <div className="flex flex-col gap-6">
                    <div className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbfb_52%,#eef6ff_100%)] p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#d1fae5_0%,#e0f2fe_100%)] text-2xl font-black text-emerald-800 shadow-sm">
                            {(profile.data?.name || "E").trim().charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Employee Profile</div>
                            <h2 className="mt-2 text-[28px] font-black tracking-tight text-slate-950">{profile.data?.name ?? "-"}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                              <span className="rounded-md bg-white/80 px-3 py-1 font-semibold shadow-sm">{profile.data?.designation ?? "Designation pending"}</span>
                              <span className="rounded-md bg-white/80 px-3 py-1 font-semibold shadow-sm">{profile.data?.department ?? "Department pending"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ProfileStat label="Status" value={humanizeProfileValue(profile.data?.status)} />
                          <ProfileStat label="Employment Type" value={humanizeProfileValue(profile.data?.employmentType)} />
                        </div>
                      </div>
                    </div>

                    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <ProfileField label="Salutation" value={humanizeProfileValue(profile.data?.salutation)} />
                      <ProfileField label="Email" value={profile.data?.email} />
                      <ProfileField label="Contact Number" value={profile.data?.contactNumber} />
                      <ProfileField label="Gender" value={humanizeProfileValue(profile.data?.gender)} />
                      <ProfileField label="Date of Birth" value={formatDate(profile.data?.dob)} />
                      <ProfileField label="Date of Joining" value={formatDate(profile.data?.doj)} />
                      <ProfileField label="Location" value={profile.data?.locationName} />
                      <ProfileField label="Auth Access" value={profile.data?.isSystemUser || profile.data?.loginId || profile.data?.role ? "Enabled" : "Not available"} />
                      <ProfileField label="Bank Name" value={profile.data?.bankDetails?.bankName} />
                      <ProfileField label="Account Number" value={profile.data?.bankDetails?.accountNumber} />
                      <ProfileField label="IFSC Code" value={profile.data?.bankDetails?.ifscCode} />
                    </dl>
                  </div>
                </Panel>
              )}

              {section === "attendance" && (
                <Panel loading={attendance.loading} error={attendance.error} className="mt-6">
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

                    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                      <SectionCard className="border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbfb_52%,#eef6ff_100%)] shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
                              <Clock size={28} strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Attendance Console</div>
                              <div className="mt-1.5 font-mono text-[28px] font-black tracking-tight text-slate-950">
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

                          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <Select
                              label="Work mode"
                              value={mode}
                              onChange={(event) => setMode(event.target.value)}
                              options={["Office", "WFH", "On Duty"].map((value) => ({ value, label: value }))}
                            />
                            {!todayAttendance?.clockIn ? (
                              <Button onClick={() => (faceRequired ? setFaceOpen(true) : void punchIn())} disabled={punchBusy}>
                                Punch In
                              </Button>
                            ) : !todayAttendance.clockOut ? (
                              <Button onClick={() => void attendance.punchOut(todayAttendance.id)} disabled={punchBusy}>
                                Punch Out
                              </Button>
                            ) : (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                                Today&apos;s attendance is completed.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Face Recognition</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">{faceRequired ? "Required" : "Optional"}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">First In</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">{time(todayAttendance?.clockIn)}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Last Out</div>
                            <div className="mt-1 text-base font-semibold text-slate-900">{time(todayAttendance?.clockOut)}</div>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard className="border-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Today&apos;s Timeline</div>
                          <h3 className="mt-1.5 text-[26px] font-black tracking-tight text-slate-950">{formatDate(today)}</h3>
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

                    <SectionCard className="border-slate-200 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">History</div>
                          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Recent Attendance Logs</h3>
                          <p className="mt-1 text-sm text-slate-500">Daily check-in, check-out, work mode and worked hours.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <AttendanceViewToggle value={attendanceViewMode} onChange={setAttendanceViewMode} />
                          <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                            {attendance.data.length} total record(s)
                          </div>
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
                <Panel loading={leaves.loading || balances.loading} error={leaves.error || balances.error} className="mt-6">
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {activeBalances.map((item) => (
                      <SectionCard key={item.id} className="border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500">{item.leaveTypeName ?? "Leave"}</div>
                        <div className="mt-1 text-2xl font-bold">{item.available ?? 0}</div>
                        <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
                      </SectionCard>
                    ))}
                  </div>
                  {pastBalances.length > 0 && (
                    <details className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                      <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-slate-700">Past/Expired Balances</summary>
                      <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        {pastBalances.map((item) => (
                          <SectionCard key={item.id} className="border-slate-200 bg-white opacity-70 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm text-slate-500">{item.leaveTypeName ?? "Leave"}</div>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                {item.status ?? "Inactive"}
                              </span>
                            </div>
                            <div className="mt-1 text-2xl font-bold text-slate-500">{item.available ?? 0}</div>
                            <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
                          </SectionCard>
                        ))}
                      </div>
                    </details>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-950">Leave requests</h3>
                      <p className="mt-1 text-sm text-slate-500">Recent leave history with balances and approval status.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AttendanceViewToggle value={leaveViewMode} onChange={setLeaveViewMode} />
                      <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                        {leaves.data.length} total record(s)
                      </div>
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

              {section === "payslips" && (
                <Panel loading={payslips.loading} error={payslips.error} className="mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-950">Payslip statements</h3>
                      <p className="mt-1 text-sm text-slate-500">Generated salary statements and payout status.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AttendanceViewToggle value={payslipViewMode} onChange={setPayslipViewMode} />
                      <div className="rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                        {payslips.data.length} total record(s)
                      </div>
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
                <SectionCard className="mt-6 border-slate-200 shadow-sm">
                  <Announcements />
                </SectionCard>
              )}

              {section === "expenses" && (
                <SectionCard className="mt-6 border-slate-200 shadow-sm">
                  <Expenses />
                </SectionCard>
              )}

              {section === "helpdesk" && (
                <SectionCard className="mt-6 border-slate-200 shadow-sm">
                  <Tickets />
                </SectionCard>
              )}
            </div>

            <aside className={`${railClassName} xl:self-stretch`}>
              <SectionCard className="h-full rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                <div>
                  <h2 className="text-[22px] font-black tracking-tight text-slate-950">Today at a glance</h2>
                  <p className="mt-2 text-sm text-slate-500">A quick summary of your current HR status.</p>
                </div>
                <div className="mt-6 space-y-3">
                  {snapshotItems.map((item) => (
                    <div key={item.label} className="rounded-xl border border-white bg-white/90 px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-700 shadow-sm">
                          <item.icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                          <div className="mt-1 text-[20px] font-black leading-none text-slate-900">{item.value}</div>
                          <div className="mt-1 truncate text-[13px] text-slate-500">{item.detail}</div>
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
      <dt className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-base font-medium text-slate-900">{value ?? "-"}</dd>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50/80 px-4 py-3">
      <dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-2 text-base font-semibold text-slate-950">{humanizeProfileValue(value)}</dd>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-lg font-black text-slate-950">{value}</div>
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
          <div className="mt-3 text-[28px] font-black leading-none tracking-tight text-slate-950">{value}</div>
          <div className="mt-2 text-sm text-slate-500">{detail}</div>
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
        <div className="mt-0.5 truncate text-sm text-slate-500">{detail}</div>
      </div>
      <div className="shrink-0 text-[17px] font-black text-slate-950">{value}</div>
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
          <div className="mt-1.5 text-[28px] font-black leading-none text-slate-950">{date}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
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
    <div className="rounded-lg bg-slate-50 px-3.5 py-2.5">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-[15px] font-semibold text-slate-950">{value}</div>
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
          <div className="mt-1.5 truncate text-[24px] font-black leading-none text-slate-950">{type}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
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
          <div className="mt-1.5 truncate text-[24px] font-black leading-none text-slate-950">{month}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <AttendanceHistoryField label="Net Pay" value={netPay} />
        <AttendanceHistoryField label="Status" value={status} />
        <AttendanceHistoryField label="Generated" value={generated} />
        <AttendanceHistoryField label="Month" value={month} />
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-base">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b px-3 py-3 text-sm uppercase text-slate-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-base text-slate-500">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((value, cell) => (
                  <td key={cell} className="border-b px-3 py-4 text-base">
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
