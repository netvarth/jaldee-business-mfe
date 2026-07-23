import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select } from "@jaldee/design-system";
import type { Application, Candidate } from "../../types";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  candidates: Candidate[];
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  initialApplicationUid?: string;
  lockApplication?: boolean;
  hideRound?: boolean;
  initialRound?: string;
}

const roundOptions = [
  { value: "SCREENING", label: "Screening" },
  { value: "TECH_1", label: "Technical 1" },
  { value: "TECH_2", label: "Technical 2" },
  { value: "HR", label: "HR" },
  { value: "MANAGERIAL", label: "Managerial" },
];

const modeOptions = [
  { value: "VIDEO", label: "Video" },
  { value: "ONSITE", label: "Onsite" },
  { value: "PHONE", label: "Phone" },
];

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  applications,
  candidates,
  onSave,
  initialApplicationUid,
  lockApplication = false,
  hideRound = false,
  initialRound = "SCREENING",
}: ScheduleInterviewModalProps) {
  const createInitialForm = () => ({
    applicationUid: initialApplicationUid || "",
    round: initialRound,
    scheduledAt: "",
    durationMinutes: "60",
    mode: "VIDEO",
    locationOrLink: "",
  });

  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(createInitialForm());
    setError(null);
  }, [initialApplicationUid, initialRound, isOpen]);

  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === form.applicationUid || item.uid === form.applicationUid) ?? null,
    [applications, form.applicationUid]
  );

  const selectedCandidate = useMemo(() => {
    if (!selectedApplication) return null;
    return (
      selectedApplication.candidate ??
      candidates.find((candidate) =>
        candidate.id === selectedApplication.candidateId ||
        candidate.uid === selectedApplication.candidateUid
      ) ??
      null
    );
  }, [candidates, selectedApplication]);

  const applicationOptions = useMemo(() => {
    const label = (application: Application) => {
      const candidate = application.candidate ?? candidates.find((item) => item.id === application.candidateId);
      const name = candidate?.name ?? `Candidate ${String(application.candidateId).slice(0, 6)}`;
      const role = application.requisition?.title ? ` - ${application.requisition.title}` : "";
      return `${name}${role}`;
    };

    return [
      { value: "", label: "Select application..." },
      ...applications.map((application) => ({ value: application.id, label: label(application) })),
    ];
  }, [applications, candidates]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicationUid) {
      setError("Select the application to interview.");
      return;
    }
    if (!form.scheduledAt) {
      setError("Pick a date and time.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        applicationUid: form.applicationUid,
        round: form.round,
        mode: form.mode,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      };
      if (form.durationMinutes) payload.durationMinutes = Number(form.durationMinutes);
      if (form.locationOrLink) payload.locationOrLink = form.locationOrLink;

      await onSave(payload);
      setForm(createInitialForm());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule interview.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Schedule Interview" size="md" testId="hr-recruitment-schedule-interview-dialog">
      <form data-testid="hr-recruitment-schedule-interview-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {lockApplication ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-3">
            <div className="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Application</div>
            <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
              {selectedCandidate?.name || "Candidate"}
              {selectedApplication?.requisition?.title ? ` - ${selectedApplication.requisition.title}` : ""}
            </div>
          </div>
        ) : (
          <Select
            id="hr-recruitment-schedule-interview-application"
            testId="hr-recruitment-schedule-interview-application"
            label="Application"
            required
            options={applicationOptions}
            value={form.applicationUid}
            onChange={set("applicationUid")}
          />
        )}

        <div className={`grid gap-4 ${hideRound ? "grid-cols-1" : "grid-cols-2"}`}>
          {!hideRound ? (
            <Select id="hr-recruitment-schedule-interview-round" testId="hr-recruitment-schedule-interview-round" label="Round" options={roundOptions} value={form.round} onChange={set("round")} />
          ) : null}
          <Select id="hr-recruitment-schedule-interview-mode" testId="hr-recruitment-schedule-interview-mode" label="Mode" options={modeOptions} value={form.mode} onChange={set("mode")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="hr-recruitment-schedule-interview-at" data-testid="hr-recruitment-schedule-interview-at" label="Scheduled At" type="datetime-local" required value={form.scheduledAt} onChange={set("scheduledAt")} />
          <Input id="hr-recruitment-schedule-interview-duration" data-testid="hr-recruitment-schedule-interview-duration" label="Duration (min)" type="number" min={0} value={form.durationMinutes} onChange={set("durationMinutes")} />
        </div>

        <Input
          id="hr-recruitment-schedule-interview-location"
          data-testid="hr-recruitment-schedule-interview-location"
          label="Location / Link"
          value={form.locationOrLink}
          onChange={set("locationOrLink")}
          placeholder="Meeting link or office location"
        />

        <DialogFooter>
          <Button data-testid="hr-recruitment-schedule-interview-cancel" variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button data-testid="hr-recruitment-schedule-interview-submit" variant="primary" type="submit" loading={loading}>
            Schedule
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
