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

export type {
  OrdersAction,
  OrdersCatalogRow,
  OrdersDataset,
  InventoryDashboardDataset,
  InventoryAdjustmentDetail,
  InventoryAdjustmentDetailItem,
  InventoryAdjustmentFormOptions,
  InventoryAdjustmentItemOption,
  InventoryAdjustmentOption,
  InventoryAdjustmentRow,
  InventoryAdjustmentStatus,
  InventoryCatalogItemRow,
  InventoryCatalogRow,
  InventoryStockRow,
  InventoryStocksFormOptions,
  InventoryAuditLogRow,
  InventorySummaryRow,
  OrdersInventoryRow,
  OrdersInvoiceRow,
  OrdersItemRow,
  OrdersItemSettings,
  OrdersItemSettingsOption,
  OrdersOrderRow,
  OrdersRequestRow,
  OrdersSummary,
  OrdersViewKey,
} from "./orders";
export {
  OrdersModule,
  InventoryDashboard,
  InventoryAdjustmentsPage,
  InventoryCatalogsPage,
  InventoryStocksPage,
  InventorySummaryPage,
  OrdersDashboard,
  OrdersInvoicesList,
  OrdersItemsList,
  OrdersList,
  OrdersRequestsList,
  OrdersCatalogList,
  OrdersInventoryList,
  OrdersSettings,
  useOrdersDataset,
  useInventoryDashboardDataset,
  useInventoryAdjustmentsPage,
  useInventoryAdjustmentFormOptions,
  useInventoryCatalogItemsPage,
  useInventoryCatalogsPage,
  useInventoryCatalogDetail,
  useInventoryCatalogDetailItemsPage,
  useInventoryStocksFormOptions,
  useInventoryStocksPage,
  useInventoryAuditLogsPage,
  useInventorySummaryPage,
  useUpdateInventoryCatalog,
  useUpdateInventoryCatalogItemStatus,
  useUpdateInventoryCatalogStatus,
  useInventoryAdjustmentDetail,
  useSaveInventoryAdjustment,
  useChangeInventoryAdjustmentStatus,
  useCreateInventoryAdjustmentRemark,
  useOrdersInvoicesPage,
  useOrdersItemsPage,
  useOrdersOrders,
  useOrdersRequests,
  useOrdersCatalogs,
  useOrdersInventory,
  getOrdersDataset,
  formatOrdersCurrency,
  getOrdersStatusVariant,
} from "./orders";

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
export { useUrlPagination } from "./useUrlPagination";
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

export type { Store, StoreFilters, StoreLocation, StoreType } from "./stores";
export {
  StoresModule,
  StoresList,
  useStoresList,
  useStoresCount,
  useStoreTypes,
  useStoreLocations,
} from "./stores";

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

export type {
  IpAdmissionRow,
  IpBedRow,
  IpBillingRow,
  IpDataset,
  IpPatientRow,
  IpPatientStatus,
  IpSummary,
  IpViewKey,
} from "./ip";
export {
  IpModule,
  IpOverview,
  IpPatientsList,
  IpAdmissionsList,
  IpBedsList,
  IpBillingList,
  IpSettings,
  useIpAdmissions,
  useIpBeds,
  useIpBilling,
  useIpDataset,
  useIpPatients,
} from "./ip";

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

export type {
  DriveActivityRow,
  DriveDataset,
  DriveFileRow,
  DriveFolderRow,
  DriveShareInput,
  DriveSharedRow,
  DriveSummary,
  DriveViewKey,
} from "./drive";
export {
  DriveModule,
  DriveOverview,
  DriveFilesList,
  DriveFoldersList,
  DriveSharedList,
  DriveActivityList,
  DriveSettings,
  useDriveActivity,
  useDriveDataset,
  useDriveFiles,
  useDriveFolders,
  useDriveShared,
  useDeleteDriveFile,
  useShareDriveFile,
  useUploadDriveFiles,
} from "./drive";

export type {
  FinanceDataset,
  FinanceInvoiceRow,
  FinanceInvoiceStatus,
  FinancePaymentRow,
  FinanceReportRow,
  FinanceSummary,
  FinanceViewKey,
} from "./finance";
export {
  FinanceModule,
  FinanceOverview,
  FinanceInvoicesList,
  FinancePaymentsList,
  FinanceReportsList,
  FinanceSettings,
  useFinanceDataset,
  useFinanceInvoices,
  useFinancePayments,
  useFinanceReports,
  useFinanceSummaries,
} from "./finance";
