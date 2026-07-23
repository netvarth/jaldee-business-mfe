import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle2, Briefcase, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Select, DatePicker, PhoneInput } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import type { PhoneInputValue } from "@jaldee/design-system";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { useHrApi } from "../../services/useHrApi";
import { useEmployees } from "../../services/useEmployees";
import { useDesignations, useDepartments } from "../../services/useSettingsData";
import { useTelemetry } from "../../services/useTelemetry";
import "./employees.css";

export default function NewEmployeeWizard() {
  const navigate = useNavigate();
  const { location, eventBus } = useMFEProps();
  const api = useHrApi();
  const { data: employees } = useEmployees();
  const { data: designations } = useDesignations();
  const { data: departments } = useDepartments();
  const { trackEvent, captureError } = useTelemetry();
  console.log("[NewEmployeeWizard] designations data:", designations, "departments data:", departments);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    name: "", email: "", gender: "MALE", dob: "",
    pan: "", uan: "", esicNumber: "", pfAccountNo: "", aadhaarRef: "",
  });
  const [contactNumber, setContactNumber] = useState<PhoneInputValue>({
    countryCode: "+91",
    number: "",
    e164Number: "",
  });
  const [employment, setEmployment] = useState({
    designation: "", department: "", employmentType: "FullTime",
    baseSalary: "", reportingManagerUid: "",
  });

  const set = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (key: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setter((prev) => ({ ...prev, [key]: e.target.value }));
  const sp = set(setPersonal);
  const se = set(setEmployment);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personal.name || !personal.email || !contactNumber.number) {
      const message = "Name, email, and contact number are required.";
      setError(message);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Employee creation",
        message,
      });
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    const deptObj = departments.find((d) => d.name === employment.department);
    const desigObj = designations.find((d) => d.name === employment.designation);

    try {
      const payload: Record<string, unknown> = {
        employeeId: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
        name: personal.name,
        email: personal.email,
        contactNumber: contactNumber.e164Number || `${contactNumber.countryCode}${contactNumber.number}`,
        gender: personal.gender || null,
        dob: personal.dob || null,
        doj: new Date().toISOString().slice(0, 10),
        hrDepartmentUid: deptObj?.id || null,
        designationUid: desigObj?.id || null,
        employmentType: employment.employmentType,
        locationUid: location.id,
        role: "employee",
        pan: personal.pan || null,
        uan: personal.uan || null,
        esicNumber: personal.esicNumber || null,
        pfAccountNo: personal.pfAccountNo || null,
        aadhaarRef: personal.aadhaarRef || null,
      };
      if (employment.reportingManagerUid) payload.reportingManagerUid = employment.reportingManagerUid;
      if (employment.baseSalary) payload.salaryStructure = { basic: Number(employment.baseSalary) };
      // Derive the employee's hierarchy level from the selected role/designation band.
      const desigLevel = designations.find((d) => d.name === employment.designation)?.level;
      if (desigLevel != null) payload.hierarchyLevel = desigLevel;

      await api.post("/employees", payload);
      trackEvent("hr.employee.created", {
        hrDepartmentUid: payload.hrDepartmentUid ?? null,
        designationUid: payload.designationUid ?? null,
        employmentType: payload.employmentType,
        locationUid: payload.locationUid,
      });
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Employee created",
        message: `${personal.name} was added successfully.`,
      });
      navigate("/employees");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create employee.";
      captureError(err instanceof Error ? err : new Error(message));
      setError(message);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Employee creation failed",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, icon: UserCircle2, label: "Personal" },
    { num: 2, icon: Briefcase, label: "Employment" },
  ];

  return (
    <section id="hr-new-employee-page" data-testid="hr-new-employee-page" data-state={`step-${step}`} className="page-section active" style={{ minWidth: 0 }}>
      <div style={{ width: "100%" }}>
        <PageHeader
          title="New Employee"
          subtitle="Create an employee profile and employment record."
          back={{ label: "Back to employees", href: "/employees" }}
          onNavigate={(href) => navigate(href)}
        />

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
          <div id="hr-new-employee-error" data-testid="hr-new-employee-error" style={{ marginBottom: 24, padding: "12px 16px", backgroundColor: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-color)", borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div className="modal-card" style={{ width: "100%", maxWidth: "none", maxHeight: "none", position: "relative", transform: "none", left: 0, top: 0, boxShadow: "var(--shadow-md)" }}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">{step === 1 ? "Personal Details" : "Employment Details"}</h3>
              <p className="modal-subtitle">{step === 1 ? "Basic information about the new hire." : "Role, department, and reporting line."}</p>
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); if (step === 2) handleSubmit(); else setStep(2); }}>
            <div className="employee-edit-form">
              <div className="employee-edit-form__fields">
                {step === 1 && (
                  <>
                    <div className="employee-personal-pair">
                      <div className="form-group">
                        <label>Full Name <span className="required">*</span></label>
                        <input id="hr-new-employee-name" data-testid="hr-new-employee-name" type="text" required placeholder="John Doe" value={personal.name} onChange={sp("name")} />
                      </div>
                      <div className="form-group">
                        <label>Email Address <span className="required">*</span></label>
                        <input id="hr-new-employee-email" data-testid="hr-new-employee-email" type="email" required placeholder="john@example.com" value={personal.email} onChange={sp("email")} />
                      </div>
                    </div>
                    <div className="form-group">
                      <PhoneInput
                        id="hr-new-employee-contact-number"
                        testId="hr-new-employee-contact-number"
                        label="Contact Number"
                        required
                        value={contactNumber}
                        onChange={setContactNumber}
                        numberPlaceholder="Enter phone number"
                        preferredCountries={["in"]}
                      />
                    </div>
                    <div className="employee-personal-pair">
                      <div className="form-group">
                        <Select
                          id="hr-new-employee-gender"
                          testId="hr-new-employee-gender"
                          label="Gender"
                          value={personal.gender}
                          onChange={sp("gender")}
                          options={[
                            { value: "OTHER", label: "Other" },
                            { value: "FEMALE", label: "Female" },
                            { value: "MALE", label: "Male" }
                          ]}
                        />
                      </div>
                      <div className="form-group">
                        <DatePicker
                          id="hr-new-employee-dob"
                          label="Date of Birth"
                          value={personal.dob}
                          onChange={sp("dob")}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32, marginBottom: 24, borderTop: "1px solid var(--border-color)", paddingTop: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 0 }}>Statutory Details</h4>
                      <div className="employee-personal-pair">
                        <div className="form-group">
                          <label>PAN Number</label>
                          <input type="text" placeholder="ABCDE1234F" style={{ textTransform: "uppercase" }} value={personal.pan} onChange={(e) => setPersonal(p => ({ ...p, pan: e.target.value.toUpperCase() }))} />
                        </div>
                        <div className="form-group">
                          <label>UAN</label>
                          <input type="text" placeholder="100000000000" value={personal.uan} onChange={sp("uan")} />
                        </div>
                      </div>
                      <div className="employee-personal-pair">
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
                        <div className="form-group employee-aadhaar-field">
                          <label>Aadhaar Ref (Last 4)</label>
                          <input type="text" maxLength={4} placeholder="1234" value={personal.aadhaarRef} onChange={sp("aadhaarRef")} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <Select
                          id="hr-new-employee-designation"
                          testId="hr-new-employee-designation"
                          label="Role / Designation"
                          value={employment.designation}
                          onChange={se("designation")}
                          options={[
                            { value: "", label: "Select Role / Designation" },
                            ...designations.map((d) => ({ value: d.name, label: `${d.name}${d.level != null ? ` · L${d.level}` : ""}` }))
                          ]}
                        />
                      </div>
                      <div className="form-group">
                        <Select
                          id="hr-new-employee-department"
                          testId="hr-new-employee-department"
                          label="Department"
                          value={employment.department}
                          onChange={se("department")}
                          options={[
                            { value: "", label: "Select Department" },
                            ...departments.map((d) => ({ value: d.name, label: d.name }))
                          ]}
                        />
                      </div>
                    </div>
                    <div className="form-row employee-employment-type-row">
                      <div className="form-group">
                        <Select
                          id="hr-new-employee-employment-type"
                          testId="hr-new-employee-employment-type"
                          label="Employment Type"
                          value={employment.employmentType}
                          onChange={se("employmentType")}
                          options={[
                            { value: "FullTime", label: "Full-time" },
                            { value: "PartTime", label: "Part-time" },
                            { value: "Hourly", label: "Hourly" },
                            { value: "Intern", label: "Intern" },
                            { value: "Consultant", label: "Consultant" },
                            { value: "DailyWage", label: "Daily wage" },
                            { value: "Contract", label: "Contract" },
                          ]}
                        />
                      </div>
                      <div className="form-group employee-base-salary-field">
                        <label>Base Salary (Monthly Basic)</label>
                        <input type="number" placeholder="₹" value={employment.baseSalary} onChange={se("baseSalary")} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <Select
                          id="hr-new-employee-manager"
                          testId="hr-new-employee-manager"
                          label="Reporting Manager"
                          value={employment.reportingManagerUid}
                          onChange={se("reportingManagerUid")}
                          options={[
                            { value: "", label: "Select manager" },
                            ...employees.map((emp) => ({ value: emp.id, label: `${emp.name}${emp.designation ? ` (${emp.designation})` : ""}` }))
                          ]}
                        />
                      </div>
                      <div className="form-group"></div>
                    </div>
                  </>
                )}
              </div>

              <aside className="employee-edit-context">
                {step === 1 ? (
                  <>
                    <div className="employee-edit-context__icon">
                      <UserCircle2 size={20} />
                    </div>
                    <p className="employee-edit-context__eyebrow">Profile guidance</p>
                    <h3>Personal Info</h3>
                    <p>Keep contact and statutory information current for employee communication and compliance.</p>
                    <span>Changes are applied when you save the employee profile.</span>
                  </>
                ) : (
                  <>
                    <div className="employee-edit-context__icon">
                      <Briefcase size={20} />
                    </div>
                    <p className="employee-edit-context__eyebrow">Profile guidance</p>
                    <h3>Employment Info</h3>
                    <p>Assign the department, designation, and reporting manager to establish the employee's role in the organization hierarchy.</p>
                    <span>Changes are applied when you save the employee profile.</span>
                  </>
                )}
              </aside>
            </div>
            
            <div className="modal-footer" style={{ padding: "12px 20px", justifyContent: step === 1 ? "flex-end" : "space-between", borderTop: "none", backgroundColor: "var(--app-bg)" }}>
              {step === 1 ? (
                <button id="hr-new-employee-next" data-testid="hr-new-employee-next" type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Next Step <ChevronRight size={16} />
                </button>
              ) : (
                <>
                  <button id="hr-new-employee-back" data-testid="hr-new-employee-back" type="button" className="btn btn-secondary" onClick={(e) => { e.preventDefault(); console.log("[NewEmployeeWizard] Back button clicked, setting step to 1"); setStep(1); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button id="hr-new-employee-complete" data-testid="hr-new-employee-complete" type="submit" className="btn btn-primary" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
