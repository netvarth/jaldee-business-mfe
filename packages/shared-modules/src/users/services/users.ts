import type {
  ChangeLoginIdInput,
  CreateTeamInput,
  CreateUserInput,
  UserAccountProfile,
  UserDepartment,
  UserDetail,
  UserLocation,
  UserNonWorkingDay,
  UserQueueAssignment,
  UserScheduleAssignment,
  UserServiceAssignment,
  UserSummary,
  UserTeam,
  UsersDataset,
  UsersFilters,
} from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
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

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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

function normalizeLocationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return String(entry);
      }

      if (typeof entry === "object" && entry !== null) {
        const raw = entry as RawRecord;
        return String(raw.id ?? raw.locationId ?? raw.branchId ?? "");
      }

      return "";
    })
    .filter(Boolean);
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

function extractSocialLinks(raw: RawRecord) {
  const candidates = [
    { label: "Facebook", value: raw.facebookUrl ?? raw.facebook },
    { label: "Instagram", value: raw.instagramUrl ?? raw.instagram },
    { label: "Twitter", value: raw.twitterUrl ?? raw.twitter },
    { label: "YouTube", value: raw.youtubeUrl ?? raw.youtube },
    { label: "LinkedIn", value: raw.linkedinUrl ?? raw.linkedin },
    { label: "Website", value: raw.websiteUrl ?? raw.website },
  ];

  return candidates
    .map((entry) => ({
      label: entry.label,
      value: asString(entry.value),
    }))
    .filter((entry) => entry.value);
}

function buildTimeRange(timeSlots: unknown) {
  const slot = asArray<RawRecord>(timeSlots)[0] ?? {};
  const start = asString(slot.sTime);
  const end = asString(slot.eTime);
  if (!start && !end) return undefined;
  return [start, end].filter(Boolean).join(" - ");
}

function buildDaySummary(schedule: unknown) {
  const intervals = asArray<string>(typeof schedule === "object" && schedule !== null ? (schedule as RawRecord).repeatIntervals : []);
  if (!intervals.length) return undefined;
  return intervals.join(", ");
}

function buildDateRange(startDate?: string, endDate?: string) {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate || "-";
}

function normalizeServiceType(raw: RawRecord) {
  const serviceType = asString(raw.serviceType);
  if (serviceType !== "virtualService") return serviceType || "Service";

  const virtualCallingMode = asString(asArray<RawRecord>(raw.virtualCallingModes)[0]?.callingMode);
  const virtualServiceType = asString(raw.virtualServiceType);
  return [virtualServiceType, virtualCallingMode].filter(Boolean).join(" / ") || "Virtual Service";
}

function normalizeUser(raw: RawRecord): UserSummary {
  const locations = normalizeLocations(raw.businessLocations ?? raw.locations ?? raw.locationDtos ?? raw.branches);
  const locationIds = normalizeLocationIds(
    raw.businessLocations ?? raw.locations ?? raw.locationDtos ?? raw.branches ?? raw.bussLocations
  );
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
    departmentId: String(raw.departmentId ?? raw.deptId ?? ""),
    departmentName: asString(raw.departmentName) || asString(raw.department) || undefined,
    status,
    available:
      asBoolean(raw.available, status === "ACTIVE") ||
      asBoolean(raw.availableNow, false),
    locations: locations.map((entry) => entry.name).filter(Boolean),
    locationIds: locationIds.length ? locationIds : locations.map((entry) => entry.id).filter(Boolean),
  };
}

function enrichUsers(users: UserSummary[], departments: UserDepartment[], locations: UserLocation[]) {
  const departmentMap = new Map(departments.map((department) => [department.id, department.name]));
  const locationMap = new Map(locations.map((location) => [location.id, location.name]));

  return users.map((user) => {
    const resolvedLocations =
      user.locations.length > 0
        ? user.locations
        : (user.locationIds ?? []).map((locationId) => locationMap.get(locationId) || "").filter(Boolean);

    return {
      ...user,
      departmentName: user.departmentName || departmentMap.get(user.departmentId || "") || user.departmentName,
      locations: resolvedLocations,
    };
  });
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
    businessLocations: normalizeLocations(raw.businessLocations ?? raw.locations ?? raw.locationDtos ?? raw.branches),
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

function normalizeAccountProfile(raw: RawRecord): UserAccountProfile {
  return {
    customId: asString(raw.customId) || undefined,
    shortUrl: asString(raw.shortUrl ?? raw.publicUrl ?? raw.url) || undefined,
    headline: asString(raw.headline ?? raw.tagLine ?? raw.title) || undefined,
    about: asString(raw.aboutMe ?? raw.about ?? raw.description) || undefined,
    specializations: normalizeStringList(raw.specializations ?? raw.specialization),
    languages: normalizeStringList(raw.languages ?? raw.spokenLanguages),
    socialLinks: extractSocialLinks(raw),
    publicSearchEnabled: raw.searchPublicly === undefined ? undefined : asBoolean(raw.searchPublicly),
    businessProfilePermitted: raw.bProfilePermitted === undefined ? undefined : asBoolean(raw.bProfilePermitted),
  };
}

function normalizeService(raw: RawRecord): UserServiceAssignment {
  const price = raw.price ?? raw.serviceCharge ?? raw.amount;
  const duration = raw.serviceDuration ?? raw.duration ?? raw.approxDuration;

  return {
    id: String(raw.id ?? raw.serviceId ?? raw.encId ?? ""),
    name: asString(raw.name) || "Unnamed service",
    status: asString(raw.status, "UNKNOWN"),
    serviceType: normalizeServiceType(raw),
    departmentName: asString(raw.deptName ?? raw.departmentName ?? raw.department) || undefined,
    durationLabel: duration ? `${duration} min` : undefined,
    priceLabel:
      typeof price === "number" || typeof price === "string"
        ? `Rs ${String(price).trim()}`
        : undefined,
    virtualMode: asString(asArray<RawRecord>(raw.virtualCallingModes)[0]?.callingMode) || undefined,
  };
}

function normalizeQueue(raw: RawRecord): UserQueueAssignment {
  return {
    id: String(raw.id ?? raw.queueId ?? raw.encId ?? ""),
    name: asString(raw.name) || "Unnamed queue",
    status: asString(raw.queueState ?? raw.status ?? raw.apptState, "UNKNOWN"),
    locationName: asString((raw.location as RawRecord | undefined)?.place ?? (raw.location as RawRecord | undefined)?.locationName) || undefined,
    serviceNames: normalizeStringList(raw.services),
    timeRange: buildTimeRange(raw.queueSchedule ? (raw.queueSchedule as RawRecord).timeSlots : raw.timeSlots),
    queueType: asBoolean(raw.instantQueue) ? "instant" : "scheduled",
    todayEnabled: asBoolean(raw.onlineCheckIn ?? raw.todayAppt),
    futureEnabled: asBoolean(raw.futureCheckIn ?? raw.futureAppt),
  };
}

function normalizeSchedule(raw: RawRecord): UserScheduleAssignment {
  const scheduleBlock =
    (typeof raw.appmtSchedule === "object" && raw.appmtSchedule !== null ? (raw.appmtSchedule as RawRecord) : null) ??
    (typeof raw.queueSchedule === "object" && raw.queueSchedule !== null ? (raw.queueSchedule as RawRecord) : null) ??
    raw;

  return {
    id: String(raw.id ?? raw.scheduleId ?? raw.encId ?? ""),
    name: asString(raw.name) || "Unnamed schedule",
    status: asString(raw.apptState ?? raw.status, "UNKNOWN"),
    locationName: asString((raw.location as RawRecord | undefined)?.place ?? (raw.location as RawRecord | undefined)?.locationName) || undefined,
    serviceNames: normalizeStringList(raw.services),
    timeRange: buildTimeRange(scheduleBlock.timeSlots),
    daySummary: buildDaySummary(scheduleBlock),
    todayEnabled: asBoolean(raw.todayAppt),
    futureEnabled: asBoolean(raw.futureAppt),
  };
}

function normalizeNonWorkingDay(raw: RawRecord): UserNonWorkingDay {
  const holidaySchedule =
    typeof raw.holidaySchedule === "object" && raw.holidaySchedule !== null ? (raw.holidaySchedule as RawRecord) : {};
  const terminator =
    typeof holidaySchedule.terminator === "object" && holidaySchedule.terminator !== null
      ? (holidaySchedule.terminator as RawRecord)
      : {};
  const startDate = normalizeDate(holidaySchedule.startDate);
  const endDate = normalizeDate(terminator.endDate);
  const timeRange = buildTimeRange(holidaySchedule.timeSlots);
  const startDayRaw = asString(raw.startDay) || asString(holidaySchedule.startDate);
  const startDay = startDayRaw ? new Date(`${startDayRaw}T00:00:00`) : null;
  const today = new Date();
  const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return {
    id: String(raw.id ?? raw.encId ?? ""),
    startDate,
    endDate,
    dateRange: buildDateRange(startDate, endDate),
    description: asString(raw.description) || "-",
    timeRange,
    editable: !startDay || Number.isNaN(startDay.getTime()) ? true : startDay.getTime() >= floorToday.getTime(),
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
  const [usersResponse, departments, locations] = await Promise.all([
    api.get<RawRecord[]>("provider/user", {
      params: buildUsersQuery(filters),
    }),
    listUserDepartments(api).catch(() => []),
    listUserLocations(api).catch(() => []),
  ]);

  const users = Array.isArray(usersResponse.data) ? usersResponse.data.map(normalizeUser) : [];
  return searchUsersLocally(enrichUsers(users, departments, locations), filters.searchText);
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
    const response = await api.get<RawRecord[] | RawRecord>("provider/departments");
    const departmentRows = Array.isArray(response.data)
      ? response.data
      : Array.isArray((response.data as RawRecord)?.departments)
        ? ((response.data as RawRecord).departments as RawRecord[])
        : [];
    if (!departmentRows.length) return [];

    return departmentRows
      .map((entry) => ({
        id: String(entry.departmentId ?? entry.id ?? entry.encId ?? ""),
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

export async function getUserAccountProfile(api: ScopedApi, userId: string): Promise<UserAccountProfile> {
  try {
    const response = await api.get<RawRecord>(`provider/user/providerBprofile/${userId}`);
    return typeof response.data === "object" && response.data !== null
      ? normalizeAccountProfile(response.data as RawRecord)
      : normalizeAccountProfile({});
  } catch {
    return normalizeAccountProfile({});
  }
}

export async function listUserServices(api: ScopedApi, userId: string): Promise<UserServiceAssignment[]> {
  const response = await api.get<RawRecord[]>("provider/services", {
    params: {
      "provider-eq": userId,
      "serviceType-neq": "donationService",
    },
  });

  return asArray<RawRecord>(response.data).map(normalizeService);
}

export async function listUserQueues(api: ScopedApi, userId: string): Promise<UserQueueAssignment[]> {
  const response = await api.get<RawRecord[]>("provider/waitlist/queues", {
    params: {
      "provider-eq": userId,
    },
  });

  return asArray<RawRecord>(response.data).map(normalizeQueue);
}

export async function listUserSchedules(api: ScopedApi, userId: string): Promise<UserScheduleAssignment[]> {
  const response = await api.get<RawRecord[]>("provider/appointment/schedule", {
    params: {
      "provider-eq": userId,
    },
  });

  return asArray<RawRecord>(response.data).map(normalizeSchedule);
}

export async function listUserNonWorkingDays(
  api: ScopedApi,
  userId: string,
  page = 1,
  pageSize = 10
): Promise<UserNonWorkingDay[]> {
  const response = await api.get<RawRecord[]>(`provider/vacation/getvacation/${userId}`, {
    params: {
      from: Math.max(0, (page - 1) * pageSize),
      count: pageSize,
    },
  });

  return asArray<RawRecord>(response.data).map(normalizeNonWorkingDay);
}

export async function getUserNonWorkingDaysCount(api: ScopedApi, userId: string): Promise<number> {
  try {
    const response = await api.get<number>(`provider/vacation/getvacation/${userId}/count`);
    return typeof response.data === "number" ? response.data : 0;
  } catch {
    return 0;
  }
}

export async function createUser(api: ScopedApi, input: CreateUserInput): Promise<string> {
  const payload: Record<string, unknown> = {
    firstName: input.firstName.trim() || null,
    lastName: input.lastName.trim() || null,
    email: input.email.trim() || "",
    employeeId: input.employeeId.trim() || null,
    userType: input.userType,
    countryCode: input.phoneNumber ? input.phoneCountryCode || "+91" : "",
    mobileNo: input.phoneNumber.trim() || "",
  };

  if (input.userType === "PROVIDER" && input.departmentId) {
    payload.deptId = input.departmentId;
    payload.bProfilePermitted = true;
  }

  const response = await api.post<string | number>("provider/user", payload);
  return String(response.data ?? "");
}

export async function createUserTeam(api: ScopedApi, input: CreateTeamInput): Promise<string> {
  const response = await api.post<string | number>("provider/user/team", {
    name: input.name.trim(),
    description: input.description.trim() || "",
  });

  return String(response.data ?? "");
}

export async function assignUserLocations(api: ScopedApi, userId: string, locationIds: string[]): Promise<void> {
  await api.put("provider/user/updateBusinessLoc", {
    userIds: [userId],
    bussLocations: locationIds,
  });
}

export async function getUserLoginId(api: ScopedApi, userId: string): Promise<string> {
  try {
    const response = await api.get<string>(`provider/login/suggestion/loginId/${userId}`);
    return typeof response.data === "string" ? response.data : "";
  } catch {
    return "";
  }
}

export async function changeUserLoginId(api: ScopedApi, input: ChangeLoginIdInput): Promise<void> {
  await api.post("provider/login/reset/loginId", {
    userId: input.userId,
    loginId: input.loginId.trim(),
  });
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
