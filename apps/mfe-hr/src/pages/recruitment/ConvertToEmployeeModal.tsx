import { useState } from "react";
import { Dialog, DialogFooter, Button, Input, Select } from "@jaldee/design-system";
import { useBranches } from "../../services/useBranches";
import { useDesignations, useDepartments } from "../../services/useSettingsData";
import type { Offer, Candidate } from "../../types";

export interface ConvertToEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  /** Candidate resolved from the offer's application, used to prefill. */
  candidate?: Candidate | null;
  /** Application uid the backend hires against (offer.applicationId). */
  applicationId?: string;
  /** Posts the CreateEmployeeRequest to /recruitment/applications/{id}/hire. */
  onConvert: (applicationId: string, request: Record<string, unknown>) => Promise<void>;
}

const employmentTypeOptions = [
  { value: "FullTime", label: "Full Time" },
  { value: "PartTime", label: "Part Time" },
  { value: "Contract", label: "Contract" },
  { value: "Intern", label: "Intern" },
  { value: "Consultant", label: "Consultant" },
];

const genderOptions = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

function genEmployeeId() {
  return `EMP${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Converts an accepted offer's candidate into an employee. Prefills identity
 * from the candidate and CTC from the offer, then collects the fields the
 * backend requires (employee ID, location, joining date) before hiring.
 */
export function ConvertToEmployeeModal({
  isOpen,
  onClose,
  offer,
  candidate,
  applicationId,
  onConvert,
}: ConvertToEmployeeModalProps) {
  const { data: branches } = useBranches();
  const { data: designations } = useDesignations();
  const { data: departments } = useDepartments();

  const [form, setForm] = useState(() => ({
    employeeId: genEmployeeId(),
    name: candidate?.name ?? "",
    email: candidate?.email ?? "",
    contactNumber: candidate?.phone ?? "",
    gender: "MALE",
    // Prefer the offer's agreed joining date; fall back to today.
    doj: offer?.joiningDate ? String(offer.joiningDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    // Prefer the offered designation; fall back to the candidate's current one.
    designation: offer?.designation ?? candidate?.currentDesignation ?? "",
    department: "",
    employmentType: "FullTime",
    branchUid: offer?.branchUid ?? "",
    baseSalary: offer?.offeredSalary != null ? String(offer.offeredSalary) : "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const branchOptions = [
    { value: "", label: "Select location…" },
    ...branches.map((b) => ({ value: b.id, label: b.name })),
  ];
  const designationOptions = [
    { value: "", label: "Select…" },
    ...designations.map((d) => ({ value: d.name ?? "", label: d.name ?? "—" })),
  ];
  const departmentOptions = [
    { value: "", label: "Select…" },
    ...departments.map((d) => ({ value: d.name ?? "", label: d.name ?? "—" })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId) {
      setError("This offer has no linked application to hire against.");
      return;
    }
    if (!form.employeeId.trim()) {
      setError("Employee ID is required.");
      return;
    }
    if (!form.contactNumber.trim()) {
      setError("Contact number is required.");
      return;
    }
    if (!form.branchUid) {
      setError("Work location is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const request: Record<string, unknown> = {
        employeeId: form.employeeId.trim(),
        name: form.name,
        email: form.email,
        contactNumber: form.contactNumber.trim(),
        gender: form.gender || null,
        doj: form.doj || null,
        designation: form.designation || null,
        department: form.department || null,
        employmentType: form.employmentType,
        role: "employee",
        locationUid: form.branchUid,
      };
      if (form.baseSalary) request.salaryStructure = { basic: Number(form.baseSalary) };
      const desigLevel = designations.find((d) => d.name === form.designation)?.level;
      if (desigLevel != null) request.hierarchyLevel = desigLevel;

      await onConvert(applicationId, request);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert to employee.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Convert to Employee" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <p className="text-sm text-gray-500">
          Creating an employee from{" "}
          <span className="font-medium text-gray-700">{form.name || "this candidate"}</span>
          . This marks the application as hired and closes the requisition seat.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            required
            value={form.employeeId}
            onChange={set("employeeId")}
          />
          <Input label="Joining Date" type="date" value={form.doj} onChange={set("doj")} />
        </div>

        <Input label="Full Name" required value={form.name} onChange={set("name")} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Email" type="email" value={form.email} onChange={set("email")} />
          <Input
            label="Contact Number"
            required
            value={form.contactNumber}
            onChange={set("contactNumber")}
            placeholder="e.g. +91 98765 43210"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Gender" options={genderOptions} value={form.gender} onChange={set("gender")} />
          <Select
            label="Employment Type"
            options={employmentTypeOptions}
            value={form.employmentType}
            onChange={set("employmentType")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Designation"
            options={designationOptions}
            value={form.designation}
            onChange={set("designation")}
          />
          <Select
            label="Department"
            options={departmentOptions}
            value={form.department}
            onChange={set("department")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Work Location"
            required
            options={branchOptions}
            value={form.branchUid}
            onChange={set("branchUid")}
          />
          <Input
            label="Base Salary (Basic)"
            type="number"
            min={0}
            value={form.baseSalary}
            onChange={set("baseSalary")}
            placeholder="From offer"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Convert to Employee
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
