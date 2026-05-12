export type UsersViewKey = "overview" | "list" | "teams";

export type UserStatus = "ACTIVE" | "INACTIVE" | "UNKNOWN" | string;

export type UserSummary = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  employeeId?: string;
  userType: string;
  roleName?: string;
  departmentName?: string;
  status: UserStatus;
  available: boolean;
  locations: string[];
};

export type UserLocation = {
  id: string;
  name: string;
  status?: string;
};

export type UserTeam = {
  id: string;
  name: string;
  description?: string;
  status: UserStatus;
  memberCount: number;
  members: UserSummary[];
};

export type UserDetail = UserSummary & {
  gender?: string;
  dob?: string;
  joinedOn?: string;
  businessName?: string;
  whatsappNumber?: string;
  telegramNumber?: string;
  phoneCountryCode?: string;
  whatsappCountryCode?: string;
  telegramCountryCode?: string;
  pinCode?: string;
  departmentId?: string;
  digitalSignatureUrl?: string;
  bookingColor?: string;
  adminPrivilege?: boolean;
  showPatientsList?: boolean;
  showBusinessProfile?: boolean;
  showFinanceManager?: boolean;
  showInventoryManager?: boolean;
  specializations: string[];
  languages: string[];
  teams: string[];
};

export type UserDepartment = {
  id: string;
  name: string;
};

export type UsersFilters = {
  page: number;
  pageSize: number;
  status?: string;
  userType?: string;
  departmentId?: string;
  searchText?: string;
};

export type UsersSummary = {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
};

export type UsersDataset = {
  title: string;
  subtitle: string;
  summaries: UsersSummary[];
  users: UserSummary[];
  teams: UserTeam[];
};
