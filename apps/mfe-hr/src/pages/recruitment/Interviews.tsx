import { useState } from "react";
import { DataTable, Badge, Button, Input, ErrorState, EmptyState } from "@jaldee/design-system";
import { useInterviews, useApplications, useCandidates } from "../../services/useRecruitmentData";
import { ScheduleInterviewModal } from "./ScheduleInterviewModal";
import RecruitmentLayout from "./RecruitmentLayout";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";
import type { ColumnDef } from "@jaldee/design-system";
import type { Interview } from "../../types";

export default function Interviews() {
  const { data, loading, error, save } = useInterviews();
  const { data: applications } = useApplications();
  const { data: candidates } = useCandidates();
  const [search, setSearch] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();

  const filtered = search
    ? data.filter((interview) => interview.mode?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const statusVariant = (status?: string) => {
    const value = String(status ?? "");
    if (value === "Completed") return "success";
    if (value === "Cancelled") return "danger";
    return "warning";
  };

  const columns: ColumnDef<Interview>[] = [
    { header: "Scheduled At", key: "scheduledAt", render: (row) => (row.scheduledAt ? new Date(String(row.scheduledAt)).toLocaleString() : "-") },
    { header: "Mode", key: "mode" },
    { header: "Score", key: "score", render: (row) => (row.score ? `${row.score}/10` : "-") },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const value = String(row.status);
        return <Badge variant={statusVariant(value)}>{value}</Badge>;
      },
    },
  ];

  if (error) {
    return (
      <RecruitmentLayout title="Interviews" subtitle="Schedule and evaluate candidate interviews.">
        <ErrorState title="Failed to load Interviews" description={error} />
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout title="Interviews" subtitle="Schedule and evaluate candidate interviews.">
      <div className="p-4 md:p-6">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex w-full items-center justify-between gap-3 flex-wrap md:w-auto md:order-2 md:flex-row md:items-center">
              <Button variant="primary" data-testid="hr-recruitment-schedule-interview" onClick={() => setScheduleOpen(true)}>
                + Schedule Interview
              </Button>
              <div className="ml-auto shrink-0">
                <RecruitmentViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  tableTestId="hr-recruitment-interviews-view-table"
                  cardsTestId="hr-recruitment-interviews-view-cards"
                />
              </div>
            </div>
            <Input
              id="hr-recruitment-interviews-search"
              data-testid="hr-recruitment-interviews-search"
              placeholder="Search interviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="w-full md:order-1 md:max-w-xs"
              icon={<SearchIcon />}
            />
          </div>

          <div className="p-0">
            {!loading && filtered.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Interviews" description="Schedule interviews to evaluate candidates." />
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {filtered.map((interview) => (
                  <RecruitmentMobileCard
                    key={interview.id}
                    title={interview.mode || "Interview"}
                    rows={[
                      { label: "Scheduled At", value: interview.scheduledAt ? new Date(String(interview.scheduledAt)).toLocaleString() : "-" },
                      { label: "Mode", value: interview.mode || "-" },
                      { label: "Score", value: interview.score ? `${interview.score}/10` : "-" },
                      { label: "Status", value: <Badge variant={statusVariant(interview.status)}>{interview.status || "-"}</Badge> },
                    ]}
                  />
                ))}
              </div>
            ) : (
              <DataTable data={filtered} columns={columns} loading={loading} />
            )}
          </div>
        </div>
      </div>

      <ScheduleInterviewModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        applications={applications}
        candidates={candidates}
        onSave={save}
      />
    </RecruitmentLayout>
  );
}

function SearchIcon() {
  return <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
