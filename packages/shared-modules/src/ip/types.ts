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
};

export type IpViewKey = "overview" | "patients" | "admissions" | "beds" | "billing" | "settings";
