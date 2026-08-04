import { useState, useEffect, useCallback } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "../services/useBookingApi";
import { createdUsers, type BookingUser } from "../data/sessionStore";
import { unwrapList } from "./response";
import { buildBookingUserSearchBody } from "./bookingUserSearch";

const BOOKING_USERS_SEARCH_ENDPOINT = "/booking-users/search";

interface UserDto {
  userUid?: string;
  uid?: string;
  id?: string;
  tenantUser?: {
    uid?: string;
    userUid?: string;
    id?: string;
    displayName?: string;
    userDisplayName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    emailId?: string;
    phoneE164?: string;
    phoneNumber?: string;
    primaryPhoneNumber?: string;
    mobileNumber?: string;
    status?: string;
  };
  title?: string;
  userDisplayName?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  status?: string;
  email?: string;
  emailId?: string;
  phoneNumber?: string;
  primaryPhoneNumber?: string;
  mobileNumber?: string;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveUserUid(user: UserDto): string | undefined {
  for (const candidate of [
    user.userUid,
    user.uid,
    user.id,
    user.tenantUser?.userUid,
    user.tenantUser?.uid,
    user.tenantUser?.id,
  ]) {
    if (typeof candidate === "string" && candidate.trim() && isUuid(candidate.trim())) {
      return candidate.trim();
    }
  }
  return undefined;
}

function toUiStatus(status?: string): BookingUser["status"] {
  return String(status ?? "").toUpperCase() === "DISABLED" ? "Inactive" : "Active";
}

function toUser(d: UserDto): BookingUser {
  const tenantUser = d.tenantUser;
  const first = d.firstName ?? tenantUser?.firstName ?? "";
  const last = d.lastName ?? tenantUser?.lastName ?? "";
  const userDisplayName =
    d.userDisplayName ||
    d.displayName ||
    tenantUser?.userDisplayName ||
    tenantUser?.displayName ||
    `${first} ${last}`.trim() ||
    "User";
  const userUid = resolveUserUid(d);
  return {
    userUid: userUid ?? "",
    title: d.title ?? "",
    firstName: first,
    lastName: last,
    userDisplayName,
    displayName: userDisplayName,
    email: d.email ?? d.emailId ?? tenantUser?.email ?? tenantUser?.emailId ?? "",
    phoneNumber:
      d.phoneNumber ??
      d.primaryPhoneNumber ??
      d.mobileNumber ??
      tenantUser?.phoneE164 ??
      tenantUser?.phoneNumber ??
      tenantUser?.primaryPhoneNumber ??
      tenantUser?.mobileNumber ??
      "",
    status: toUiStatus(d.status ?? tenantUser?.status),
    hasLogin: true,
  };
}

export function useUsers(
  filterClauses: SearchFilterClause[] = [],
  schema: SearchSchema | null | undefined = null,
  options: { enabled?: boolean } = {}
) {
  const api = useBookingApi();
  const [users, setUsers] = useState<BookingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = options.enabled ?? true;

  const fetchUsers = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>(
        BOOKING_USERS_SEARCH_ENDPOINT,
        buildBookingUserSearchBody({
          filterClauses,
          schema,
          page: 0,
          size: 1000,
        })
      );
      setUsers([
        ...createdUsers,
        ...unwrapList<UserDto>(data)
          .map(toUser)
          .filter((user) => Boolean(user.userUid)),
      ]);
    } catch (e) {
      // No sample fallback — show only real (session) users on failure.
      setError(e instanceof Error ? e.message : "Failed to load users.");
      setUsers([...createdUsers]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, filterClauses, schema]);

  useEffect(() => {
    if (!enabled) {
      setUsers([...createdUsers]);
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [enabled, fetchUsers]);

  return { users, loading, error, refresh: fetchUsers };
}
