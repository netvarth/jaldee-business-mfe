import { Skeleton, ErrorState, DataTable, Badge } from "@jaldee/design-system";
import { useNavigate } from "react-router-dom";
import { useDashboardStats, useJobRequisitions, useCandidates } from "../../services/useRecruitmentData";
import RecruitmentLayout from "./RecruitmentLayout";
import type { ColumnDef } from "@jaldee/design-system";
import type { JobRequisition, Candidate } from "../../types";
import { useShellErrorToast } from "../../services/useShellFeedback";

export default function RecruitmentDashboard() {
  const navigate = useNavigate();
  const { data: stats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { data: reqs, loading: reqsLoading } = useJobRequisitions();
  const { data: cands, loading: candsLoading } = useCandidates();
  useShellErrorToast("hr.recruitment.dashboard", "Recruitment", statsError);

  if (statsError) {
    return (
      <RecruitmentLayout title="Recruitment Dashboard" subtitle="Overview of hiring pipeline and metrics.">
        <ErrorState title="Failed to load dashboard" description={statsError} />
      </RecruitmentLayout>
    );
  }

  const reqColumns: ColumnDef<JobRequisition>[] = [
    { header: "Title", key: "title" },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const v = String(row.status ?? "").toUpperCase();
        const variant = v === "OPEN" ? "success" : v === "CLOSED" || v === "FILLED" ? "danger" : v === "ON_HOLD" ? "warning" : "neutral";
        return <Badge variant={variant}>{v || "—"}</Badge>;
      },
    },
  ];

  const candColumns: ColumnDef<Candidate>[] = [
    { header: "Name", key: "name" },
    { header: "Role", key: "currentDesignation", render: (row) => row.currentDesignation || "N/A" },
  ];

  return (
    <RecruitmentLayout title="Recruitment Dashboard" subtitle="Overview of hiring pipeline and metrics.">
      <div id="hr-recruitment-dashboard" data-testid="hr-recruitment-dashboard">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statsLoading || !stats ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <KpiCard testId="open-requisitions" label="Open Requisitions" value={stats.openRequisitions || reqs.filter(r => r.status === "OPEN").length} icon={<BriefcaseIcon />} />
              <KpiCard testId="total-candidates" label="Total Candidates" value={stats.totalCandidates || cands.length} icon={<UsersIcon />} />
              <KpiCard testId="hired-candidates" label="Hired Candidates" value={stats.hiredCount || 0} icon={<CheckCircleIcon />} />
              <KpiCard testId="interviews" label="Interviews" value={0} icon={<CalendarIcon />} />
              <KpiCard testId="pending-offers" label="Pending Offers" value={0} icon={<MailIcon />} />
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-5">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Requisitions</h3>
              <button data-testid="hr-recruitment-view-requisitions" type="button" onClick={() => navigate("/recruitment/requisitions")} className="text-sm font-semibold text-[var(--color-text-link)]">
                View all
              </button>
            </div>
            <div className="flex-1 p-0">
              {reqsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : reqs.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">No requisitions found.</div>
              ) : (
                <DataTable
                  data={reqs.slice(0, 5)}
                  columns={reqColumns}
                  loading={false}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-5">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Candidates</h3>
              <button data-testid="hr-recruitment-view-candidates" type="button" onClick={() => navigate("/recruitment/candidates")} className="text-sm font-semibold text-[var(--color-text-link)]">
                View all
              </button>
            </div>
            <div className="flex-1 p-0">
              {candsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : cands.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">No candidates found.</div>
              ) : (
                <DataTable
                  data={cands.slice(0, 5)}
                  columns={candColumns}
                  loading={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </RecruitmentLayout>
  );
}

/* ---------- Sub-components ---------- */

function KpiCard({ testId, label, value, icon }: { testId: string; label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div data-testid={`hr-recruitment-kpi-${testId}`} className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-primary)]">
        {icon}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      </div>
    </div>
  );
}

/* ---------- Icons ---------- */
function BriefcaseIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a1 1 0 00-1 1v10a2 2 0 002 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>;
}
function UsersIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function CheckCircleIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function CalendarIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function MailIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
}
