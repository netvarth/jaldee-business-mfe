import { lazy, Suspense, useMemo, useState, type CSSProperties } from "react";
import { CalendarDays, Clock, FileText, Loader2, MessageSquare, Receipt, User, Wallet, type LucideIcon } from "lucide-react";
import { Button, SectionCard, Select } from "@jaldee/design-system";
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

export default function EssPortal() {
  const location = useLocation();
  const section = sectionFromPath(location.pathname);
  const [mode, setMode] = useState("Office");
  const [faceOpen, setFaceOpen] = useState(false);
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

  const punchIn = async (selfieDataUrl?: string) => {
    setPunchBusy(true);
    try {
      await attendance.punchIn(mode, selfieDataUrl);
      setFaceOpen(false);
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
    staffspace: "from-white via-[#f7fbfb] to-[#eef7f6]",
    expenses: "from-white via-[#faf8f2] to-[#f6efe1]",
    helpdesk: "from-white via-[#f6f9ff] to-[#edf4ff]",
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[linear-gradient(135deg,#ffffff_0%,#f7fbfb_52%,#edf6f5_100%)] px-6 py-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">Employee Self-Service</div>
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
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Employee ID</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{profile.data?.employeeId ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Department</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{profile.data?.department ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Designation</div>
                    <div className="mt-2 text-lg font-black text-slate-950">{profile.data?.designation ?? "-"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.key === "overview"}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
                    <SectionCard className="border-0 shadow-none">
                      <div>
                        <h2 className="text-[28px] font-black tracking-tight text-slate-950">Popular services</h2>
                        <p className="mt-2 text-sm text-slate-500">Quick access to the employee self-service areas you use most.</p>
                      </div>
                      <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {primaryServices.map((item) => (
                          <NavLink
                            key={item.key}
                            to={item.to}
                            className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
                          >
                            <div className="space-y-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-50 text-teal-700">
                                <item.Icon size={18} />
                              </div>
                              <div>
                                <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-teal-700">
                                  {item.label}
                                </div>
                                <div className="mt-3 text-lg font-black text-slate-950">{item.label}</div>
                                <p className="mt-2 text-sm leading-6 text-slate-500">{SECTION_DESCRIPTIONS[item.key]}</p>
                              </div>
                              <div className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 group-hover:border-slate-300">
                                Open
                              </div>
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    </SectionCard>
                  </div>

                  <div className="rounded-2xl bg-[#eef6f4] px-6 py-7">
                    <div className="mb-6">
                      <h2 className="text-[28px] font-black tracking-tight text-slate-950">Featured journeys</h2>
                      <p className="mt-2 text-sm text-slate-500">Everything beyond core HR, grouped into the next actions employees usually need.</p>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                      {featuredRoutes.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          className={`overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br ${featureAccents[item.key]} shadow-sm transition-transform hover:-translate-y-0.5`}
                        >
                          <div className="flex min-h-[220px] flex-col justify-between p-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/80 text-slate-900 shadow-sm">
                              <item.Icon size={18} />
                            </div>
                            <div>
                              <div className="text-xl font-black text-slate-950">{item.label}</div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{featureDescriptions[item.key]}</p>
                              <div className="mt-5 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                                View
                              </div>
                            </div>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  <SectionCard className="border-0 shadow-none">
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
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Value label="Name" value={profile.data?.name} />
                    <Value label="Employee ID" value={profile.data?.employeeId} />
                    <Value label="Email" value={profile.data?.email} />
                    <Value label="Department" value={profile.data?.department} />
                    <Value label="Designation" value={profile.data?.designation} />
                    <Value label="Status" value={profile.data?.status} />
                  </dl>
                </Panel>
              )}

              {section === "attendance" && (
                <Panel loading={attendance.loading} error={attendance.error} className="mt-6">
                  <div className="mb-5 flex flex-wrap items-end gap-3">
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
                      <Button onClick={() => void attendance.punchOut(todayAttendance.id)}>Punch Out</Button>
                    ) : null}
                  </div>
                  <SimpleTable
                    headers={["Date", "In", "Out", "Mode", "Hours"]}
                    rows={attendance.data.map((item) => [
                      item.dateStr ?? "-",
                      time(item.clockIn),
                      time(item.clockOut),
                      item.clockInType ?? "-",
                      item.workedHours?.toFixed(2) ?? "-",
                    ])}
                  />
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
                  <SimpleTable
                    headers={["Type", "From", "To", "Duration", "Status"]}
                    rows={leaves.data.map((item) => [
                      item.leaveTypeName ?? "-",
                      formatDate(item.startDate),
                      formatDate(item.endDate),
                      String(item.duration ?? "-"),
                      item.status ?? "-",
                    ])}
                  />
                </Panel>
              )}

              {section === "payslips" && (
                <Panel loading={payslips.loading} error={payslips.error} className="mt-6">
                  <SimpleTable
                    headers={["Month", "Net Pay", "Status", "Generated"]}
                    rows={payslips.data.map((item) => [
                      item.month ?? "-",
                      formatCurrency(item.netPay ?? 0),
                      item.status ?? "-",
                      formatDate(item.generatedAt),
                    ])}
                  />
                </Panel>
              )}

              {section === "staffspace" && <Announcements />}

              {section === "expenses" && <Expenses />}

              {section === "helpdesk" && <Tickets />}
            </div>

            <aside className={`${railClassName} xl:self-stretch`}>
              <SectionCard className="h-full border border-slate-200 shadow-none">
                <div>
                  <h2 className="text-[22px] font-black tracking-tight text-slate-950">Today at a glance</h2>
                  <p className="mt-2 text-sm text-slate-500">A quick summary of your current HR status.</p>
                </div>
                <div className="mt-6 space-y-3">
                  {snapshotItems.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value ?? "-"}</dd>
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b px-3 py-2 text-xs uppercase text-slate-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((value, cell) => (
                  <td key={cell} className="border-b px-3 py-3">
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
