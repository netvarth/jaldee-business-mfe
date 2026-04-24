import type { IpBillingRow, IpDataset, IpPatientStatus } from "../types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getBillingStatus(amount: number): IpBillingRow["status"] {
  if (amount <= 0) return "Paid";
  if (amount < 10000) return "Partial";
  return "Pending";
}

function getPatientStatus(stayDays: number): IpPatientStatus {
  if (stayDays >= 5) return "Ready for Discharge";
  if (stayDays >= 3) return "Under Observation";
  return "Admitted";
}

export function getIpDataset(): IpDataset {
  const patients = [
    {
      id: "ip-001",
      patient: "Anita Joseph",
      ward: "Ward A",
      attendingDoctor: "Dr. Meera Nair",
      status: getPatientStatus(6),
      admittedOn: "2026-04-16",
      stayDays: 6,
    },
    {
      id: "ip-002",
      patient: "Rahul Menon",
      ward: "ICU",
      attendingDoctor: "Dr. Vishal Kumar",
      status: getPatientStatus(4),
      admittedOn: "2026-04-18",
      stayDays: 4,
    },
    {
      id: "ip-003",
      patient: "Neha Varghese",
      ward: "Ward B",
      attendingDoctor: "Dr. Asha Thomas",
      status: getPatientStatus(2),
      admittedOn: "2026-04-20",
      stayDays: 2,
    },
  ];

  const admissions = [
    {
      id: "adm-101",
      patient: "Anita Joseph",
      reason: "Post-operative observation",
      room: "A-12",
      admittedOn: "2026-04-16",
      expectedDischarge: "2026-04-23",
    },
    {
      id: "adm-102",
      patient: "Rahul Menon",
      reason: "Cardiac monitoring",
      room: "ICU-04",
      admittedOn: "2026-04-18",
      expectedDischarge: "2026-04-24",
    },
    {
      id: "adm-103",
      patient: "Neha Varghese",
      reason: "Fever management",
      room: "B-07",
      admittedOn: "2026-04-20",
      expectedDischarge: "2026-04-22",
    },
  ];

  const beds = [
    { id: "bed-1", ward: "Ward A", bed: "A-12", occupancy: "Occupied" as const, patient: "Anita Joseph" },
    { id: "bed-2", ward: "ICU", bed: "ICU-04", occupancy: "Occupied" as const, patient: "Rahul Menon" },
    { id: "bed-3", ward: "Ward B", bed: "B-07", occupancy: "Occupied" as const, patient: "Neha Varghese" },
    { id: "bed-4", ward: "Ward B", bed: "B-08", occupancy: "Cleaning" as const },
    { id: "bed-5", ward: "Ward C", bed: "C-02", occupancy: "Available" as const },
  ];

  const billingBase = [
    { id: "bill-1", patient: "Anita Joseph", invoice: "INV-IP-3501", amount: 0, dueOn: "2026-04-21" },
    { id: "bill-2", patient: "Rahul Menon", invoice: "INV-IP-3510", amount: 8200, dueOn: "2026-04-24" },
    { id: "bill-3", patient: "Neha Varghese", invoice: "INV-IP-3517", amount: 18450, dueOn: "2026-04-23" },
  ];

  const billing = billingBase.map((row) => ({
    ...row,
    status: getBillingStatus(row.amount),
  }));

  return {
    title: "Inpatient Dashboard",
    subtitle: "Track admissions, bed occupancy, active stays, and inpatient billing from one place.",
    summaries: [
      { label: "Active Patients", value: String(patients.length), accent: "teal" },
      { label: "Occupied Beds", value: String(beds.filter((item) => item.occupancy === "Occupied").length), accent: "sky" },
      { label: "Expected Discharges", value: String(admissions.filter((item) => item.expectedDischarge <= "2026-04-23").length), accent: "amber" },
      { label: "Outstanding Billing", value: formatCurrency(billing.reduce((sum, item) => sum + item.amount, 0)), accent: "rose" },
    ],
    patients,
    admissions,
    beds,
    billing,
  };
}
