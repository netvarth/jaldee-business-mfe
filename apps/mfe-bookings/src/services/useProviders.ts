import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { unwrapList } from "./response";

const TENANT_USERS_ENDPOINT = "/base-service/v1/api/tenant/users";

/** Raw user row from POST /users/search (UserDto). */
interface UserDto {
  userUid?: string;
  uid?: string;
  id?: string;
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

function resolveUserUid(user: UserDto): string | undefined {
  for (const candidate of [user.userUid, user.uid, user.id]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

/** Map a live UserDto into the column shape the calendar grid expects (mock-compatible). */
function toCalendarUser(d: UserDto, i: number) {
  const name = d.displayName || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "User";
  const uid = resolveUserUid(d);
  return {
    id: uid ?? "",
    uid: uid ?? "",
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
      const data = await api.get<unknown>(TENANT_USERS_ENDPOINT, {
        params: { page: 0, size: 10, userStatus: "ACTIVE" },
        _skipLocationParam: true,
      });
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
