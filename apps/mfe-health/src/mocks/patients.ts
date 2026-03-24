export interface Patient {
  id:         string;
  patientId:  string;
  name:       string;
  phone:      string;
  email:      string;
  bloodGroup: string;
  doctor:     string;
  lastVisit:  string;
  status:     "active" | "inactive";
}

export const mockPatients: Patient[] = [
  { id: "p-001", patientId: "P-10001", name: "Arun Kumar",      phone: "+91 98765 43210", email: "arun@email.com",    bloodGroup: "O+",  doctor: "Dr. Ravi Menon",   lastVisit: "2026-03-20", status: "active"   },
  { id: "p-002", patientId: "P-10002", name: "Meera Nair",      phone: "+91 87654 32109", email: "meera@email.com",   bloodGroup: "A+",  doctor: "Dr. Priya Suresh", lastVisit: "2026-03-18", status: "active"   },
  { id: "p-003", patientId: "P-10003", name: "Rajesh Pillai",   phone: "+91 76543 21098", email: "rajesh@email.com",  bloodGroup: "B+",  doctor: "Dr. Ravi Menon",   lastVisit: "2026-03-15", status: "active"   },
  { id: "p-004", patientId: "P-10004", name: "Sunitha Das",     phone: "+91 65432 10987", email: "sunitha@email.com", bloodGroup: "AB+", doctor: "Dr. Anoop Kumar",  lastVisit: "2026-03-10", status: "inactive" },
  { id: "p-005", patientId: "P-10005", name: "Mohammed Ashraf", phone: "+91 54321 09876", email: "ashraf@email.com",  bloodGroup: "O-",  doctor: "Dr. Priya Suresh", lastVisit: "2026-03-08", status: "active"   },
  { id: "p-006", patientId: "P-10006", name: "Lakshmi Varma",   phone: "+91 43210 98765", email: "lakshmi@email.com", bloodGroup: "A-",  doctor: "Dr. Anoop Kumar",  lastVisit: "2026-03-05", status: "active"   },
  { id: "p-007", patientId: "P-10007", name: "Vishnu Prasad",   phone: "+91 32109 87654", email: "vishnu@email.com",  bloodGroup: "B-",  doctor: "Dr. Ravi Menon",   lastVisit: "2026-02-28", status: "active"   },
  { id: "p-008", patientId: "P-10008", name: "Divya Krishnan",  phone: "+91 21098 76543", email: "divya@email.com",   bloodGroup: "O+",  doctor: "Dr. Priya Suresh", lastVisit: "2026-02-25", status: "inactive" },
  { id: "p-009", patientId: "P-10009", name: "Sanjay Thomas",   phone: "+91 10987 65432", email: "sanjay@email.com",  bloodGroup: "AB-", doctor: "Dr. Anoop Kumar",  lastVisit: "2026-02-20", status: "active"   },
  { id: "p-010", patientId: "P-10010", name: "Anjali Mohan",    phone: "+91 09876 54321", email: "anjali@email.com",  bloodGroup: "A+",  doctor: "Dr. Ravi Menon",   lastVisit: "2026-02-15", status: "active"   },
];