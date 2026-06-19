import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

/** Raw user row from POST /users/search (UserDto). */
interface UserDto {
  userUid?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  status?: string;
}

const AVATAR_COLORS = ["avatar-color-1", "avatar-color-2", "avatar-color-3", "avatar-color-4"];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/** Map a live UserDto into the column shape the calendar grid expects (mock-compatible). */
function toCalendarUser(d: UserDto, i: number) {
  const name = d.displayName || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "User";
  return {
    id: d.userUid,
    uid: d.userUid,
    name,
    code: initials(name),
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    role: d.title || "",
    status: d.status === "leave" ? "leave" : "online",
  };
}

export function useProviders() {
  const api = useBookingApi();
  const [providers, setProviders] = useState<ReturnType<typeof toCalendarUser>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>(
        "/users/search",
        {},
        { params: { page: 0, size: 100 } },
      );
      setProviders(unwrapList<UserDto>(data).map(toCalendarUser));
    } catch (e) {
      // No mock fallback — empty provider column instead of fake staff.
      setError(e instanceof Error ? e.message : "Failed to load providers.");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, error, refresh: fetchProviders };
}
