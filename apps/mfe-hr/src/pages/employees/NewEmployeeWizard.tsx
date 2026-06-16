import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle2, Briefcase, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@jaldee/design-system";
import { useHrApi } from "../../services/useHrApi";
import { useEmployees } from "../../services/useEmployees";
import { useBranches } from "../../services/useBranches";
import { useDesignations, useDepartments } from "../../services/useSettingsData";

export default function NewEmployeeWizard() {
  const navigate = useNavigate();
  const api = useHrApi();
  const { data: employees } = useEmployees();
  const { data: branches } = useBranches();
  const { data: designations } = useDesignations();
  const { data: departments } = useDepartments();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    name: "", email: "", contactNumber: "", gender: "Male", dob: "",
    pan: "", uan: "", esicNumber: "", pfAccountNo: "", aadhaarRef: "",
  });
  const [employment, setEmployment] = useState({
    designation: "", department: "", employmentType: "Full-time",
    branchUid: "", baseSalary: "", reportingManagerUid: "",
  });

  const set = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (key: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setter((prev) => ({ ...prev, [key]: e.target.value }));
  const sp = set(setPersonal);
  const se = set(setEmployment);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personal.name || !personal.email) {
      setError("Name and email are required.");
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        employeeId: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
        name: personal.name,
        email: personal.email,
        contactNumber: personal.contactNumber || null,
        gender: personal.gender || null,
        dob: personal.dob || null,
        doj: new Date().toISOString().slice(0, 10),
        department: employment.department || null,
        designation: employment.designation || null,
        employmentType: employment.employmentType,
        role: "employee",
        pan: personal.pan || null,
        uan: personal.uan || null,
        esicNumber: personal.esicNumber || null,
        pfAccountNo: personal.pfAccountNo || null,
        aadhaarRef: personal.aadhaarRef || null,
      };
      if (employment.reportingManagerUid) payload.reportingManagerUid = employment.reportingManagerUid;
      if (employment.branchUid) payload.branchUid = employment.branchUid;
      if (employment.baseSalary) payload.salaryStructure = { basic: Number(employment.baseSalary) };
      // Derive the employee's hierarchy level from the selected role/designation band.
      const desigLevel = designations.find((d) => d.name === employment.designation)?.level;
      if (desigLevel != null) payload.hierarchyLevel = desigLevel;

      await api.post("/employees", payload);
      navigate("/employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee.");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, icon: UserCircle2, label: "Personal" },
    { num: 2, icon: Briefcase, label: "Employment" },
  ];

  return (
    <section className="page-section active" style={{ minWidth: 0 }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <PageHeader title="New Employee Setup" subtitle="Create a profile in the HR directory." />

        {/* Progress Timeline */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", marginBottom: 32, padding: "0 16px" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 4, backgroundColor: "var(--border-color)", transform: "translateY(-50%)", zIndex: 0, borderRadius: 2 }}>
             <div style={{ height: "100%", backgroundColor: "var(--primary-color)", width: `${((step - 1) / (steps.length - 1)) * 100}%`, transition: "width 0.3s ease", borderRadius: 2 }} />
          </div>
          {steps.map((s) => (
            <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, backgroundColor: "var(--app-bg)", padding: "0 16px", zIndex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${step >= s.num ? "var(--primary-color)" : "var(--border-color)"}`, backgroundColor: step >= s.num ? "var(--primary-color)" : "var(--surface-bg)", color: step >= s.num ? "white" : "var(--light-text)", transition: "all 0.3s ease" }}>
                <s.icon size={20} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: step >= s.num ? "var(--primary-color)" : "var(--light-text)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: "12px 16px", backgroundColor: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div className="modal-card" style={{ width: "100%", maxHeight: "none", position: "relative", transform: "none", left: 0, top: 0, boxShadow: "var(--shadow-md)" }}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">{step === 1 ? "Personal Details" : "Employment Details"}</h3>
              <p className="modal-subtitle">{step === 1 ? "Basic information about the new hire." : "Role, department, and reporting line."}</p>
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); if (step === 2) handleSubmit(); else setStep(2); }}>
            <div className="modal-body" style={{ padding: "32px 24px" }}>
              {step === 1 && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name <span className="required">*</span></label>
                      <input type="text" required placeholder="John Doe" value={personal.name} onChange={sp("name")} />
                    </div>
                    <div className="form-group">
                      <label>Email Address <span className="required">*</span></label>
                      <input type="email" required placeholder="john@example.com" value={personal.email} onChange={sp("email")} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input type="text" placeholder="e.g. +1 234 567 890" value={personal.contactNumber} onChange={sp("contactNumber")} />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select className="custom-select" value={personal.gender} onChange={sp("gender")}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" value={personal.dob} onChange={sp("dob")} />
                    </div>
                  </div>

                  <div style={{ marginTop: 32, marginBottom: 24, borderTop: "1px solid var(--border-color)", paddingTop: 24 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Statutory Details</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>PAN Number</label>
                        <input type="text" placeholder="ABCDE1234F" style={{ textTransform: "uppercase" }} value={personal.pan} onChange={(e) => setPersonal(p => ({ ...p, pan: e.target.value.toUpperCase() }))} />
                      </div>
                      <div className="form-group">
                        <label>UAN</label>
                        <input type="text" placeholder="100000000000" value={personal.uan} onChange={sp("uan")} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>PF Account No</label>
                        <input type="text" placeholder="MH/BAN/12345/123" value={personal.pfAccountNo} onChange={sp("pfAccountNo")} />
                      </div>
                      <div className="form-group">
                        <label>ESIC Number</label>
                        <input type="text" value={personal.esicNumber} onChange={sp("esicNumber")} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Aadhaar Ref (Last 4)</label>
                        <input type="text" maxLength={4} placeholder="1234" value={personal.aadhaarRef} onChange={sp("aadhaarRef")} />
                      </div>
                      <div className="form-group"></div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Role / Designation</label>
                      <select className="custom-select" value={employment.designation} onChange={se("designation")}>
                        <option value="">Select Role / Designation</option>
                        {designations.map((d) => <option key={d.id} value={d.name}>{d.name}{d.level != null ? ` · L${d.level}` : ""}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <select className="custom-select" value={employment.department} onChange={se("department")}>
                        <option value="">Select Department</option>
                        {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Employment Type</label>
                      <select className="custom-select" value={employment.employmentType} onChange={se("employmentType")}>
                        <option value="Full-time">Full-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Daily Wage">Daily Wage</option>
                        <option value="Hourly">Hourly</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Work Site / Branch</label>
                      <select className="custom-select" value={employment.branchUid} onChange={se("branchUid")}>
                        <option value="">No Branch Assigned</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Base Salary (Monthly Basic)</label>
                      <input type="number" placeholder="₹" value={employment.baseSalary} onChange={se("baseSalary")} />
                    </div>
                    <div className="form-group">
                      <label>Reporting Manager</label>
                      <select className="custom-select" value={employment.reportingManagerUid} onChange={se("reportingManagerUid")}>
                        <option value="">Select manager</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name}{emp.designation ? ` (${emp.designation})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer" style={{ padding: "16px 24px", justifyContent: step === 1 ? "flex-end" : "space-between", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--app-bg)" }}>
              {step === 1 ? (
                <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Next Step <ChevronRight size={16} />
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <>Complete Setup <CheckCircle2 size={16} /></>}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
