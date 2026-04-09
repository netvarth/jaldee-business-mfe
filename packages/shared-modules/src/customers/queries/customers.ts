import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildScopedDetailQueryKey, buildScopedListQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import { useSharedModulesContext } from "../../context";
import {
  addCustomerToGroup,
  addLabelsToCustomer,
  changeCustomerStatus,
  changeCustomerGroupStatus,
  createCustomerGroup,
  createCustomerGroupMemberId,
  createCustomer,
  createCustomerFamilyMember,
  createCustomerMedicalHistory,
  createCustomerNote,
  deleteCustomerFamilyMember,
  deleteCustomerMedicalHistory,
  deleteCustomerNote,
  getCustomerGroupMemberId,
  getCustomerGroupMembers,
  getCustomerGroups,
  getCustomerById,
  getCustomerCount,
  getCustomerQuestionnaire,
  getCustomerFamilyMembers,
  getCustomerLabels,
  getCustomerMedicalHistory,
  getCustomerNotes,
  getFutureVisits,
  getHistoryVisits,
  getOrderVisits,
  getTodayVisits,
  listCustomers,
  removeCustomerFromGroup,
  removeLabelsFromCustomer,
  exportCustomers,
  removeCustomerPhoto,
  updateCustomerMedicalHistory,
  updateCustomerGroup,
  updateCustomerGroupMemberId,
  updateCustomerNote,
  uploadCustomerPhoto,
  updateCustomer,
} from "../services/customers";
import type {
  CustomerFilters,
  CustomerFamilyMemberValues,
  CustomerFormValues,
  CustomerGroup,
  CustomerGroupValues,
  CustomerMedicalHistoryValues,
  CustomerNoteValues,
} from "../types";

export function useCustomersList(filters: CustomerFilters) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, filters),
    queryFn: () => listCustomers(scopedApi, filters),
  });
}

export function useCustomersCount(filters: CustomerFilters) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, "count", filters),
    queryFn: () => getCustomerCount(scopedApi, filters),
  });
}

export function useCustomerDetail(customerId: string | null) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId ?? "missing"),
    queryFn: () => getCustomerById(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCustomerVisits(customerId: string | null) {
  const scopedApi = useApiScope();

  const today = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-today`),
    queryFn: () => getTodayVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  const future = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-future`),
    queryFn: () => getFutureVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  const history = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-history`),
    queryFn: () => getHistoryVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  const orders = useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-orders`),
    queryFn: () => getOrderVisits(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });

  return { today, future, history, orders };
}

export function useCustomerNotes(customerId: string | null) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-notes`),
    queryFn: () => getCustomerNotes(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCustomerLabels() {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("customer-labels", scopedApi.apiScope, scopedApi.locationId),
    queryFn: () => getCustomerLabels(scopedApi),
  });
}

export function useCustomerGroups() {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("customer-groups", scopedApi.apiScope, scopedApi.locationId),
    queryFn: () => getCustomerGroups(scopedApi),
  });
}

export function useCustomerMemberships(customerId: string | null) {
  const scopedApi = useApiScope();
  const groupsQuery = useCustomerGroups();

  return useQuery<CustomerGroup[]>({
    queryKey: buildScopedDetailQueryKey("customer-groups", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-memberships`),
    enabled: Boolean(customerId) && Boolean(groupsQuery.data),
    queryFn: async () => {
      const groups = groupsQuery.data ?? [];
      const memberships: CustomerGroup[] = [];

      await Promise.all(
        groups.map(async (group) => {
          const members = await getCustomerGroupMembers(scopedApi, group.id);
          const isMember = members.some((member) => member.id === customerId);
          if (!isMember) {
            return;
          }

          const memberId = await getCustomerGroupMemberId(scopedApi, group.groupName, customerId as string);
          memberships.push({ ...group, memberId });
        })
      );

      return memberships;
    },
  });
}

export function useCustomerGroupMembers(groupId: string | null) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customer-groups", scopedApi.apiScope, scopedApi.locationId, `${groupId ?? "missing"}-members`),
    queryFn: () => getCustomerGroupMembers(scopedApi, groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useCustomerFamilyMembers(customerId: string | null) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-family`),
    queryFn: () => getCustomerFamilyMembers(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCustomerQuestionnaire() {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("customer-questionnaire", scopedApi.apiScope, scopedApi.locationId),
    queryFn: () => getCustomerQuestionnaire(scopedApi),
  });
}

export function useCustomerMedicalHistory(customerId: string | null) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-medical-history`),
    queryFn: () => getCustomerMedicalHistory(scopedApi, customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomer() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => createCustomer(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });
    },
  });
}

export function useUpdateCustomer() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  const { routeParams } = useSharedModulesContext();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => updateCustomer(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });

      if (routeParams?.recordId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, routeParams.recordId),
        });
      }
    },
  });
}

export function useChangeCustomerStatus(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: "ACTIVE" | "INACTIVE") => changeCustomerStatus(scopedApi, customerId as string, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId),
        });
      }
    },
  });
}

export function useUploadCustomerPhoto(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachments: Parameters<typeof uploadCustomerPhoto>[2]) =>
      uploadCustomerPhoto(scopedApi, customerId as string, attachments),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId),
        });
      }
    },
  });
}

export function useRemoveCustomerPhoto(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachments: Parameters<typeof removeCustomerPhoto>[2]) =>
      removeCustomerPhoto(scopedApi, customerId as string, attachments),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customers", scopedApi.apiScope, scopedApi.locationId],
      });
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId),
        });
      }
    },
  });
}

export function useCreateCustomerNote(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Omit<CustomerNoteValues, "customerId">) =>
      createCustomerNote(scopedApi, { ...values, customerId: customerId as string }),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId}-notes`),
        });
      }
    },
  });
}

export function useUpdateCustomerNote(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerNoteValues) => updateCustomerNote(scopedApi, values),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId}-notes`),
        });
      }
    },
  });
}

export function useDeleteCustomerNote(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => deleteCustomerNote(scopedApi, noteId),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId}-notes`),
        });
      }
    },
  });
}

export function useAddCustomerLabels(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labels: string[]) => addLabelsToCustomer(scopedApi, customerId as string, labels),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId as string),
      });
    },
  });
}

export function useRemoveCustomerLabels(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (labels: string[]) => removeLabelsFromCustomer(scopedApi, customerId as string, labels),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, customerId as string),
      });
    },
  });
}

export function useCreateCustomerGroup() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerGroupValues) => createCustomerGroup(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
    },
  });
}

export function useUpdateCustomerGroup() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerGroupValues) => updateCustomerGroup(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
    },
  });
}

export function useChangeCustomerGroupStatus() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, status }: { groupId: string; status: "ENABLE" | "DISABLE" }) =>
      changeCustomerGroupStatus(scopedApi, groupId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
    },
  });
}

export function useAddCustomerToGroup(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupName: string) => addCustomerToGroup(scopedApi, groupName, customerId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customer-groups", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-memberships`),
      });
    },
  });
}

export function useRemoveCustomerFromGroup(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupName: string) => removeCustomerFromGroup(scopedApi, groupName, customerId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customer-groups", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-memberships`),
      });
    },
  });
}

export function useRemoveSpecificCustomerFromGroup() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupName, customerId }: { groupName: string; customerId: string }) =>
      removeCustomerFromGroup(scopedApi, groupName, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["customer-groups", scopedApi.apiScope, scopedApi.locationId],
      });
    },
  });
}

export function useUpsertCustomerGroupMemberId(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupName,
      memberId,
      existing,
    }: {
      groupName: string;
      memberId: string;
      existing?: string | null;
    }) => {
      if (existing) {
        return updateCustomerGroupMemberId(scopedApi, groupName, customerId as string, memberId);
      }

      return createCustomerGroupMemberId(scopedApi, groupName, customerId as string, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customer-groups", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-memberships`),
      });
    },
  });
}

export function useCreateCustomerFamilyMember(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerFamilyMemberValues) => createCustomerFamilyMember(scopedApi, customerId as string, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-family`),
      });
    },
  });
}

export function useDeleteCustomerFamilyMember(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => deleteCustomerFamilyMember(scopedApi, memberId, customerId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-family`),
      });
    },
  });
}

export function useCreateCustomerMedicalHistory(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Omit<CustomerMedicalHistoryValues, "providerConsumerId">) =>
      createCustomerMedicalHistory(scopedApi, { ...values, providerConsumerId: customerId as string }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-medical-history`),
      });
    },
  });
}

export function useUpdateCustomerMedicalHistory(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CustomerMedicalHistoryValues) => updateCustomerMedicalHistory(scopedApi, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-medical-history`),
      });
    },
  });
}

export function useDeleteCustomerMedicalHistory(customerId: string | null) {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomerMedicalHistory(scopedApi, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildScopedDetailQueryKey("customers", scopedApi.apiScope, scopedApi.locationId, `${customerId ?? "missing"}-medical-history`),
      });
    },
  });
}

export function useExportCustomers() {
  const scopedApi = useApiScope();

  return useMutation({
    mutationFn: (email: string) => exportCustomers(scopedApi, email),
  });
}
