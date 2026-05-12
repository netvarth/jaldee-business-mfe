import type {
  UserDepartment,
  UserDetail,
  UserLocation,
  UserSummary,
  UserTeam,
  UsersDataset,
  UsersFilters,
} from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

type RawRecord = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function readName(raw: RawRecord) {
  const firstName = asString(raw.firstName);
  const lastName = asString(raw.lastName);
  const joined = `${firstName} ${lastName}`.trim();
  return joined || asString(raw.name) || asString(raw.userName) || asString(raw.businessName) || "Unnamed user";
}

function normalizeLocations(value: unknown): UserLocation[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const raw = typeof entry === "object" && entry !== null ? (entry as RawRecord) : {};
      return {
        id: String(raw.id ?? raw.locationId ?? raw.branchId ?? ""),
        name: asString(raw.name) || asString(raw.locationName) || asString(raw.place) || asString(raw.branchName),
        status: asString(raw.status) || undefined,
      };
    })
    .filter((entry) => entry.id || entry.name);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "object" && entry !== null) {
        const raw = entry as RawRecord;
        return (
          asString(raw.name) ||
          asString(raw.displayName) ||
          asString(raw.label) ||
          asString(raw.specialization) ||
          asString(raw.language)
        );
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeUser(raw: RawRecord): UserSummary {
  const locations = normalizeLocations(raw.businessLocations ?? raw.locations ?? raw.locationDtos ?? raw.branches);
  const userType = asString(raw.userType) || asString(raw.userSubType) || "USER";
  const status = asString(raw.status, "UNKNOWN");

  return {
    id: String(raw.id ?? raw.userId ?? raw.providerId ?? raw.encId ?? ""),
    name: readName(raw),
    firstName: asString(raw.firstName) || undefined,
    lastName: asString(raw.lastName) || undefined,
    email: asString(raw.email) || asString(raw.primaryEmail) || undefined,
    mobile:
      asString(raw.primaryMobileNo) ||
      asString(raw.mobileNo) ||
      asString(raw.phoneNumber) ||
      undefined,
    employeeId: asString(raw.employeeId) || undefined,
    userType,
    roleName:
      asString(raw.roleName) ||
      asString(raw.userRole) ||
      asString((Array.isArray(raw.roles) ? (raw.roles[0] as RawRecord | undefined)?.roleName : undefined) ?? ""),
    departmentName: asString(raw.departmentName) || asString(raw.department) || undefined,
    status,
    available:
      asBoolean(raw.available, status === "ACTIVE") ||
      asBoolean(raw.availableNow, false),
    locations: locations.map((entry) => entry.name).filter(Boolean),
  };
}

function normalizeTeam(raw: RawRecord): UserTeam {
  const membersSource =
    (Array.isArray(raw.users) ? raw.users : null) ??
    (Array.isArray(raw.providers) ? raw.providers : null) ??
    (Array.isArray(raw.members) ? raw.members : null) ??
    [];

  const members = membersSource
    .map((entry) => (typeof entry === "object" && entry !== null ? normalizeUser(entry as RawRecord) : null))
    .filter((entry): entry is UserSummary => Boolean(entry));

  return {
    id: String(raw.id ?? raw.groupId ?? raw.encId ?? ""),
    name: asString(raw.name) || asString(raw.teamName) || "Unnamed team",
    description: asString(raw.description) || asString(raw.teamDescription) || undefined,
    status: asString(raw.status, "UNKNOWN"),
    memberCount: asNumber(raw.size, members.length) || members.length,
    members,
  };
}

function normalizeDetail(raw: RawRecord, digitalSignatureUrl?: string): UserDetail {
  const base = normalizeUser(raw);
  const teams = Array.isArray(raw.teams)
    ? raw.teams
        .map((entry) => (typeof entry === "object" && entry !== null ? asString((entry as RawRecord).name) : ""))
        .filter(Boolean)
    : [];

  return {
    ...base,
    gender: asString(raw.gender) || undefined,
    dob: normalizeDate(raw.dob ?? raw.dateOfBirth),
    joinedOn: normalizeDate(raw.createdDate ?? raw.joiningDate ?? raw.dateJoined),
    businessName: asString(raw.businessName) || undefined,
    whatsappNumber: asString(raw.whatsappNumber ?? raw.whatsAppNum ?? raw.whatsappNo) || undefined,
    telegramNumber: asString(raw.telegramNumber ?? raw.telegramNo) || undefined,
    phoneCountryCode: asString(raw.countryCode ?? raw.phoneCountryCode) || "+91",
    whatsappCountryCode: asString(raw.whatsappCountryCode ?? raw.whatsAppCountryCode) || "+91",
    telegramCountryCode: asString(raw.telegramCountryCode) || "+91",
    pinCode: asString(raw.pinCode ?? raw.postalCode) || undefined,
    departmentId: String(raw.departmentId ?? raw.deptId ?? ""),
    digitalSignatureUrl: digitalSignatureUrl || undefined,
    bookingColor: asString(raw.userColour ?? raw.bookingColor ?? raw.bookingColour) || "#33009C",
    adminPrivilege: asBoolean(raw.adminPrivilege ?? raw.isadminPrivilege),
    showPatientsList: asBoolean(raw.showPatientsList),
    showBusinessProfile: raw.showBusinessProfile === undefined ? true : asBoolean(raw.showBusinessProfile),
    showFinanceManager: asBoolean(raw.showFinanceManager),
    showInventoryManager: asBoolean(raw.showInventoryManager),
    specializations: normalizeStringList(raw.specializations ?? raw.specialization),
    languages: normalizeStringList(raw.languages ?? raw.preferredLanguages),
    teams,
  };
}

function buildUsersQuery(filters: UsersFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    from: Math.max(0, (filters.page - 1) * filters.pageSize),
    count: filters.pageSize,
  };

  if (filters.status && filters.status !== "all") {
    params["status-eq"] = filters.status;
  }

  if (filters.userType && filters.userType !== "all") {
    params["userType-eq"] = filters.userType;
  }

  if (filters.departmentId && filters.departmentId !== "all") {
    params["deptId-eq"] = filters.departmentId;
  }

  return params;
}

function buildUsersCountQuery(filters: Omit<UsersFilters, "page" | "pageSize" | "searchText">) {
  const params: Record<string, string> = {};

  if (filters.status && filters.status !== "all") {
    params["status-eq"] = filters.status;
  }

  if (filters.userType && filters.userType !== "all") {
    params["userType-eq"] = filters.userType;
  }

  if (filters.departmentId && filters.departmentId !== "all") {
    params["deptId-eq"] = filters.departmentId;
  }

  return params;
}

function searchUsersLocally(users: UserSummary[], searchText?: string) {
  const needle = (searchText ?? "").trim().toLowerCase();
  if (!needle) return users;

  return users.filter((user) =>
    [
      user.name,
      user.email,
      user.mobile,
      user.employeeId,
      user.departmentName,
      user.roleName,
      user.userType,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
  );
}

function buildDatasetSummaries(users: UserSummary[], totalUsers: number, teams: UserTeam[]) {
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const availableUsers = users.filter((user) => user.available).length;

  return [
    { label: "Total Users", value: String(totalUsers), accent: "indigo" as const },
    { label: "Active Users", value: String(activeUsers), accent: "emerald" as const },
    { label: "Available Now", value: String(availableUsers), accent: "amber" as const },
    { label: "Teams", value: String(teams.length), accent: "rose" as const },
  ];
}

export async function listUsers(api: ScopedApi, filters: UsersFilters): Promise<UserSummary[]> {
  const response = await api.get<RawRecord[]>("provider/user", {
    params: buildUsersQuery(filters),
  });

  const users = Array.isArray(response.data) ? response.data.map(normalizeUser) : [];
  return searchUsersLocally(users, filters.searchText);
}

export async function getUsersCount(
  api: ScopedApi,
  filters: Omit<UsersFilters, "page" | "pageSize" | "searchText">
): Promise<number> {
  try {
    const response = await api.get<number>("provider/user/count", {
      params: buildUsersCountQuery(filters),
    });
    return typeof response.data === "number" ? response.data : 0;
  } catch {
    return 0;
  }
}

export async function getUserDetail(api: ScopedApi, userId: string): Promise<UserDetail> {
  const [detailResponse, signatureResponse] = await Promise.allSettled([
    api.get<RawRecord>(`provider/user/${userId}`),
    api.get<RawRecord | string>(`provider/user/digitalSign/${userId}`),
  ]);

  const detailRaw =
    detailResponse.status === "fulfilled" && typeof detailResponse.value.data === "object" && detailResponse.value.data !== null
      ? (detailResponse.value.data as RawRecord)
      : {};

  const signatureUrl =
    signatureResponse.status === "fulfilled"
      ? typeof signatureResponse.value.data === "string"
        ? signatureResponse.value.data
        : asString((signatureResponse.value.data as RawRecord)?.s3path) ||
          asString((signatureResponse.value.data as RawRecord)?.url)
      : "";

  return normalizeDetail(detailRaw, signatureUrl);
}

export async function listUserTeams(api: ScopedApi, status = "ACTIVE"): Promise<UserTeam[]> {
  const response = await api.get<RawRecord[]>("provider/user/teams", {
    params: status && status !== "all" ? { "status-eq": status } : undefined,
  });

  return Array.isArray(response.data) ? response.data.map(normalizeTeam) : [];
}

export async function listUserDepartments(api: ScopedApi): Promise<UserDepartment[]> {
  try {
    const response = await api.get<RawRecord[]>("provider/departments");
    if (!Array.isArray(response.data)) return [];

    return response.data
      .map((entry) => ({
        id: String(entry.id ?? entry.departmentId ?? entry.encId ?? ""),
        name: asString(entry.departmentName) || asString(entry.name),
      }))
      .filter((entry) => entry.id && entry.name);
  } catch {
    return [];
  }
}

export async function listUserLocations(api: ScopedApi): Promise<UserLocation[]> {
  try {
    const response = await api.get<RawRecord[]>("provider/locations");
    if (!Array.isArray(response.data)) return [];

    return response.data
      .map((entry) => ({
        id: String(entry.id ?? entry.locationId ?? entry.encId ?? ""),
        name: asString(entry.place) || asString(entry.locationName) || asString(entry.name),
        status: asString(entry.status) || undefined,
      }))
      .filter((entry) => entry.id && entry.name);
  } catch {
    return [];
  }
}

export async function getUsersDataset(api: ScopedApi): Promise<UsersDataset> {
  const [users, totalUsers, teams] = await Promise.all([
    listUsers(api, { page: 1, pageSize: 25 }),
    getUsersCount(api, {}),
    listUserTeams(api),
  ]);

  return {
    title: "Team Members",
    subtitle: "Browse providers, assistants, admins, and their assigned teams.",
    summaries: buildDatasetSummaries(users, totalUsers || users.length, teams),
    users,
    teams,
  };
}
