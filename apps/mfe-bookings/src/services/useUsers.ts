import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { createdUsers, type BookingUser } from "../data/sessionStore";

interface UserDto {
  userUid?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  status?: string;
}

function toUser(d: UserDto): BookingUser {
  const first = d.firstName ?? "";
  const last = d.lastName ?? "";
  const display = d.displayName || `${first} ${last}`.trim() || "User";
  return {
    userUid: d.userUid ?? `usr-${Math.random().toString(36).slice(2, 8)}`,
    title: d.title ?? "",
    firstName: first,
    lastName: last,
    displayName: display,
    status: d.status ?? "Active",
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
      const data = await api.get<UserDto[]>("/users");
      setUsers([...createdUsers, ...(data ?? []).map(toUser)]);
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
