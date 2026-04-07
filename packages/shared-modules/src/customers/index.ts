export type { Customer, CustomerFilters, CustomerFormValues, CustomerVisit } from "./types";
export { getCustomerColumns } from "./getCustomerColumns";
export { CustomersModule } from "./CustomersModule";
export { CustomersList } from "./components/CustomersList";
export { CustomerDetail } from "./components/CustomerDetail";
export { CustomerLinkedRecords } from "./components/CustomerLinkedRecords";
export { CustomerFormDialog } from "./components/CustomerFormDialog";
export {
  useCustomersList,
  useCustomersCount,
  useCustomerDetail,
  useCustomerVisits,
  useCreateCustomer,
  useUpdateCustomer,
} from "./queries/customers";
