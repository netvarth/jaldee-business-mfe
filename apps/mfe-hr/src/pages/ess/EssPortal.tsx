import { useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, User, Wallet } from "lucide-react";
import { Button, PageHeader, Select } from "@jaldee/design-system";
import {
  useMyAttendance,
  useMyLeaveBalances,
  useMyLeaves,
  useMyPayslips,
  useMyProfile,
} from "../../services/useEss";
import { formatCurrency, formatDate } from "../../lib/utils";

type Section = "profile" | "attendance" | "leave" | "payslips";

export default function EssPortal() {
  const [section, setSection] = useState<Section>("profile");
  const [mode, setMode] = useState("Office");
  const profile = useMyProfile();
  const attendance = useMyAttendance();
  const leaves = useMyLeaves();
  const balances = useMyLeaveBalances();
  const payslips = useMyPayslips();
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = useMemo(
    () => attendance.data.find((item) => item.dateStr === today),
    [attendance.data, today],
  );

  const tabs: Array<{ key: Section; label: string; icon: React.ReactNode }> = [
    { key: "profile", label: "My Profile", icon: <User size={16} /> },
    { key: "attendance", label: "Attendance", icon: <Clock size={16} /> },
    { key: "leave", label: "Leave", icon: <CalendarDays size={16} /> },
    { key: "payslips", label: "Payslips", icon: <Wallet size={16} /> },
  ];

  return (
    <section id="hr-ess-page" data-testid="hr-ess-page" className="page-section active p-4 md:p-6">
      <PageHeader title="Employee Self-Service" subtitle="Your HR profile, attendance, leave and payroll" />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={section === tab.key ? "primary" : "secondary"}
            icon={tab.icon}
            onClick={() => setSection(tab.key)}
          >
            {tab.label}
          </Button>
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
              <Button onClick={() => void attendance.punchIn(mode)}>Punch In</Button>
            ) : !todayAttendance.clockOut ? (
              <Button onClick={() => void attendance.punchOut(todayAttendance.id, mode)}>Punch Out</Button>
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
            {balances.data.map((item) => (
              <div key={item.id} className="rounded-xl border bg-white p-4">
                <div className="text-sm text-slate-500">{item.leaveTypeName ?? "Leave"}</div>
                <div className="mt-1 text-2xl font-bold">{item.available ?? 0}</div>
                <div className="text-xs text-slate-500">available of {item.total ?? 0}</div>
              </div>
            ))}
          </div>
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
