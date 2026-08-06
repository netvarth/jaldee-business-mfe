import { useMemo, useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select } from "@jaldee/design-system";
import type { Application } from "../../types";

export interface NewOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  /** Posts the OfferDto to /recruitment/offers. */
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}

const statusOptions = [
  { value: "SENT", label: "Sent" },
  { value: "DRAFT", label: "Draft" },
];

export function NewOfferModal({ isOpen, onClose, applications, onSave }: NewOfferModalProps) {
  const [form, setForm] = useState({
    applicationUid: "",
    designation: "",
    annualCtc: "",
    currency: "INR",
    joiningDate: "",
    validTill: "",
    probationPeriod: "",
    status: "SENT",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicationOptions = useMemo(() => {
    const label = (a: Application) => {
      const cand = a.candidate;
      const name = cand?.name ?? `Candidate ${String(a.candidateId).slice(0, 6)}`;
      const role = a.requisition?.title ? ` — ${a.requisition.title}` : "";
      return `${name}${role}`;
    };
    return [
      { value: "", label: "Select application…" },
      ...applications.map((a) => ({ value: a.id, label: label(a) })),
    ];
  }, [applications]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicationUid) {
      setError("Select the application this offer is for.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        applicationUid: form.applicationUid,
        designation: form.designation || null,
        currency: form.currency || "INR",
        status: form.status,
      };
      if (form.annualCtc) payload.annualCtc = Number(form.annualCtc);
      if (form.joiningDate) payload.joiningDate = form.joiningDate;
      if (form.validTill) payload.validTill = form.validTill;
      if (form.probationPeriod) payload.probationPeriod = form.probationPeriod;

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create offer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="New Offer" size="md" testId="hr-recruitment-new-offer-dialog">
      <form data-testid="hr-recruitment-new-offer-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div data-testid="hr-recruitment-new-offer-error" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Select
          id="hr-recruitment-new-offer-application"
          testId="hr-recruitment-new-offer-application"
          label="Application"
          required
          options={applicationOptions}
          value={form.applicationUid}
          onChange={set("applicationUid")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="hr-recruitment-new-offer-designation" data-testid="hr-recruitment-new-offer-designation" label="Designation" value={form.designation} onChange={set("designation")} placeholder="e.g. Software Engineer" />
          <Select id="hr-recruitment-new-offer-status" testId="hr-recruitment-new-offer-status" label="Status" options={statusOptions} value={form.status} onChange={set("status")} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="hr-recruitment-new-offer-ctc" data-testid="hr-recruitment-new-offer-ctc" label="Annual CTC" type="number" min={0} value={form.annualCtc} onChange={set("annualCtc")} placeholder="e.g. 1200000" />
          <Input label="Currency" value={form.currency} onChange={set("currency")} placeholder="INR" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="hr-recruitment-new-offer-joining-date" data-testid="hr-recruitment-new-offer-joining-date" label="Joining Date" type="date" value={form.joiningDate} onChange={set("joiningDate")} />
          <Input id="hr-recruitment-new-offer-valid-till" data-testid="hr-recruitment-new-offer-valid-till" label="Valid Till" type="date" value={form.validTill} onChange={set("validTill")} />
        </div>

        <Input label="Probation Period" value={form.probationPeriod} onChange={set("probationPeriod")} placeholder="e.g. 3 months" />

        <DialogFooter>
          <Button data-testid="hr-recruitment-new-offer-cancel" variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button data-testid="hr-recruitment-new-offer-submit" variant="primary" type="submit" loading={loading}>
            Create Offer
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
