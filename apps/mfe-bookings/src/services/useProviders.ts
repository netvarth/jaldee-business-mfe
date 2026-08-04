import { useMemo } from "react";
import { useUsers } from "./useUsers";

const AVATAR_COLORS = ["avatar-color-1", "avatar-color-2", "avatar-color-3", "avatar-color-4"];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toCalendarUser(
  user: ReturnType<typeof useUsers>["users"][number],
  index: number,
) {
  const name = user.displayName || `${user.firstName} ${user.lastName}`.trim() || "User";
  return {
    id: user.userUid,
    uid: user.userUid,
    name,
    code: initials(name),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    role: user.title || "",
    status: user.status === "Inactive" ? "leave" : "online",
  };
}

export function useProviders() {
  const { users, loading, error, refresh } = useUsers();

  const providers = useMemo(
    () => users.map((user, index) => toCalendarUser(user, index)),
    [users],
  );

  return { providers, loading, error, refresh };
}
