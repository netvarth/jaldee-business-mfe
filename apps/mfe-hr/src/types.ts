// HR domain types — ported from the standalone suite's src/types, trimmed to
// what the MFE screens use. The backend (feature-hr-service) returns `uid`,
// which useHrApi/hooks normalize to `id`.

export type EmploymentType = "Full-Time" | "Contract" | "Daily Wage" | "Hourly";
export type EmployeeStatus = "Active" | "Notice Period" | "Inactive" | "Left" | "Onboarding";
export enum ClockType {
  Office = "Office",
  Home = "Home",
  Field = "Field",
  Remote = "Remote",
}

export const CLOCK_TYPE_OPTIONS: ClockType[] = [
  ClockType.Office,
  ClockType.Home,
  ClockType.Field,
  ClockType.Remote,
];

export interface SalaryStructure {
  basic?: number;
  hra?: number;
  allowance?: number;
  pf?: number;            // PF (employee)
  tax?: number;           // TDS
  otherDeductions?: number;
  dailyRate?: number;
  hourlyRate?: number;
  pfEmployer?: number;
  esiEmployee?: number;
  esiEmployer?: number;
  professionalTax?: number;
  lwf?: number;
}

export interface BankDetails {
  accountNumber?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface Employee {
  id: string;
  uid?: string;
  employeeId: string;
  loginId?: string | null;
  salutation?: string;
  name: string;
  email: string;
  contactNumber?: string;
  gender?: string;
  dob?: string;
  department?: string;
  hrDepartment?: string;
  designation?: string;
  hrDepartmentUid?: string | null;
  designationUid?: string | null;
  doj?: string;
  reportingManagerUid?: string | null;
  hierarchyLevel?: number;
  status?: EmployeeStatus | string;
  photoUrl?: string;
  hasAuthUser?: boolean;
  isSystemUser?: boolean;
  password?: string | null;
  role?: string;
  employmentType?: EmploymentType | string;
  bankDetails?: BankDetails | null;
  salaryStructure?: SalaryStructure | null;
  documents?: EmployeeDocument[];
  faceDescriptor?: string | null;
  shiftUid?: string | null;
  locationUid?: string | null;
  locationName?: string | null;
}

export interface AttendanceBreak {
  id?: string;
  uid?: string;
  breakIn?: string;
  breakOut?: string;
  breakType?: string;
  durationMinutes?: number;
}

export interface JobRequisition {
  id: string;
  uid?: string;
  title: string;
  employmentType?: string;
  department?: string;
  departmentUid?: string | null;
  branch?: string;
  branchUid?: string | null;
  hiringManager?: string;
  hiringManagerUid?: string | null;
  openings?: number;
  openingsCount?: number;
  experienceRequired?: string;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  targetCloseDate?: string;
  jobDescription?: string;
  status?: string;
  applicants?: number;
  createdAt?: string;
}

export interface Candidate {
  id: string;
  uid?: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  addedAt?: string;
  appliedAt?: string;
  experienceYears?: number;
  currentCompany?: string;
  currentDesignation?: string;
  skills?: string;
  notes?: string;
  rating?: number | null;
  resumeFileRef?: string | null;
  resumeFileName?: string;
  resumeUrl?: string | null;
}

export interface Application {
  id: string;
  uid?: string;
  candidateId?: string;
  candidateUid?: string;
  candidate?: Candidate | null;
  candidateName?: string;
  requisitionId?: string;
  requisitionUid?: string;
  requisition?: JobRequisition | null;
  role?: string;
  stage?: string;
  status?: string;
  notes?: string | null;
  rating?: number | null;
  createdAt?: string;
  updatedAt?: string;
  resumeFileRef?: string | null;
  resumeFileName?: string;
  resumeUrl?: string | null;
}

export interface Interview {
  id: string;
  uid?: string;
  applicationId?: string;
  applicationUid?: string;
  round?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  mode?: string;
  locationOrLink?: string;
  interviewerUids?: string[];
  score?: string | number;
  feedback?: string;
  outcome?: string;
  status?: string;
}

export interface Offer {
  id: string;
  uid?: string;
  applicationId: string;
  designation?: string;
  offeredSalary?: number | string | null;
  currency?: string;
  joiningDate?: string;
  validUntil?: string;
  sentAt?: string;
  probationPeriod?: string;
  status?: string;
  branchUid?: string | null;
  departmentUid?: string | null;
}
