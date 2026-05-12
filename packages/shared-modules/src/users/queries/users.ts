import { useQuery } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import {
  getUserDetail,
  getUsersCount,
  getUsersDataset,
  listUserDepartments,
  listUserLocations,
  listUsers,
  listUserTeams,
} from "../services/users";
import type { UsersFilters } from "../types";

const USERS_KEY = "users";

export function useUsersDataset() {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "dataset"],
    queryFn: () => getUsersDataset(api),
  });
}

export function useUsersList(filters: UsersFilters) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "list", filters],
    queryFn: () => listUsers(api, filters),
    placeholderData: (prev) => prev,
  });
}

export function useUsersCount(filters: Omit<UsersFilters, "page" | "pageSize" | "searchText">) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "count", filters],
    queryFn: () => getUsersCount(api, filters),
    placeholderData: (prev) => prev,
  });
}

export function useUserDetail(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "detail", userId],
    queryFn: () => getUserDetail(api, userId || ""),
    enabled: Boolean(userId),
  });
}

export function useUserTeams(status = "ACTIVE") {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "teams", status],
    queryFn: () => listUserTeams(api, status),
    placeholderData: (prev) => prev,
  });
}

export function useUserDepartments() {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "departments"],
    queryFn: () => listUserDepartments(api),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserLocations() {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "locations"],
    queryFn: () => listUserLocations(api),
    staleTime: 5 * 60 * 1000,
  });
}
