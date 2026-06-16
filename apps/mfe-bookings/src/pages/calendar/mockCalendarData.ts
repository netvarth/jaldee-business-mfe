export interface Calendar {
  id: string;
  name: string;
  location: string;
  channels: string[];
  status: string;
  color: string;
  services: string[];
  users: string[];
}

export interface User {
  id: string;
  name: string;
  role: string;
  status: string;
  color: string;
  code: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  color: string;
}

export interface Booking {
  id: string;
  calendarId: string;
  patientName: string;
  phone: string;
  serviceId: string;
  serviceName?: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: 'Confirmed' | 'Requested' | 'Checked-in' | 'In-progress' | 'Waiting' | 'Cancelled';
}

const todayStr = new Date().toISOString().split('T')[0];

export const MOCK_CALENDARS: Calendar[] = [
  {
    id: "cal-1",
    name: "Main Clinic Calendar",
    location: "Downtown",
    channels: ["Online", "Walk-in"],
    status: "Active",
    color: "#2563EB",
    services: ["svc-1", "svc-2"],
    users: ["usr-1", "usr-2", "usr-3"]
  }
];

export const MOCK_USERS: User[] = [
  { id: "usr-1", name: "Dr. Sarah Purple", role: "Cardiologist", status: "online", color: "avatar-color-1", code: "SP" },
  { id: "usr-2", name: "Dr. Michael Orange", role: "General Physician", status: "online", color: "avatar-color-2", code: "MO" },
  { id: "usr-3", name: "Dr. Emily Green", role: "Pediatrician", status: "leave", color: "avatar-color-3", code: "EG" }
];

export const MOCK_SERVICES: Service[] = [
  { id: "svc-1", name: "General Consultation", duration: 30, color: "#2563EB" },
  { id: "svc-2", name: "Follow-up", duration: 15, color: "#16A34A" }
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "bk-1",
    calendarId: "cal-1",
    patientName: "John Doe",
    phone: "555-1234",
    serviceId: "svc-1",
    userId: "usr-1",
    date: todayStr,
    startTime: "09:30",
    endTime: "10:00",
    status: "Confirmed"
  },
  {
    id: "bk-2",
    calendarId: "cal-1",
    patientName: "Jane Smith",
    phone: "555-5678",
    serviceId: "svc-2",
    userId: "usr-2",
    date: todayStr,
    startTime: "11:00",
    endTime: "11:15",
    status: "Requested"
  },
  {
    id: "bk-3",
    calendarId: "cal-1",
    patientName: "Alice Johnson",
    phone: "555-8765",
    serviceId: "svc-1",
    userId: "usr-1",
    date: todayStr,
    startTime: "14:00",
    endTime: "14:30",
    status: "Checked-in"
  }
];
