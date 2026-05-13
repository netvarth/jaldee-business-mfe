import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSharedModulesContext } from "../../context";
import {
  assignUserLocations,
  changeUserLoginId,
  createUser,
  createUserTeam,
  getUserLoginId,
  getUserAccountProfile,
  getUserDetail,
  getUserNonWorkingDaysCount,
  getUsersCount,
  getUsersDataset,
  listUserDepartments,
  listUserLocations,
  listUserNonWorkingDays,
  listUserQueues,
  listUserSchedules,
  listUserServices,
  listUsers,
  listUserTeams,
} from "../services/users";
import type { ChangeLoginIdInput, CreateTeamInput, CreateUserInput, UsersFilters } from "../types";

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

export function useUserAccountProfile(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "account-profile", userId],
    queryFn: () => getUserAccountProfile(api, userId || ""),
    enabled: Boolean(userId),
  });
}

export function useUserServices(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "services", userId],
    queryFn: () => listUserServices(api, userId || ""),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });
}

export function useUserQueues(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "queues", userId],
    queryFn: () => listUserQueues(api, userId || ""),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });
}

export function useUserSchedules(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "schedules", userId],
    queryFn: () => listUserSchedules(api, userId || ""),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });
}

export function useUserNonWorkingDays(userId?: string | null, page = 1, pageSize = 10) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "non-working-days", userId, page, pageSize],
    queryFn: () => listUserNonWorkingDays(api, userId || "", page, pageSize),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });
}

export function useUserNonWorkingDaysCount(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "non-working-days-count", userId],
    queryFn: () => getUserNonWorkingDaysCount(api, userId || ""),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  });
}

export function useCreateUser() {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(api, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "list"] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "count"] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "dataset"] }),
      ]);
    },
  });
}

export function useCreateUserTeam() {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTeamInput) => createUserTeam(api, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "teams"] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "dataset"] }),
      ]);
    },
  });
}

export function useAssignUserLocations(userId?: string | null) {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationIds: string[]) => assignUserLocations(api, userId || "", locationIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "list"] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "detail", userId] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "dataset"] }),
      ]);
    },
  });
}

export function useUserLoginId(userId?: string | null) {
  const { api } = useSharedModulesContext();

  return useQuery({
    queryKey: [USERS_KEY, "login-id", userId],
    queryFn: () => getUserLoginId(api, userId || ""),
    enabled: Boolean(userId),
  });
}

export function useChangeUserLoginId() {
  const { api } = useSharedModulesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeLoginIdInput) => changeUserLoginId(api, input),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "login-id", variables.userId] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "list"] }),
        queryClient.invalidateQueries({ queryKey: [USERS_KEY, "detail", variables.userId] }),
      ]);
    },
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
