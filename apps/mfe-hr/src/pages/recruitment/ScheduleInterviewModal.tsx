import { useMemo, useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select } from "@jaldee/design-system";
import type { Application, Candidate } from "../../types";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  candidates: Candidate[];
  /** Posts the InterviewDto to /recruitment/interviews. */
  onSave: (payload: Record<string, unknown>) => Promise<void>;
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

export function ScheduleInterviewModal({ isOpen, onClose, applications, candidates, onSave }: ScheduleInterviewModalProps) {
  const [form, setForm] = useState({
    applicationUid: "",
    round: "SCREENING",
    scheduledAt: "",
    durationMinutes: "60",
    mode: "VIDEO",
    locationOrLink: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicationOptions = useMemo(() => {
    const label = (a: Application) => {
      const cand = a.candidate ?? candidates.find((c) => c.id === a.candidateId);
      const name = cand?.name ?? `Candidate ${String(a.candidateId).slice(0, 6)}`;
      const role = a.requisition?.title ? ` — ${a.requisition.title}` : "";
      return `${name}${role}`;
    };
    return [
      { value: "", label: "Select application…" },
      ...applications.map((a) => ({ value: a.id, label: label(a) })),
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
        // datetime-local → ISO with offset so it parses as OffsetDateTime.
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      };
      if (form.durationMinutes) payload.durationMinutes = Number(form.durationMinutes);
      if (form.locationOrLink) payload.locationOrLink = form.locationOrLink;

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule interview.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Schedule Interview" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Select
          label="Application"
          required
          options={applicationOptions}
          value={form.applicationUid}
          onChange={set("applicationUid")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Round" options={roundOptions} value={form.round} onChange={set("round")} />
          <Select label="Mode" options={modeOptions} value={form.mode} onChange={set("mode")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Scheduled At" type="datetime-local" required value={form.scheduledAt} onChange={set("scheduledAt")} />
          <Input label="Duration (min)" type="number" min={0} value={form.durationMinutes} onChange={set("durationMinutes")} />
        </div>

        <Input
          label="Location / Link"
          value={form.locationOrLink}
          onChange={set("locationOrLink")}
          placeholder="Meeting link or office location"
        />

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Schedule
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
