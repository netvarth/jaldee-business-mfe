export type {
  ApiScope,
  SharedModuleName,
  SharedModuleProps,
  SharedModuleRouteParams,
  ModuleAccessResult,
  ScopeAwareRequestConfig,
} from "./types";

export { SHARED_MODULE_NAMES, API_SCOPES } from "./types";

export {
  buildSharedQueryKey,
  buildScopedListQueryKey,
  buildScopedDetailQueryKey,
} from "./queryKeys";

export {
  resolveEntityLabel,
  resolveCustomerLabel,
  resolveStaffLabel,
  resolveLeadLabel,
  resolveLabelSet,
} from "./labels";

export { SharedModulesContext, SharedModulesProvider, useSharedModulesContext } from "./context";
export { useModuleAccess } from "./useModuleAccess";
export { useApiScope } from "./useApiScope";
export type { Customer, CustomerFilters, CustomerFormValues, CustomerVisit } from "./customers";
export {
  CustomersModule,
  CustomersList,
  CustomerDetail,
  CustomerLinkedRecords,
  CustomerFormDialog,
  getCustomerColumns,
  useCustomersList,
  useCustomersCount,
  useCustomerDetail,
  useCustomerVisits,
  useCreateCustomer,
  useUpdateCustomer,
} from "./customers";

export type { Membership, MembershipFilters, MembershipFormValues } from "./memberships";
export {
  MembershipsModule,
  MembershipsList,
  MembershipDetail,
  MembershipFormDialog,
  getMembershipsColumns,
  useMembershipsList,
  useMembershipDetail,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
} from "./memberships";
