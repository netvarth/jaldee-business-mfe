import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";
import type { Employee } from "../pages/users/mockData";
import { buildBookingUserSearchBody } from "./bookingUserSearch";

const BOOKING_USERS_SEARCH_ENDPOINT = "/booking-users/search";

/**
 * Subset of the booking-user search response we consume for the Staff screens.
 * Fields the booking domain does not own (designation, role,
 * date of birth, joining date, employment type, payroll) are intentionally
 * absent — they belong to the HR module and are shown as "not available" rather
 * than fabricated.
 */
interface TenantUserSummaryDto {
  uid?: string;
  tenantUser?: {
    uid?: string;
    displayName?: string;
    userDisplayName?: string;
    firstName?: string;
    lastName?: string;
    phoneE164?: string;
    phoneNumber?: string;
    primaryPhoneNumber?: string;
    email?: string;
    status?: string;
  };
  userDisplayName?: string;
  firstName?: string;
  lastName?: string;
  phoneE164?: string;
  phoneNumber?: string;
  primaryPhoneNumber?: string;
  email?: string;
  gender?: string;
  userStatus?: string;
  status?: string;
  employeeId?: string;
  departmentName?: string;
}

function toStatus(userStatus?: string): string {
  const s = String(userStatus ?? "").toUpperCase();
  if (!s) return "INACTIVE";
  return s === "DISABLED" || s === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

function toEmployee(d: TenantUserSummaryDto): Employee {
  const tenantUser = d.tenantUser;
  const name =
    d.userDisplayName ||
    tenantUser?.userDisplayName ||
    tenantUser?.displayName ||
    `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() ||
    `${tenantUser?.firstName ?? ""} ${tenantUser?.lastName ?? ""}`.trim() ||
    "User";
  return {
    uid: d.uid ?? tenantUser?.uid ?? `usr-${Math.random().toString(36).slice(2, 8)}`,
    name,
    employeeId: d.employeeId ?? "",
    department: d.departmentName ?? "",
    designation: "", // not available in base-CRM (HR module owns this)
    status: toStatus(d.userStatus ?? d.status ?? tenantUser?.status),
    role: "",
    email: d.email ?? tenantUser?.email ?? "",
    phone:
      d.phoneE164 ??
      d.phoneNumber ??
      d.primaryPhoneNumber ??
      tenantUser?.phoneE164 ??
      tenantUser?.phoneNumber ??
      tenantUser?.primaryPhoneNumber ??
      "",
    gender: d.gender ?? "",
    dob: "",
    doj: "",
    type: "",
  };
}

/**
 * Live staff/user directory backed by booking users search. No mock
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
      const data = await api.post<unknown>(
        BOOKING_USERS_SEARCH_ENDPOINT,
        buildBookingUserSearchBody({
          filterClauses: [],
          schema: null,
          page: 0,
          size: 200,
        })
      );
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
