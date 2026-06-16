export interface Employee {
  uid: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  status: string;
  role: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  doj: string;
  type: string;
}

export const MOCK_EMPLOYEES: Employee[] = [
  {
    uid: "1",
    name: "Dr. Admin User",
    employeeId: "EMP001",
    department: "Management",
    designation: "Director",
    status: "ACTIVE",
    role: "Admin",
    email: "admin@jaldee.com",
    phone: "+91 98765 43210",
    gender: "Male",
    dob: "1985-05-15",
    doj: "2020-01-01",
    type: "Full-Time"
  },
  {
    uid: "2",
    name: "Sarah Jenkins",
    employeeId: "EMP002",
    department: "HR",
    designation: "Manager",
    status: "ACTIVE",
    role: "Staff",
    email: "sarah.j@jaldee.com",
    phone: "+91 98765 43211",
    gender: "Female",
    dob: "1990-08-22",
    doj: "2021-03-15",
    type: "Full-Time"
  },
  {
    uid: "3",
    name: "Michael Chen",
    employeeId: "EMP003",
    department: "Engineering",
    designation: "Lead Developer",
    status: "ACTIVE",
    role: "Staff",
    email: "michael.c@jaldee.com",
    phone: "+91 98765 43212",
    gender: "Male",
    dob: "1992-11-05",
    doj: "2021-06-10",
    type: "Full-Time"
  },
  {
    uid: "4",
    name: "Emily Rodriguez",
    employeeId: "EMP004",
    department: "Design",
    designation: "UI/UX Designer",
    status: "ONBOARDING",
    role: "Staff",
    email: "emily.r@jaldee.com",
    phone: "+91 98765 43213",
    gender: "Female",
    dob: "1995-02-18",
    doj: "2023-11-01",
    type: "Contract"
  },
  {
    uid: "5",
    name: "David Kim",
    employeeId: "EMP005",
    department: "Sales",
    designation: "Executive",
    status: "ACTIVE",
    role: "Staff",
    email: "david.k@jaldee.com",
    phone: "+91 98765 43214",
    gender: "Male",
    dob: "1988-09-30",
    doj: "2022-01-20",
    type: "Full-Time"
  },
  {
    uid: "6",
    name: "Priya Patel",
    employeeId: "EMP006",
    department: "Support",
    designation: "Specialist",
    status: "ACTIVE",
    role: "Staff",
    email: "priya.p@jaldee.com",
    phone: "+91 98765 43215",
    gender: "Female",
    dob: "1994-04-12",
    doj: "2022-08-05",
    type: "Full-Time"
  },
  {
    uid: "7",
    name: "James Wilson",
    employeeId: "EMP007",
    department: "Finance",
    designation: "Analyst",
    status: "OFFBOARDING",
    role: "Staff",
    email: "james.w@jaldee.com",
    phone: "+91 98765 43216",
    gender: "Male",
    dob: "1991-07-25",
    doj: "2021-09-15",
    type: "Full-Time"
  },
  {
    uid: "8",
    name: "Lisa Taylor",
    employeeId: "EMP008",
    department: "Marketing",
    designation: "Coordinator",
    status: "ACTIVE",
    role: "Staff",
    email: "lisa.t@jaldee.com",
    phone: "+91 98765 43217",
    gender: "Female",
    dob: "1993-12-08",
    doj: "2023-02-10",
    type: "Part-Time"
  },
  {
    uid: "9",
    name: "Robert Martinez",
    employeeId: "EMP009",
    department: "Operations",
    designation: "Manager",
    status: "ACTIVE",
    role: "Staff",
    email: "robert.m@jaldee.com",
    phone: "+91 98765 43218",
    gender: "Male",
    dob: "1987-03-14",
    doj: "2020-11-20",
    type: "Full-Time"
  },
  {
    uid: "10",
    name: "Anita Sharma",
    employeeId: "EMP010",
    department: "Engineering",
    designation: "QA Tester",
    status: "ACTIVE",
    role: "Staff",
    email: "anita.s@jaldee.com",
    phone: "+91 98765 43219",
    gender: "Female",
    dob: "1996-06-21",
    doj: "2023-05-01",
    type: "Full-Time"
  },
  {
    uid: "11",
    name: "Thomas Anderson",
    employeeId: "EMP011",
    department: "IT",
    designation: "SysAdmin",
    status: "ACTIVE",
    role: "Staff",
    email: "thomas.a@jaldee.com",
    phone: "+91 98765 43220",
    gender: "Male",
    dob: "1989-10-09",
    doj: "2021-01-10",
    type: "Full-Time"
  }
];
