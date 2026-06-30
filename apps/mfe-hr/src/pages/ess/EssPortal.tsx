import { lazy, Suspense, useMemo, useState, type CSSProperties } from "react";
import { CalendarDays, Clock, Loader2, User, Wallet, type LucideIcon } from "lucide-react";
import { Button, PageHeader, Select } from "@jaldee/design-system";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useMyAttendance,
  useMyLeaveBalances,
  useMyLeaves,
  useMyPayslips,
  useMyProfile,
} from "../../services/useEss";
import { useAttendanceRules } from "../../services/useSettingsData";
import { formatCurrency, formatDate } from "../../lib/utils";
const FaceCaptureModal = lazy(() => import("../../components/FaceCaptureModal"));

type Section = "profile" | "attendance" | "leave" | "payslips";

const ESS_ROUTES: Array<{ key: Section; route: string; label: string; Icon: LucideIcon }> = [
  { key: "profile", route: "profile", label: "My Profile", Icon: User },
  { key: "attendance", route: "attendance", label: "Attendance", Icon: Clock },
  { key: "leave", route: "leave", label: "Leave", Icon: CalendarDays },
  { key: "payslips", route: "payslips", label: "Payslips", Icon: Wallet },
];

function sectionFromPath(pathname: string): Section {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  const match = ESS_ROUTES.find((item) => item.route === segment || item.key === segment);
  return match?.key || "profile";
}

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 8,
};

const tabBar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  padding: 4,
  background: "var(--border-color)",
  borderRadius: 8,
  marginBottom: 18,
  width: "fit-content",
};

const tabButton = (active: boolean): CSSProperties => ({
  ...buttonStyle,
  border: "none",
  padding: "9px 13px",
  fontWeight: 800,
  fontSize: 13,
  background: active ? "var(--surface-bg)" : "transparent",
  color: active ? "var(--dark-text)" : "var(--light-text)",
  cursor: "pointer",
});

export default function EssPortal() {
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <section id="hr-ess-page" data-testid="hr-ess-page" className="page-section active p-4 md:p-6">
      {faceOpen && (
        <Suspense fallback={null}>
          <FaceCaptureModal title="Verify Face to Punch In" subtitle={profile.data?.name} busy={punchBusy} onCapture={(_descriptor, selfieDataUrl) => punchIn(selfieDataUrl)} onClose={() => setFaceOpen(false)} />
        </Suspense>
      )}
      <PageHeader title="Employee Self-Service" subtitle="Your HR profile, attendance, leave and payroll" />

      <div style={tabBar}>
        {ESS_ROUTES.map(({ key, route, label, Icon }) => (
          <button
            key={key}
            id={`hr-ess-tab-${key}`}
            data-testid={`hr-ess-tab-${key}`}
            data-active={section === key ? "true" : "false"}
            onClick={() => navigate(`/me/${route}`)}
            style={tabButton(section === key)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {section === "profile" && (
        <Panel loading={profile.loading} error={profile.error}>
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
        <Panel loading={attendance.loading} error={attendance.error}>
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <Select
              label="Work mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              options={["Office", "WFH", "On Duty"].map((value) => ({ value, label: value }))}
            />
            {!todayAttendance?.clockIn ? (
              <Button onClick={() => faceRequired ? setFaceOpen(true) : void punchIn()} disabled={punchBusy}>Punch In</Button>
            ) : !todayAttendance.clockOut ? (
              <Button onClick={() => void attendance.punchOut(todayAttendance.id)}>Punch Out</Button>
            ) : null}
          </div>
          <SimpleTable
            headers={["Date", "In", "Out", "Mode", "Hours"]}
            rows={attendance.data.map((item) => [
              item.dateStr ?? "—",
              time(item.clockIn),
              time(item.clockOut),
              item.clockInType ?? "—",
              item.workedHours?.toFixed(2) ?? "—",
            ])}
          />
        </Panel>
      )}

      {section === "leave" && (
        <Panel loading={leaves.loading || balances.loading} error={leaves.error || balances.error}>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activeBalances.map((item) => (
              <div key={item.id} className="rounded-xl border bg-white p-4">
                <div className="text-sm text-slate-500">{item.leaveTypeName ?? "Leave"}</div>
                <div className="mt-1 text-2xl font-bold">{item.available ?? 0}</div>
                <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
              </div>
            ))}
          </div>
          {pastBalances.length > 0 && (
            <details className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Past/Expired Balances</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pastBalances.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 opacity-70">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-slate-500">{item.leaveTypeName ?? "Leave"}</div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{item.status ?? "Inactive"}</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-slate-500">{item.available ?? 0}</div>
                    <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
          <SimpleTable
            headers={["Type", "From", "To", "Duration", "Status"]}
            rows={leaves.data.map((item) => [
              item.leaveTypeName ?? "—",
              formatDate(item.startDate),
              formatDate(item.endDate),
              String(item.duration ?? "—"),
              item.status ?? "—",
            ])}
          />
        </Panel>
      )}

      {section === "payslips" && (
        <Panel loading={payslips.loading} error={payslips.error}>
          <SimpleTable
            headers={["Month", "Net Pay", "Status", "Generated"]}
            rows={payslips.data.map((item) => [
              item.month ?? "—",
              formatCurrency(item.netPay ?? 0),
              item.status ?? "—",
              formatDate(item.generatedAt),
            ])}
          />
        </Panel>
      )}
    </section>
  );
}

function Panel({ loading, error, children }: { loading: boolean; error: string | null; children: React.ReactNode }) {
  if (loading) return <div className="flex items-center gap-2 rounded-xl border bg-white p-6"><Loader2 className="animate-spin" size={18} /> Loading…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  return <div className="rounded-xl border bg-white p-5 shadow-sm">{children}</div>;
}

function Value({ label, value }: { label: string; value?: string | number | null }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-900">{value ?? "—"}</dd></div>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead><tr>{headers.map((header) => <th key={header} className="border-b px-3 py-2 text-xs uppercase text-slate-500">{header}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">No records found.</td></tr> :
            rows.map((row, index) => <tr key={index}>{row.map((value, cell) => <td key={cell} className="border-b px-3 py-3">{value}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function time(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
