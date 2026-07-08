type HrPageKind = "overview" | "attendance" | "leave" | "payroll" | "documents" | "tasks";

const PAGE_COPY: Record<HrPageKind, {
  title: string;
  description: string;
  stats: Array<{ label: string; value: string; detail: string }>;
  rows: Array<{ name: string; status: string; meta: string }>;
}> = {
  overview: {
    title: "HR overview",
    description: "A limited employee HR workspace for self-service, attendance, leave, payroll, documents, and assigned HR tasks.",
    stats: [
      { label: "Shift today", value: "9:30 AM", detail: "Current scheduled start" },
      { label: "Leave balance", value: "12", detail: "Available days" },
      { label: "Pending tasks", value: "4", detail: "Need employee action" },
    ],
    rows: [
      { name: "Complete profile verification", status: "Pending", meta: "Due today" },
      { name: "Review July shift roster", status: "Open", meta: "HR update" },
      { name: "Download latest payslip", status: "Available", meta: "Payroll" },
    ],
  },
  attendance: {
    title: "Attendance",
    description: "Track check-ins, shift timings, regularization requests, and attendance exceptions.",
    stats: [
      { label: "This month", value: "21", detail: "Present days" },
      { label: "Late marks", value: "1", detail: "Needs review" },
      { label: "Regularization", value: "2", detail: "Requests open" },
    ],
    rows: [
      { name: "Today check-in", status: "Recorded", meta: "9:28 AM" },
      { name: "Yesterday checkout", status: "Missing", meta: "Regularize" },
      { name: "Weekly summary", status: "Ready", meta: "Mon-Fri" },
    ],
  },
  leave: {
    title: "Leave",
    description: "Apply for leave, review balances, and track approval status.",
    stats: [
      { label: "Casual leave", value: "6", detail: "Days available" },
      { label: "Sick leave", value: "4", detail: "Days available" },
      { label: "Pending", value: "1", detail: "Manager approval" },
    ],
    rows: [
      { name: "Leave request", status: "Pending", meta: "Jul 18" },
      { name: "Sick leave balance", status: "Updated", meta: "4 days" },
      { name: "Holiday calendar", status: "Published", meta: "2026" },
    ],
  },
  payroll: {
    title: "Payroll",
    description: "Access payslips, deductions, reimbursements, and payroll documents.",
    stats: [
      { label: "Payslip", value: "Jun", detail: "Latest available" },
      { label: "Claims", value: "2", detail: "In review" },
      { label: "Tax docs", value: "Ready", detail: "FY 2026" },
    ],
    rows: [
      { name: "June payslip", status: "Available", meta: "Download" },
      { name: "Travel reimbursement", status: "In review", meta: "Submitted" },
      { name: "Tax declaration", status: "Draft", meta: "Update required" },
    ],
  },
  documents: {
    title: "Documents",
    description: "Store employee letters, certificates, IDs, and HR shared documents.",
    stats: [
      { label: "Uploaded", value: "8", detail: "Employee docs" },
      { label: "Expiring", value: "1", detail: "Needs renewal" },
      { label: "Shared", value: "5", detail: "From HR" },
    ],
    rows: [
      { name: "Employment letter", status: "Available", meta: "PDF" },
      { name: "ID proof", status: "Verified", meta: "Updated" },
      { name: "Address proof", status: "Expiring", meta: "Renew" },
    ],
  },
  tasks: {
    title: "HR tasks",
    description: "Complete assigned HR actions and employee workflow tasks.",
    stats: [
      { label: "Assigned", value: "5", detail: "Open tasks" },
      { label: "Due today", value: "2", detail: "Needs action" },
      { label: "Completed", value: "18", detail: "This month" },
    ],
    rows: [
      { name: "Confirm bank details", status: "Due today", meta: "Payroll" },
      { name: "Acknowledge policy update", status: "Open", meta: "HR" },
      { name: "Upload renewed ID", status: "Pending", meta: "Documents" },
    ],
  },
};

export default function HrPage({ kind }: { kind: HrPageKind }) {
  const page = PAGE_COPY[kind];

  return (
    <div className="space-y-5">
      <section className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-semibold text-slate-950">{page.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{page.description}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {page.stats.map((stat) => (
          <article key={stat.label} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{stat.value}</p>
            <p className="mt-2 text-sm text-slate-600">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Recent HR items</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {page.rows.map((row) => (
            <div key={row.name} className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_160px_160px] md:items-center">
              <span className="text-sm font-semibold text-slate-900">{row.name}</span>
              <span className="text-sm text-slate-600">{row.status}</span>
              <span className="text-sm text-slate-500">{row.meta}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
