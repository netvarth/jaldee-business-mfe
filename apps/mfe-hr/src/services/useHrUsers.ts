import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";

export type HrRole =
  | "HR_MANAGER"
  | "HR_EXECUTIVE"
  | "PAYROLL_ADMIN"
  | "ATTENDANCE_ADMIN"
  | "RECRUITMENT_MANAGER"
  | "REPORTING_ANALYST";

export interface HrRoleMeta {
  key: HrRole;
  label: string;
  description: string;
  badgeClass: string;
}

export const HR_ROLES: HrRoleMeta[] = [
  {
    key: "HR_MANAGER",
    label: "HR Manager",
    description: "Full access to HR modules, policy configuration, and staff management",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
  },
  {
    key: "HR_EXECUTIVE",
    label: "HR Executive",
    description: "Day-to-day HR operations (leave, onboarding, records)",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  {
    key: "PAYROLL_ADMIN",
    label: "Payroll Admin",
    description: "Payroll runs, salary structures, tax deductions, and payslips",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
  },
  {
    key: "ATTENDANCE_ADMIN",
    label: "Attendance Admin",
    description: "Attendance rules, shift rosters, face ID, and regularization",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    key: "RECRUITMENT_MANAGER",
    label: "Recruitment Manager",
    description: "Job postings, applicant pipeline, and candidate lifecycle",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
  },
  {
    key: "REPORTING_ANALYST",
    label: "Reporting Analyst",
    description: "Read-only access to HR analytics, compliance reports, and audit logs",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

export interface TenantUserSnapshot {
  uid: string;
  userId?: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phoneE164?: string;
  status?: "ACTIVE" | "INACTIVE";
  timezone?: string;
  defaultLocationUid?: string;
  defaultDepartmentUid?: string;
  profileImageUrl?: string;
  deleted?: boolean;
}

export interface HrUserProfile {
  uid: string;
  tenantUid?: string;
  tenantUser?: TenantUserSnapshot;
  status: "ACTIVE" | "INACTIVE";
  primaryRole: HrRole;
  roles?: HrRole[];
  tenantUserCreated?: boolean;
}

export interface CreateHrUserPayload {
  tenantUser: {
    uid?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneE164?: string;
    allowLogin?: boolean;
  };
  primaryRole: HrRole;
  roles: HrRole[];
}

export interface UpdateHrUserRolesPayload {
  primaryRole: HrRole;
  roles: HrRole[];
}

export interface SearchHrUsersParams {
  search?: string;
  statusFilter?: "ALL" | "ACTIVE" | "INACTIVE";
  rolesFilter?: HrRole[];
  page?: number;
  size?: number;
  view?: "summary" | "dropdown";
}

export interface SearchHrUsersResponse {
  content: HrUserProfile[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  hasNext?: boolean;
}

// Fallback Mock HR Users for preview/dev offline resilience
const MOCK_HR_USERS: HrUserProfile[] = [
  {
    uid: "01a01882-e474-7f0f-9316-534d698635b9",
    status: "ACTIVE",
    primaryRole: "HR_MANAGER",
    roles: ["HR_MANAGER", "PAYROLL_ADMIN"],
    tenantUserCreated: false,
    tenantUser: {
      uid: "01a01882-e474-7f0f-9316-534d698635b9",
      userId: "10024",
      firstName: "Sarah",
      lastName: "Jenkins",
      displayName: "Sarah Jenkins",
      email: "sarah.jenkins@example.com",
      phoneE164: "+919876543210",
      status: "ACTIVE",
      timezone: "Asia/Kolkata",
    },
  },
  {
    uid: "02b02893-f585-8g1g-0427-645e709746c0",
    status: "ACTIVE",
    primaryRole: "PAYROLL_ADMIN",
    roles: ["PAYROLL_ADMIN", "HR_EXECUTIVE"],
    tenantUserCreated: true,
    tenantUser: {
      uid: "02b02893-f585-8g1g-0427-645e709746c0",
      userId: "10025",
      firstName: "Alex",
      lastName: "Morgan",
      displayName: "Alex Morgan",
      email: "alex.morgan@example.com",
      phoneE164: "+919812345678",
      status: "ACTIVE",
      timezone: "Asia/Kolkata",
    },
  },
  {
    uid: "03c03904-g696-9h2h-1538-756f810857d1",
    status: "ACTIVE",
    primaryRole: "ATTENDANCE_ADMIN",
    roles: ["ATTENDANCE_ADMIN"],
    tenantUserCreated: false,
    tenantUser: {
      uid: "03c03904-g696-9h2h-1538-756f810857d1",
      userId: "10026",
      firstName: "Rahul",
      lastName: "Sharma",
      displayName: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      phoneE164: "+919988776655",
      status: "ACTIVE",
      timezone: "Asia/Kolkata",
    },
  },
  {
    uid: "04d04015-h707-0i3i-2649-867g921968e2",
    status: "INACTIVE",
    primaryRole: "RECRUITMENT_MANAGER",
    roles: ["RECRUITMENT_MANAGER", "REPORTING_ANALYST"],
    tenantUserCreated: false,
    tenantUser: {
      uid: "04d04015-h707-0i3i-2649-867g921968e2",
      userId: "10027",
      firstName: "Priya",
      lastName: "Nair",
      displayName: "Priya Nair",
      email: "priya.nair@example.com",
      phoneE164: "+919765432109",
      status: "INACTIVE",
      timezone: "Asia/Kolkata",
    },
  },
];

export function useHrUsers() {
  const api = useHrApi();
  const [data, setData] = useState<HrUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchSchema, setSearchSchema] = useState<any>(null);

  const load = useCallback(
    async (params?: SearchHrUsersParams) => {
      setLoading(true);
      setError(null);
      const currentPage = params?.page ?? page;
      const currentSize = params?.size ?? pageSize;

      const criteria: Array<Record<string, unknown>> = [];
      if (params?.statusFilter && params.statusFilter !== "ALL") {
        criteria.push({
          field: "status",
          operator: "EQ",
          value: params.statusFilter,
        });
      }
      if (params?.rolesFilter && params.rolesFilter.length > 0) {
        criteria.push({
          field: "primaryRole",
          operator: "IN",
          values: params.rolesFilter,
        });
      }

      const body: Record<string, unknown> = {
        view: params?.view ?? "summary",
        page: currentPage,
        size: currentSize,
      };
      if (params?.search) {
        body.search = params.search;
      }
      if (criteria.length > 0) {
        body.criteria = criteria;
      }

      try {
        const res = await api.post<any>("/hr-users/search", body);
        const rawContent = Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res?.data?.content)
          ? res.data.content
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : null;

        if (rawContent) {
          const normalized = rawContent.map((u: any) => ({
            ...u,
            roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.primaryRole],
          }));
          setData(normalized);
          setTotalElements(res?.totalElements ?? res?.data?.totalElements ?? normalized.length);
          setTotalPages(res?.totalPages ?? res?.data?.totalPages ?? 1);
        } else {
          setData([]);
          setTotalElements(0);
          setTotalPages(1);
        }
      } catch (e) {
        console.warn("[useHrUsers] Backend search call failed or offline, using fallback:", e);
        const filtered = MOCK_HR_USERS.filter((u) => {
          if (params?.statusFilter && params.statusFilter !== "ALL" && u.status !== params.statusFilter) return false;
          if (params?.rolesFilter?.length && !params.rolesFilter.includes(u.primaryRole)) return false;
          if (params?.search) {
            const q = params.search.toLowerCase();
            const name = u.tenantUser?.displayName?.toLowerCase() || "";
            const email = u.tenantUser?.email?.toLowerCase() || "";
            if (!name.includes(q) && !email.includes(q)) return false;
          }
          return true;
        });
        setData(filtered);
        setTotalElements(filtered.length);
        setTotalPages(1);
        setError(null);
      } finally {
        setLoading(false);
      }
    },
    [api, page, pageSize]
  );

  const fetchSchema = useCallback(async () => {
    try {
      const res = await api.get<any>("/hr-users/search/schema");
      setSearchSchema(res);
    } catch {
      setSearchSchema({
        label: "HR User Search",
        fields: [
          { name: "displayName", label: "Display Name", type: "STRING" },
          { name: "email", label: "Email", type: "STRING" },
          { name: "status", label: "HR Status", type: "ENUM" },
          { name: "primaryRole", label: "Primary Role", type: "ENUM" },
        ],
      });
    }
  }, [api]);

  useEffect(() => {
    void load();
    void fetchSchema();
  }, [load, fetchSchema]);

  const createHrUser = useCallback(
    async (payload: CreateHrUserPayload) => {
      if (!payload.roles.includes(payload.primaryRole)) {
        throw new Error("Primary role must be included in assigned roles.");
      }
      try {
        const result = await api.post<HrUserProfile>("/hr-users", payload);
        if (result) {
          const normalized: HrUserProfile = {
            ...result,
            roles: Array.isArray(result.roles) && result.roles.length > 0 ? result.roles : [result.primaryRole || payload.primaryRole],
          };
          setData((prev) => [normalized, ...prev.filter((i) => i.uid !== normalized.uid)]);
          setTotalElements((t) => t + 1);
        }
        void load();
        return result;
      } catch (e: any) {
        const responseData = e?.response?.data || e?.responseData;
        const fieldError = responseData?.details?.fieldErrors?.[0];
        const fieldErrorMsg = fieldError ? `${fieldError.field}: ${fieldError.message}` : undefined;
        const apiMsg = responseData?.message || fieldErrorMsg || e?.message;

        if (e?.response || e?.responseData || (e?.message && e?.message !== "HR request failed.")) {
          throw new Error(apiMsg || "Failed to create HR User.");
        }

        const newObj: HrUserProfile = {
          uid: payload.tenantUser.uid || `mock-uid-${Date.now()}`,
          status: "ACTIVE",
          primaryRole: payload.primaryRole,
          roles: payload.roles,
          tenantUserCreated: !payload.tenantUser.uid,
          tenantUser: {
            uid: payload.tenantUser.uid || `mock-uid-${Date.now()}`,
            firstName: payload.tenantUser.firstName || "New",
            lastName: payload.tenantUser.lastName || "User",
            displayName: `${payload.tenantUser.firstName || "New"} ${payload.tenantUser.lastName || "User"}`,
            email: payload.tenantUser.email || "user@example.com",
            phoneE164: payload.tenantUser.phoneE164 || "+919876543210",
            status: "ACTIVE",
          },
        };
        setData((prev) => [newObj, ...prev]);
        setTotalElements((t) => t + 1);
        return newObj;
      }
    },
    [api, load]
  );

  const updateHrUserRoles = useCallback(
    async (uid: string, payload: UpdateHrUserRolesPayload) => {
      if (!payload.roles.includes(payload.primaryRole)) {
        throw new Error("Primary role must be included in assigned roles.");
      }
      try {
        const result = await api.put<HrUserProfile>(`/hr-users/${uid}`, payload);
        await load();
        return result;
      } catch (e: any) {
        const responseData = e?.response?.data || e?.responseData;
        const apiMsg = responseData?.message || responseData?.details?.fieldErrors?.[0]?.message || e?.message;
        if (e?.response || e?.responseData) {
          throw new Error(apiMsg || "Failed to update user roles.");
        }
        setData((prev) =>
          prev.map((item) =>
            item.uid === uid
              ? { ...item, primaryRole: payload.primaryRole, roles: payload.roles }
              : item
          )
        );
      }
    },
    [api, load]
  );

  const updateHrUserStatus = useCallback(
    async (uid: string, status: "ACTIVE" | "INACTIVE") => {
      try {
        const result = await api.patch<HrUserProfile>(`/hr-users/${uid}/status?status=${status}`);
        await load();
        return result;
      } catch (e: any) {
        const responseData = e?.response?.data || e?.responseData;
        const apiMsg = responseData?.message || e?.message;
        if (e?.response || e?.responseData) {
          throw new Error(apiMsg || "Failed to update user status.");
        }
        setData((prev) =>
          prev.map((item) => (item.uid === uid ? { ...item, status } : item))
        );
      }
    },
    [api, load]
  );

  return {
    data,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalElements,
    totalPages,
    searchSchema,
    load,
    createHrUser,
    updateHrUserRoles,
    updateHrUserStatus,
  };
}
