export type IpSummary = {
  label: string;
  value: string;
  accent: "teal" | "sky" | "amber" | "rose";
};

export type IpPatientStatus = "Admitted" | "Under Observation" | "Ready for Discharge";

export type IpPatientRow = {
  id: string;
  patient: string;
  ward: string;
  attendingDoctor: string;
  status: IpPatientStatus;
  admittedOn: string;
  admittedOnRaw?: string;
  stayDays: number;
};

export type IpAdmissionRow = {
  id: string;
  patient: string;
  reason: string;
  room: string;
  admittedOn: string;
  expectedDischarge: string;
};

export type IpBedRow = {
  id: string;
  ward: string;
  bed: string;
  occupancy: "Occupied" | "Available" | "Cleaning";
  patient?: string;
  building?: string;
  floor?: string;
  room?: string;
};

export type IpBillingRow = {
  id: string;
  patient: string;
  invoice: string;
  status: "Pending" | "Partial" | "Paid";
  amount: number;
  dueOn: string;
};

export type IpDataset = {
  title: string;
  subtitle: string;
  summaries: IpSummary[];
  patients: IpPatientRow[];
  admissions: IpAdmissionRow[];
  beds: IpBedRow[];
  billing: IpBillingRow[];
  dashboard: {
    bedStatusCounts: Record<IpBedRow["occupancy"], number>;
    patientStatusCounts: Record<IpPatientStatus, number>;
    occupancyRate: number;
    buildingsCount: number;
    floorsCount: number;
    roomsCount: number;
    admissionsLast7Days: Array<{ label: string; value: number }>;
  };
};

export type IpUserLite = {
  id: string;
  fullName: string;
  userType: string;
};

export type IpDetail = {
  id: string;
  patient: string;
  status: string;
  admittedOn: string;
  expectedDischarge: string;
  ward: string;
  bed: string;
  attendingDoctor: string;
  reason: string;
  caseId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
  users: IpUserLite[];
  doctors: IpUserLite[];
};

export type IpViewKey =
  | "overview"
  | "dashboard"
  | "patients"
  | "inpatient"
  | "admissions"
  | "beds"
  | "billing"
  | "settings"
  | "details"
  | "activity-log"
  | "care-scheduler"
  | "categories"
  | "types"
  | "pricing"
  | "registration"
  | "buildings"
  | "floors"
  | "calender"
  | "occupancy"
  | "rooms"
  | "services"
  | "registarionGrid"
  | "invoice"
  | "master-invoice"
  | "diet"
  | "transfer"
  | "log"
  | "dischargeTemplate";

