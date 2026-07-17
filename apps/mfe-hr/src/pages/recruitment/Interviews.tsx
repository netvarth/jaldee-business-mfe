import { useEffect, useState } from "react";
import { DataTable, Badge, Button, Input, ErrorState, EmptyState, Dialog, DialogFooter, Select, Textarea } from "@jaldee/design-system";
import { useInterviews, useApplications } from "../../services/useRecruitmentData";
import { ScheduleInterviewModal } from "./ScheduleInterviewModal";
import RecruitmentLayout from "./RecruitmentLayout";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";
import type { ColumnDef } from "@jaldee/design-system";
import type { Interview } from "../../types";

const INTERVIEW_OUTCOME_OPTIONS = [
  { value: "PROCEED", label: "Proceed" },
  { value: "REJECT", label: "Reject" },
  { value: "HOLD", label: "Hold" },
];

function interviewStatusLabel(status?: string) {
  const value = String(status ?? "").toUpperCase();
  if (value === "PROCEED") return "Proceed";
  if (value === "REJECT") return "Reject";
  if (value === "HOLD") return "Hold";
  return status || "-";
}

export default function Interviews() {
  const { data, loading, error, save, updateFeedback } = useInterviews();
  const { data: applications, reload: loadApplications } = useApplications({ autoload: false });
  const [search, setSearch] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();
  const [editing, setEditing] = useState<Interview | null>(null);
  const [status, setStatus] = useState("HOLD");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    if (!scheduleOpen) return;
    void loadApplications();
  }, [loadApplications, scheduleOpen]);

  const getInterviewCandidateName = (interview: Interview) =>
    interview.candidateName || "Unknown Candidate";

  const getInterviewRole = (interview: Interview) =>
    interview.requisitionTitle || "Unknown Role";

  const openUpdate = (interview: Interview) => {
    setEditing(interview);
    setStatus(String(interview.status || "HOLD").toUpperCase());
    setScore(interview.score == null ? "" : String(interview.score));
    setFeedback(interview.feedback || "");
  };

  const filtered = search
    ? data.filter((interview) => {
      const candidateName = getInterviewCandidateName(interview);
      const role = getInterviewRole(interview);
      const term = search.toLowerCase();
      return [
        interview.mode,
        interview.round,
        candidateName,
        role,
      ].some((value) => String(value ?? "").toLowerCase().includes(term));
    })
    : data;

  const statusVariant = (status?: string) => {
    const value = String(status ?? "").toUpperCase();
    if (value === "PROCEED") return "success";
    if (value === "REJECT") return "danger";
    return "warning";
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSavingFeedback(true);
    try {
      await updateFeedback(editing.uid ?? editing.id, {
        id: editing.uid ?? editing.id,
        applicationUid: editing.applicationUid ?? editing.applicationId,
        round: editing.round,
        scheduledAt: editing.scheduledAt,
        durationMinutes: editing.durationMinutes ?? 0,
        mode: editing.mode,
        locationOrLink: editing.locationOrLink ?? "",
        interviewerUids: editing.interviewerUids ?? [],
        outcome: status,
        score: score === "" ? null : score,
        feedback: feedback.trim() || null,
      });
      setEditing(null);
    } finally {
      setSavingFeedback(false);
    }
  };

  const columns: ColumnDef<Interview>[] = [
    {
      header: "Applicant",
      key: "applicationUid",
      render: (row) => (
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">{getInterviewCandidateName(row)}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{getInterviewRole(row)}</div>
          </div>
      ),
    },
    { header: "Scheduled At", key: "scheduledAt", render: (row) => (row.scheduledAt ? new Date(String(row.scheduledAt)).toLocaleString() : "-") },
    { header: "Round", key: "round", render: (row) => row.round || "-" },
    { header: "Mode", key: "mode" },
    { header: "Score", key: "score", render: (row) => (row.score ? `${row.score}/10` : "-") },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        return <Badge variant={statusVariant(row.status)}>{interviewStatusLabel(row.status)}</Badge>;
      },
    },
    {
      header: "",
      key: "id",
      align: "right",
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => openUpdate(row)}>
          Update
        </Button>
      ),
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
      <div>
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
                    title={getInterviewCandidateName(interview)}
                    subtitle={getInterviewRole(interview)}
                    rows={[
                      { label: "Scheduled At", value: interview.scheduledAt ? new Date(String(interview.scheduledAt)).toLocaleString() : "-" },
                      { label: "Round", value: interview.round || "-" },
                      { label: "Mode", value: interview.mode || "-" },
                      { label: "Score", value: interview.score ? `${interview.score}/10` : "-" },
                      { label: "Status", value: <Badge variant={statusVariant(interview.status)}>{interviewStatusLabel(interview.status)}</Badge> },
                    ]}
                    footer={
                      <Button variant="outline" size="sm" onClick={() => openUpdate(interview)}>
                        Update
                      </Button>
                    }
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
        candidates={[]}
        onSave={save}
      />

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Update Interview" size="md">
        <div className="grid gap-4">
          <Select
            id="hr-recruitment-interview-update-status"
            testId="hr-recruitment-interview-update-status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={INTERVIEW_OUTCOME_OPTIONS}
          />
          <Input
            id="hr-recruitment-interview-update-score"
            data-testid="hr-recruitment-interview-update-score"
            label="Score"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Enter score"
          />
          <Textarea
            id="hr-recruitment-interview-update-feedback"
            data-testid="hr-recruitment-interview-update-feedback"
            label="Feedback"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add interview feedback"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleUpdate()} loading={savingFeedback}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </RecruitmentLayout>
  );
}

function SearchIcon() {
  return <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
