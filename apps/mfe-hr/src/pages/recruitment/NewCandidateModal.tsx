import { useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select, Textarea } from "@jaldee/design-system";
import type { Candidate } from "../../types";

export interface NewCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (candidate: Partial<Candidate>) => Promise<void>;
}

const sourceOptions = [
  { value: "JOB_PORTAL", label: "Job Portal" },
  { value: "REFERRAL", label: "Referral" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "WALK_IN", label: "Walk-In" },
  { value: "AGENCY", label: "Agency" },
];

export function NewCandidateModal({ isOpen, onClose, onSave }: NewCandidateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    experienceYears: 0,
    currentCompany: "",
    currentDesignation: "",
    skills: "",
    source: "JOB_PORTAL",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSave({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "Not Provided",
        experienceYears: Number(formData.experienceYears),
        currentCompany: formData.currentCompany || undefined,
        currentDesignation: formData.currentDesignation || undefined,
        skills: formData.skills || undefined,
        source: formData.source,
        notes: formData.notes || undefined,
      });
      setFormData({ name: "", email: "", phone: "", experienceYears: 0, currentCompany: "", currentDesignation: "", skills: "", source: "PORTAL", notes: "" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Add Candidate"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          label="Full Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Jane Doe"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g. jane@example.com"
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g. +91 98765 43210"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Experience (Years)"
            type="number"
            min={0}
            required
            value={String(formData.experienceYears)}
            onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
          />
          <Select
            label="Source"
            options={sourceOptions}
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Current Company"
            value={formData.currentCompany}
            onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
            placeholder="e.g. Acme Corp"
          />
          <Input
            label="Current Designation"
            value={formData.currentDesignation}
            onChange={(e) => setFormData({ ...formData, currentDesignation: e.target.value })}
            placeholder="e.g. Software Engineer"
          />
        </div>
        <Input
          label="Skills"
          value={formData.skills}
          onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
          placeholder="e.g. Java, React, Spring Boot"
        />
        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes..."
          rows={2}
        />
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Save Candidate
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
