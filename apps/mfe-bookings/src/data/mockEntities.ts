import type { Customer, ServiceItem, Schedule, Calendar } from "../types";

export const mockCalendars: Calendar[] = [
  { uid: "cal-1", name: "General Medicine", description: "Primary OPD calendar", status: "Active" },
  { uid: "cal-2", name: "Cardiology", description: "Heart specialists", status: "Active" },
  { uid: "cal-3", name: "Pediatrics", description: "Child care", status: "Active" },
];

export const mockSchedules: Schedule[] = [
  { uid: "sch-1", name: "Morning Clinic", description: "Mon–Fri AM", calendarUid: "", calendarName: "", startDate: "2026-01-01", endDate: null, slotCapacity: 1, qrLinkRequired: false },
  { uid: "sch-2", name: "Evening Clinic", description: "Mon–Fri PM", calendarUid: "", calendarName: "", startDate: "2026-01-01", endDate: null, slotCapacity: 1, qrLinkRequired: false },
];

export const mockCustomers: Customer[] = [
  { id: "P-98234", firstName: "John", lastName: "Doe", phoneNumber: "+1 (555) 123-4567", email: "john.doe@example.com", labels: ["VIP", "Insured"], visits: 12, avatarColor: "#3b82f6", status: "Active" },
  { id: "P-98235", firstName: "Jane", lastName: "Smith", phoneNumber: "+1 (555) 222-9087", email: "jane.smith@example.com", labels: ["New"], visits: 1, avatarColor: "#8b5cf6", status: "Active" },
  { id: "P-98236", firstName: "Robert", lastName: "Fox", phoneNumber: "+1 (555) 661-2244", labels: [], visits: 5, avatarColor: "#10b981", status: "Active" },
  { id: "P-98237", firstName: "Emily", lastName: "Williams", phoneNumber: "+1 (555) 778-1100", email: "emily.w@example.com", labels: ["Follow-up"], visits: 3, avatarColor: "#f59e0b", status: "Active" },
];

export const mockServiceItems: ServiceItem[] = [
  { id: "srv-001", name: "General Consultation", department: "General Medicine", description: "Standard outpatient consultation.", duration: 30, price: 300, status: "Active", serviceType: "Onsite Consultation", labels: ["OPD"] },
  { id: "srv-002", name: "Emergency Consultation", department: "Emergency", description: "Urgent care consultation.", duration: 15, price: 500, status: "Active", serviceType: "Onsite Consultation", labels: ["Urgent"] },
  { id: "srv-003", name: "Cardiology - Pacemaker Check", department: "Cardiology", description: "Pacemaker device review.", duration: 45, price: 1200, status: "Active", serviceType: "Onsite Consultation", labels: ["Cardio"] },
  { id: "srv-004", name: "Tele Follow-up", department: "General Medicine", description: "Remote follow-up call.", duration: 20, price: 250, status: "Inactive", serviceType: "Teleconsultation", labels: ["Tele"] },
];
