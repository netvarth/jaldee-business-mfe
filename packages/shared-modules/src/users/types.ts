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
  departmentId?: string;
  departmentName?: string;
  status: UserStatus;
  available: boolean;
  locations: string[];
  locationIds?: string[];
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
  businessLocations?: UserLocation[];
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

export type UserAccountProfile = {
  customId?: string;
  shortUrl?: string;
  headline?: string;
  about?: string;
  specializations: string[];
  languages: string[];
  socialLinks: { label: string; value: string }[];
  publicSearchEnabled?: boolean;
  businessProfilePermitted?: boolean;
};

export type UserServiceAssignment = {
  id: string;
  name: string;
  status: UserStatus;
  serviceType: string;
  departmentName?: string;
  durationLabel?: string;
  priceLabel?: string;
  virtualMode?: string;
};

export type UserQueueAssignment = {
  id: string;
  name: string;
  status: UserStatus;
  locationName?: string;
  serviceNames: string[];
  timeRange?: string;
  queueType: "instant" | "scheduled";
  todayEnabled: boolean;
  futureEnabled: boolean;
};

export type UserScheduleAssignment = {
  id: string;
  name: string;
  status: UserStatus;
  locationName?: string;
  serviceNames: string[];
  timeRange?: string;
  daySummary?: string;
  todayEnabled: boolean;
  futureEnabled: boolean;
};

export type UserNonWorkingDay = {
  id: string;
  startDate?: string;
  endDate?: string;
  dateRange: string;
  description: string;
  timeRange?: string;
  editable: boolean;
};

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  userType: string;
  departmentId: string;
  phoneCountryCode: string;
  phoneNumber: string;
};

export type CreateTeamInput = {
  name: string;
  description: string;
};

export type ChangeLoginIdInput = {
  userId: string;
  loginId: string;
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
