import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";
import type { Employee } from "../pages/users/mockData";

const TENANT_USERS_ENDPOINT = "/base-service/v1/api/tenant/users";

/**
 * Subset of the base-service TenantUserSummaryDto we consume for the Staff
 * screens. Fields the booking/base-CRM domain does not own (designation, role,
 * date of birth, joining date, employment type, payroll) are intentionally
 * absent — they belong to the HR module and are shown as "not available" rather
 * than fabricated.
 */
interface TenantUserSummaryDto {
  uid?: string;
  userDisplayName?: string;
  firstName?: string;
  lastName?: string;
  primaryPhoneNumber?: string;
  email?: string;
  gender?: string;
  userStatus?: string;
  employeeId?: string;
  departmentName?: string;
}

function toStatus(userStatus?: string): string {
  const s = String(userStatus ?? "").toUpperCase();
  if (!s) return "INACTIVE";
  return s === "DISABLED" || s === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

function toEmployee(d: TenantUserSummaryDto): Employee {
  const name =
    d.userDisplayName ||
    `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() ||
    "User";
  return {
    uid: d.uid ?? `usr-${Math.random().toString(36).slice(2, 8)}`,
    name,
    employeeId: d.employeeId ?? "",
    department: d.departmentName ?? "",
    designation: "", // not available in base-CRM (HR module owns this)
    status: toStatus(d.userStatus),
    role: "",
    email: d.email ?? "",
    phone: d.primaryPhoneNumber ?? "",
    gender: d.gender ?? "",
    dob: "",
    doj: "",
    type: "",
  };
}

/**
 * Live staff/user directory backed by base-service tenant users. No mock
 * fallback — a failure surfaces an error and an empty list.
 */
export function useStaff() {
  const api = useBookingApi();
  const [staff, setStaff] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<unknown>(TENANT_USERS_ENDPOINT, {
        params: { page: 0, size: 200 },
        _skipLocationParam: true,
      });
      setStaff(unwrapList<TenantUserSummaryDto>(data).map(toEmployee));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff.");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return { staff, loading, error, refresh: fetchStaff };
}
