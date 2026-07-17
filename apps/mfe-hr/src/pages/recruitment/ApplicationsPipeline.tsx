import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KanbanBoard, ErrorState, EmptyState, Skeleton, Button, Dialog, DialogFooter, Input, Textarea, Popover, PopoverSection } from "@jaldee/design-system";
import { MoreVertical } from "lucide-react";
import { useApplications, useInterviews } from "../../services/useRecruitmentData";
import { ConvertToEmployeeModal } from "./ConvertToEmployeeModal";
import { ScheduleInterviewModal } from "./ScheduleInterviewModal";
import RecruitmentLayout from "./RecruitmentLayout";
import type { Application } from "../../types";

const STAGES = [
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEW", label: "Interview" },
];
const MOVABLE_STAGES = STAGES;

export default function ApplicationsPipeline() {
  const navigate = useNavigate();
  const { data, loading, error, updateStage, addNote, updateRating, hire } = useApplications();
  const { save: saveInterview } = useInterviews({ autoload: false });
  const [onboarding, setOnboarding] = useState<Application | null>(null);
  const [noteTarget, setNoteTarget] = useState<Application | null>(null);
  const [ratingTarget, setRatingTarget] = useState<Application | null>(null);
  const [screeningTarget, setScreeningTarget] = useState<Application | null>(null);
  const [interviewTarget, setInterviewTarget] = useState<Application | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [ratingValue, setRatingValue] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null);

  if (error) {
    return (
      <RecruitmentLayout title="Applications Pipeline" subtitle="Drag and drop applications across recruitment stages.">
        <ErrorState title="Failed to load Applications" description={error} />
      </RecruitmentLayout>
    );
  }

  const kanbanItems = data.map((app) => ({
    ...app,
    columnId: app.stage || "APPLIED",
  }));

  const handleDragEnd = (itemId: string, newColumnId: string) => {
    void updateStage(itemId, newColumnId);
  };

  const handleStageChange = async (app: Application, stage: string) => {
    if (!stage || stage === (app.stage || "APPLIED")) return;
    if (stage === "SCREENING") {
      setActionError(null);
      setScreeningTarget(app);
      return;
    }
    if (stage === "INTERVIEW") {
      setActionError(null);
      setInterviewTarget(app);
      return;
    }
    setActionError(null);
    setStageUpdatingId(app.id);
    try {
      await updateStage(app.id, stage);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update stage.");
    } finally {
      setStageUpdatingId(null);
    }
  };

  const handleScreeningScheduleSave = async (payload: Record<string, unknown>) => {
    if (!screeningTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await saveInterview(payload);
      await updateStage(screeningTarget.id, "SCREENING");
      setScreeningTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to move application to screening.");
      throw error;
    } finally {
      setActionBusy(false);
    }
  };

  const handleInterviewScheduleSave = async (payload: Record<string, unknown>) => {
    if (!interviewTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await saveInterview(payload);
      await updateStage(interviewTarget.id, "INTERVIEW");
      setInterviewTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to move application to interview.");
      throw error;
    } finally {
      setActionBusy(false);
    }
  };

  const handleHire = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    setOnboarding(app);
  };

  const openNoteDialog = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    setActionError(null);
    setNoteTarget(app);
    setNoteValue(app.notes || "");
  };

  const openRatingDialog = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    setActionError(null);
    setRatingTarget(app);
    setRatingValue(app.rating != null ? String(app.rating) : "");
  };

  const openRejectDialog = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    setActionError(null);
    setRejectTarget(app);
    setRejectReason(app.rejectionReason || "");
  };

  const handleSaveNote = async () => {
    if (!noteTarget) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await addNote(noteTarget.id, noteValue.trim());
      setNoteTarget(null);
      setNoteValue("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update notes.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveRating = async () => {
    if (!ratingTarget) return;
    const parsed = Number(ratingValue);
    if (!Number.isFinite(parsed)) {
      setActionError("Enter a valid rating.");
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await updateRating(ratingTarget.id, parsed);
      setRatingTarget(null);
      setRatingValue("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update rating.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setActionError("Enter the rejection reason.");
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await updateStage(rejectTarget.id, "REJECTED", rejectReason.trim());
      setRejectTarget(null);
      setRejectReason("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to reject application.");
    } finally {
      setActionBusy(false);
    }
  };

  const openCandidate = (app: Application) => {
    const candidateKey = app.candidate?.uid ?? app.candidate?.id ?? app.candidateUid ?? app.candidateId;
    if (!candidateKey) return;
    navigate(`/recruitment/candidates/${candidateKey}`, { state: { returnTo: "/recruitment/applications" } });
  };

  const renderCard = (item: unknown) => {
    const app = item as Application;

    return (
      <div
        className="mb-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        onClick={() => openCandidate(app)}
      >
        <h4 className="text-sm font-semibold text-gray-900">{app.candidate?.name || "Unknown Candidate"}</h4>
        <p className="mt-0.5 text-xs text-gray-500">{app.requisition?.title || "Unknown Role"}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>REQ: {app.requisitionId?.substring(0, 8)}</span>
          <span>{app.id?.substring(0, 8)}</span>
        </div>
        <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <ApplicationActions
            app={app}
            busy={stageUpdatingId === app.id || actionBusy}
            onStageChange={handleStageChange}
            onNotes={openNoteDialog}
            onRating={openRatingDialog}
            onReject={openRejectDialog}
            onHire={handleHire}
          />
        </div>
      </div>
    );
  };

  return (
    <RecruitmentLayout title="Applications Pipeline" subtitle="Drag and drop applications across recruitment stages.">
      <div>
        <div className="mb-4 flex w-full items-center justify-between gap-3 flex-wrap rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="text-sm text-gray-500">Review applications by stage and move candidates through the pipeline.</div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="h-full min-w-0">
          {loading ? (
            <div className="flex gap-6">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[400px] w-[260px] rounded-xl" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState title="No Applications" description="Wait for candidates to apply." />
          ) : (
            <KanbanBoard
              columns={STAGES}
              items={kanbanItems}
              onDragEnd={handleDragEnd}
              renderCard={renderCard}
              className="h-full"
            />
          )}
          </div>
        </div>
      </div>

      {onboarding ? (
        <ConvertToEmployeeModal
          key={onboarding.id}
          isOpen
          onClose={() => setOnboarding(null)}
          offer={null}
          candidate={onboarding.candidate ?? null}
          applicationId={onboarding.id}
          onConvert={hire}
        />
      ) : null}

      <ScheduleInterviewModal
        isOpen={!!screeningTarget}
        onClose={() => setScreeningTarget(null)}
        applications={data}
        candidates={[]}
        onSave={handleScreeningScheduleSave}
        initialApplicationUid={screeningTarget?.id}
        lockApplication
        hideRound
        initialRound="SCREENING"
      />

      <ScheduleInterviewModal
        isOpen={!!interviewTarget}
        onClose={() => setInterviewTarget(null)}
        applications={data}
        candidates={[]}
        onSave={handleInterviewScheduleSave}
        initialApplicationUid={interviewTarget?.id}
        lockApplication
        initialRound="TECH_1"
      />

      <Dialog open={!!noteTarget} onClose={() => setNoteTarget(null)} title="Update Application Notes" size="md">
        <div className="space-y-4">
          <Textarea
            label="Notes"
            rows={4}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Add recruiter notes for this application"
          />
          {actionError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTarget(null)} disabled={actionBusy}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleSaveNote()} loading={actionBusy}>Save Notes</Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={!!ratingTarget} onClose={() => setRatingTarget(null)} title="Update Application Rating" size="sm">
        <div className="space-y-4">
          <Input
            label="Rating"
            type="number"
            min={0}
            max={10}
            value={ratingValue}
            onChange={(e) => setRatingValue(e.target.value)}
            placeholder="Enter rating"
          />
          {actionError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingTarget(null)} disabled={actionBusy}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleSaveRating()} loading={actionBusy}>Save Rating</Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Application" size="md">
        <div className="space-y-4">
          <Textarea
            label="Rejection Reason"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter the reason for rejection"
          />
          {actionError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={actionBusy}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleRejectApplication()} loading={actionBusy}>Reject</Button>
          </DialogFooter>
        </div>
      </Dialog>
    </RecruitmentLayout>
  );
}

function ApplicationActions({
  app,
  busy,
  onStageChange,
  onNotes,
  onRating,
  onReject,
  onHire,
}: {
  app: Application;
  busy: boolean;
  onStageChange: (app: Application, stage: string) => Promise<void>;
  onNotes: (e: React.MouseEvent, app: Application) => void;
  onRating: (e: React.MouseEvent, app: Application) => void;
  onReject: (e: React.MouseEvent, app: Application) => void;
  onHire: (e: React.MouseEvent, app: Application) => void;
}) {
  const currentStage = app.stage || "APPLIED";
  const [open, setOpen] = useState(false);

  const handleStageAction = (stage: string) => {
    setOpen(false);
    void onStageChange(app, stage);
  };

  const handleNotesAction = (e: React.MouseEvent) => {
    setOpen(false);
    onNotes(e, app);
  };

  const handleRatingAction = (e: React.MouseEvent) => {
    setOpen(false);
    onRating(e, app);
  };

  const handleHireAction = (e: React.MouseEvent) => {
    setOpen(false);
    onHire(e, app);
  };

  const handleRejectAction = (e: React.MouseEvent) => {
    setOpen(false);
    onReject(e, app);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      portal
      data-testid={`hr-recruitment-application-actions-${app.id}`}
      contentClassName="min-w-[190px] p-2"
      trigger={
        <button
          type="button"
          aria-label="More actions"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <MoreVertical size={18} />
        </button>
      }
    >
      <PopoverSection className="space-y-1">
        {MOVABLE_STAGES.filter((stage) => stage.id !== currentStage).map((stage) => (
          <button
            key={stage.id}
            type="button"
            disabled={busy}
            onClick={() => handleStageAction(stage.id)}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Move to {stage.label}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={handleNotesAction}
          className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Notes
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleRatingAction}
          className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rating
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleRejectAction}
          className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>
        {app.stage === "HIRED" ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleHireAction}
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Onboard Employee
          </button>
        ) : null}
      </PopoverSection>
    </Popover>
  );
}
