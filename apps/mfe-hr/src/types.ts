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
  isSystemUser?: boolean;
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
