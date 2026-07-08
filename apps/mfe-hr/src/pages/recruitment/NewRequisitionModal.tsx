import { useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select, Textarea } from "@jaldee/design-system";
import type { JobRequisition } from "../../types";

export interface NewRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (req: Partial<JobRequisition>) => Promise<void>;
}

const employmentTypeOptions = [
  { value: "FullTime", label: "Full Time" },
  { value: "PartTime", label: "Part Time" },
  { value: "Contract", label: "Contract" },
  { value: "Intern", label: "Intern" },
  { value: "Consultant", label: "Consultant" },
];

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
];

export function NewRequisitionModal({ isOpen, onClose, onSave }: NewRequisitionModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    employmentType: "FullTime",
    openings: 1,
    experienceRequired: "",
    jobDescription: "",
    status: "OPEN",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSave({
        title: formData.title,
        employmentType: formData.employmentType,
        openings: Number(formData.openings),
        experienceRequired: formData.experienceRequired || undefined,
        jobDescription: formData.jobDescription || "No description provided.",
        status: formData.status,
        departmentUid: crypto.randomUUID(),
        branchUid: crypto.randomUUID(),
        hiringManagerUid: crypto.randomUUID(),
      });
      setFormData({ title: "", employmentType: "FullTime", openings: 1, experienceRequired: "", jobDescription: "", status: "OPEN" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create requisition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      testId="hr-recruitment-requisition-dialog"
      title="Create New Requisition"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          id="hr-recruitment-requisition-title"
          data-testid="hr-recruitment-requisition-title"
          label="Job Title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Senior Frontend Engineer"
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="hr-recruitment-requisition-employment-type"
            testId="hr-recruitment-requisition-employment-type"
            label="Employment Type"
            options={employmentTypeOptions}
            value={formData.employmentType}
            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
          />
          <Input
            id="hr-recruitment-requisition-openings"
            data-testid="hr-recruitment-requisition-openings"
            label="Openings"
            type="number"
            min={1}
            required
            value={String(formData.openings)}
            onChange={(e) => setFormData({ ...formData, openings: Number(e.target.value) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="hr-recruitment-requisition-experience"
            data-testid="hr-recruitment-requisition-experience"
            label="Experience Required"
            value={formData.experienceRequired}
            onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
            placeholder="e.g. 3-5 years"
          />
          <Select
            id="hr-recruitment-requisition-status"
            testId="hr-recruitment-requisition-status"
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
        </div>
        <Textarea
          id="hr-recruitment-requisition-description"
          data-testid="hr-recruitment-requisition-description"
          label="Job Description"
          value={formData.jobDescription}
          onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
          placeholder="Describe the role, responsibilities, and requirements..."
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" type="button" data-testid="hr-recruitment-requisition-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" data-testid="hr-recruitment-requisition-submit" loading={loading}>
            Create Requisition
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
