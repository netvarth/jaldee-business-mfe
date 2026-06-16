import type { StaffUser, ServiceCard, BookingCard } from "./types";

export const mockUsers: StaffUser[] = [
  { id: "u-1", name: "Dr. Sarah Johnson", code: "SJ", role: "ADMIN", status: "online", color: "bg-emerald-100 text-emerald-700", title: "Dr." },
  { id: "u-2", name: "Dr. Michael Chen", code: "MC", role: "MANAGER", status: "leave", color: "bg-blue-100 text-blue-700", title: "Dr." },
  { id: "u-3", name: "Dr. Emily Williams", code: "EW", role: "ADMIN", status: "online", color: "bg-purple-100 text-purple-700", title: "Dr." },
  { id: "u-5", name: "Nurse Mary Brown", code: "MB", role: "ASSISTANT", status: "online", color: "bg-amber-100 text-amber-700", title: "Nurse" },
];

export const mockServices: ServiceCard[] = [
  { id: "s-1", name: "General Consultation", duration: 30, price: 300 },
  { id: "s-2", name: "Emergency Consultation", duration: 15, price: 500 },
  { id: "s-4", name: "Cardiology - Pacemaker Check", duration: 45, price: 1200 },
];

export const mockBookings: BookingCard[] = [
  { id: "b-1", patientName: "John Doe", time: "09:00", status: "CONFIRMED", serviceId: "s-1", providerId: "u-1" },
  { id: "b-2", patientName: "Jane Smith", time: "10:30", status: "CHECKED_IN", serviceId: "s-4", providerId: "u-1" },
  { id: "b-3", patientName: "Robert Fox", time: "11:00", status: "WAITING", serviceId: "s-1", providerId: "u-2" },
];
