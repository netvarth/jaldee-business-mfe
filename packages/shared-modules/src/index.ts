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

export type { LeadListFilters, LeadSummary, LeadEntityFormMode } from "./leads";
export {
  LeadsModule,
  LeadsDashboard,
  LeadsList,
  LeadDetails,
  ProductTypeList,
  ProductTypeForm,
  ChannelsList,
  ChannelForm,
  LeadCustomersList,
  LeadCustomerForm,
  AuditLogList,
  useLeadStats,
  useLeads,
  useLeadsCount,
  useLeadByUid,
  useLeadLogs,
  useLeadLogsCount,
  useProductTypes,
  useProductTypeCount,
  useProductTypeByUid,
  useCreateProductType,
  useUpdateProductType,
  useChangeProductTypeStatus,
  useLeadTemplates,
  useChannels,
  useChannelsCount,
  useChannelByUid,
  useCreateChannel,
  useUpdateChannel,
  useChangeChannelStatus,
  useChannelTemplates,
  useLeadCustomers,
  useLeadCustomersCount,
  useLeadCustomerByUid,
  useCreateLeadCustomer,
  useUpdateLeadCustomer,
  useProviderLocations,
  useProviderUsers,
} from "./leads";

export type {
  QuestionnaireAnswerLine,
  QuestionnaireDefinition,
  QuestionnaireFieldType,
  QuestionnaireFileValue,
  QuestionnaireFormState,
  QuestionnaireQuestionDefinition,
  QuestionnaireQuestionItem,
  QuestionnaireSubmitPayload,
  QuestionnaireValue,
  QuestionnaireValueMap,
} from "./questionnaire";
export { QuestionnaireForm } from "./questionnaire";

export { FinanceModule } from "./finance";
