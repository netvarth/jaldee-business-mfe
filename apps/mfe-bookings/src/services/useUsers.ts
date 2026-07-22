import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { createdUsers, type BookingUser } from "../data/sessionStore";
import { unwrapList } from "./response";

const TENANT_USERS_ENDPOINT = "/base-service/v1/api/tenant/users";

interface UserDto {
  userUid?: string;
  uid?: string;
  id?: string;
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

function resolveUserUid(user: UserDto): string | undefined {
  for (const candidate of [user.userUid, user.uid, user.id]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

function toUiStatus(status?: string): BookingUser["status"] {
  return String(status ?? "").toUpperCase() === "DISABLED" ? "Inactive" : "Active";
}

function toUser(d: UserDto): BookingUser {
  const first = d.firstName ?? "";
  const last = d.lastName ?? "";
  const userDisplayName = d.userDisplayName || d.displayName || `${first} ${last}`.trim() || "User";
  const userUid = resolveUserUid(d);
  return {
    userUid: userUid ?? `usr-${Math.random().toString(36).slice(2, 8)}`,
    title: d.title ?? "",
    firstName: first,
    lastName: last,
    userDisplayName,
    displayName: userDisplayName,
    email: d.email ?? d.emailId ?? "",
    phoneNumber: d.phoneNumber ?? d.primaryPhoneNumber ?? d.mobileNumber ?? "",
    status: toUiStatus(d.status),
    hasLogin: true, // live users came from the central provisioning
  };
}

export function useUsers() {
  const api = useBookingApi();
  const [users, setUsers] = useState<BookingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<unknown>(TENANT_USERS_ENDPOINT, {
        params: { page: 0, size: 10, userStatus: "ACTIVE" },
        _skipLocationParam: true,
      });
      setUsers([...createdUsers, ...unwrapList<UserDto>(data).map(toUser)]);
    } catch (e) {
      // No sample fallback — show only real (session) users on failure.
      setError(e instanceof Error ? e.message : "Failed to load users.");
      setUsers([...createdUsers]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refresh: fetchUsers };
}
