import { useMemo } from "react";
import { Download, Users, CalendarDays, Wallet, FileBarChart, Loader2 } from "lucide-react";
import { Button, PageHeader } from "@jaldee/design-system";
import { useEmployees } from "../../services/useEmployees";
import { useLeaveBalances } from "../../services/useLeaveData";
import { useAttendance } from "../../services/useAttendanceData";
import { usePayslips } from "../../services/usePayrollData";
import { exportToCSV, formatCurrency, formatDate } from "../../lib/utils";

function ReportCard({ icon, title, desc, count, onExport, busy }: {
  icon: React.ReactNode; title: string; desc: string; count: number; onExport: () => void; busy?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="font-bold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-foreground">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : count}</div>
          <div className="text-xs text-muted-foreground">records</div>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} disabled={busy || count === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
    </div>
  );
}

export default function Reports() {
  const { data: employees, loading: le } = useEmployees();
  const { data: balances, loading: lb } = useLeaveBalances();
  const { data: attendance, loading: la } = useAttendance();
  const { data: payslips, loading: lp } = usePayslips();

  const empName = useMemo(() => {
    const m = new Map(employees.map((e) => [e.id, e.name] as const));
    return (uid?: string) => (uid ? m.get(uid) ?? uid : "");
  }, [employees]);

  const exportEmployees = () => exportToCSV(
    ["Employee ID", "Name", "Email", "Department", "Designation", "Type", "Status"],
    employees.map((e) => [e.employeeId ?? "", e.name ?? "", e.email ?? "", e.department ?? "", e.designation ?? "", e.employmentType ?? "", e.status ?? ""]),
    "employee-directory.csv"
  );
  const exportLeaveSummary = () => exportToCSV(
    ["Employee", "Leave Type", "Total", "Used", "Available"],
    balances.map((b) => [empName(b.employeeUid), b.leaveTypeName ?? b.leaveType ?? "", b.total ?? 0, b.used ?? 0, b.available ?? 0]),
    "leave-summary.csv"
  );
  const exportAttendance = () => exportToCSV(
    ["Employee", "Date", "Clock In", "Clock Out", "Mode", "Hours", "Status"],
    attendance.map((a) => [empName(a.employeeUid), formatDate(a.dateStr), a.clockIn ?? "", a.clockOut ?? "", a.clockInType ?? "", a.workedHours ?? "", a.status ?? ""]),
    "attendance-ledger.csv"
  );
  const exportPayroll = () => exportToCSV(
    ["Employee", "Month", "Net Pay", "Status", "Generated"],
    payslips.map((p) => [empName(p.employeeUid), p.month ?? "", p.netPay != null ? formatCurrency(p.netPay) : "", p.status ?? "", formatDate(p.generatedAt)]),
    "payroll-export.csv"
  );

  return (
    <section
      id="hr-reports-page"
      data-testid="hr-reports-page"
      className="page-section active"
      style={{ background: "var(--app-bg)", minWidth: 0 }}
    >
      <PageHeader
        title="Reports & Analytics"
        subtitle="Export workforce data across the organization"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <ReportCard icon={<Users className="h-5 w-5" />} title="Employee Directory" desc="All employees with role & status" count={employees.length} onExport={exportEmployees} busy={le} />
        <ReportCard icon={<CalendarDays className="h-5 w-5" />} title="Leave Summary" desc="Balances by type per employee" count={balances.length} onExport={exportLeaveSummary} busy={lb} />
        <ReportCard icon={<FileBarChart className="h-5 w-5" />} title="Hours & Days Worked" desc="Attendance ledger" count={attendance.length} onExport={exportAttendance} busy={la} />
        <ReportCard icon={<Wallet className="h-5 w-5" />} title="Payroll Export" desc="Payslips & net pay" count={payslips.length} onExport={exportPayroll} busy={lp} />
      </div>
    </section>
  );
}
