import { useState } from "react";
import { DataTable, Badge, Button, Input, ErrorState, EmptyState } from "@jaldee/design-system";
import { useInterviews, useApplications, useCandidates } from "../../services/useRecruitmentData";
import { ScheduleInterviewModal } from "./ScheduleInterviewModal";
import RecruitmentLayout from "./RecruitmentLayout";
import type { ColumnDef } from "@jaldee/design-system";
import type { Interview } from "../../types";

export default function Interviews() {
  const { data, loading, error, save } = useInterviews();
  const { data: applications } = useApplications();
  const { data: candidates } = useCandidates();
  const [search, setSearch] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const filtered = search
    ? data.filter(i => i.mode?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const columns: ColumnDef<Interview>[] = [
    { header: "Scheduled At", key: "scheduledAt", render: (row) => (row.scheduledAt ? new Date(String(row.scheduledAt)).toLocaleString() : "—") },
    { header: "Mode", key: "mode" },
    { header: "Score", key: "score", render: (row) => (row.score ? `${row.score}/10` : "—") },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const v = String(row.status);
        const variant = v === "Completed" ? "success" : v === "Cancelled" ? "danger" : "warning";
        return <Badge variant={variant}>{v}</Badge>;
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
      <div className="p-8">
        <div className="rounded-xl border border-gray-200 bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <Input
              placeholder="Search interviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="max-w-xs"
              icon={<SearchIcon />}
            />
            <Button variant="primary" onClick={() => setScheduleOpen(true)}>
              + Schedule Interview
            </Button>
          </div>

          {/* Table */}
          <div className="p-0">
            {!loading && filtered.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Interviews" description="Schedule interviews to evaluate candidates." />
              </div>
            ) : (
              <DataTable
                data={filtered}
                columns={columns}
                loading={loading}
              />
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
