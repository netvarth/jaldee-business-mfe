import type { ProductKey } from "@jaldee/auth-context";
import type {
  GeneratedReportRow,
  GeneratedReportDetail,
  ReportCatalogItem,
  ReportCreateConfig,
  ReportGeneratePayload,
  ReportOption,
  ReportsPageFilter,
  SavedReportRow,
} from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

const REPORT_STATUS_PATH = "provider/report/status/cache/DONE,INPROGRESS,NEW,SEEN";

const PAYMENT_STATUS_OPTIONS: ReportOption[] = [
  { value: "NotPaid", label: "Not Paid" },
  { value: "PartiallyPaid", label: "Partially Paid" },
  { value: "FullyPaid", label: "Fully Paid" },
  { value: "Refund", label: "Refund" },
  { value: "PartiallyRefunded", label: "Partially Refunded" },
  { value: "FullyRefunded", label: "Fully Refundeded" },
];

const INVOICE_STATUS_OPTIONS: ReportOption[] = [
  { value: "New", label: "New" },
  { value: "Settled", label: "Settled" },
  { value: "Cancel", label: "Cancel" },
  { value: "Draft", label: "Draft" },
];

const ORDER_INVOICE_STATUS_OPTIONS: ReportOption[] = [
  { value: "New", label: "New" },
  { value: "Settled", label: "Settled" },
  { value: "Cancel", label: "Cancelled" },
  { value: "FAILED_ORDER_INVOICE", label: "Prepayment Failed Order" },
  { value: "PREPAYMENT_PENDING_INVOICE", label: "Prepayment Pending Invoice" },
];

const ORDER_STATUS_OPTIONS: ReportOption[] = [
  { value: "ORDER_DRAFT", label: "Draft Orders" },
  { value: "ORDER_CONFIRMED", label: "Confirmed Orders" },
  { value: "ORDER_COMPLETED", label: "Completed Orders" },
  { value: "ORDER_DISCARDED", label: "Discarded Orders" },
  { value: "ORDER_CANCELED", label: "Canceled Orders" },
];

const DELIVERY_STATUS_OPTIONS: ReportOption[] = [
  { value: "NOT_DELIVERED", label: "Not Delivered" },
  { value: "ORDER_RECEIVED", label: "Order Received" },
  { value: "PACKING", label: "Packing" },
  { value: "READY_FOR_PICKUP", label: "Ready For Pickup" },
  { value: "IN_TRANSIST", label: "In Transit" },
  { value: "DELIVERED", label: "Delivered" },
];

const MOVEMENT_TYPE_OPTIONS: ReportOption[] = [
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "PURCHASE_RETURN", label: "Purchase Return" },
  { value: "SALES", label: "Sales" },
  { value: "SALES_RETURN", label: "Sales Return" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "TRANSFER_IN", label: "Transfer In" },
];

const TIME_PERIOD_OPTIONS: ReportOption[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_WEEK", label: "Last 7 days" },
  { value: "LAST_THIRTY_DAYS", label: "Last 30 days" },
  { value: "NEXT_WEEK", label: "Next 7 days" },
  { value: "NEXT_THIRTY_DAYS", label: "Next 30 days" },
  { value: "DATE_RANGE", label: "Date Range" },
];

const PAST_TIME_PERIOD_OPTIONS = TIME_PERIOD_OPTIONS.filter((option) => !option.value.startsWith("NEXT_"));

const PRODUCT_OPTIONS: ReportOption[] = [
  { value: "BOOKING", label: "Booking" },
  { value: "ORDER", label: "Order" },
  { value: "DONATION", label: "Donation" },
  { value: "FINANCE", label: "Finance" },
];

const INVOICE_PRODUCT_OPTIONS: ReportOption[] = [
  ...PRODUCT_OPTIONS,
  { value: "IP", label: "IP" },
];

const SALES_PRODUCT_OPTIONS: ReportOption[] = [{ value: "ORDER", label: "Order" }];

const PAYMENT_MODE_OPTIONS: ReportOption[] = [
  { value: "Cash", label: "Cash" },
  { value: "CC", label: "Credit Card" },
  { value: "DC", label: "Debit Card" },
  { value: "NB", label: "Net banking" },
  { value: "WALLET", label: "Wallet" },
  { value: "UPI", label: "UPI" },
  { value: "Other", label: "Other" },
];

const GATEWAY_OPTIONS: ReportOption[] = [
  { value: "RAZORPAY", label: "Razorpay" },
  { value: "PAYTM", label: "Paytm" },
  { value: "PAYUMONEY", label: "Payumoney" },
];

const DUE_OPTIONS: ReportOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

type ReportCondition =
  | "appointments"
  | "tokens"
  | "userService"
  | "financeInvoice"
  | "financeExpense"
  | "financeRevenue"
  | "financePayout"
  | "customerDue"
  | "payments"
  | "donations"
  | "customerInfo"
  | "coupons"
  | "reimbursements"
  | "cdl"
  | "licenseUser"
  | "licenseDealer"
  | "crm"
  | "crmOrLending"
  | "leadOrCdl"
  | "ivr"
  | "salesOrder"
  | "salesInvoice"
  | "gst"
  | "inventoryRx"
  | "inventory"
  | "lendingLead"
  | "lending"
  | "activeUser"
  | "ip";

type ReportCatalogDefinition = ReportCatalogItem & {
  condition: ReportCondition;
  uiConfigKey?: string;
};

type ReportsSettings = {
  accountSettings: Record<string, unknown>;
  financeSettings: Record<string, unknown>;
  taxSettings: Record<string, unknown>;
  uiConfig: Record<string, unknown> | null;
};

export const REPORT_CATALOG: ReportCatalogDefinition[] = [
  { reportName: "Appointments", reportType: "APPOINTMENT", group: "General", showSavedReports: true, condition: "appointments", uiConfigKey: "REPORTS_APPOINTMENTS", products: ["health", "bookings"] },
  { reportName: "Tokens / Checkins", reportType: "TOKEN", group: "General", showSavedReports: true, condition: "tokens", uiConfigKey: "REPORTS_TOKENS", products: ["health", "bookings"] },
  { reportName: "User / Service", reportType: "SUB_SERVICE_REPORT", group: "General", showSavedReports: true, condition: "userService", uiConfigKey: "REPORTS_USERPERFORMANCE", products: ["health", "bookings", "finance", "karty", "golderp"] },
  { reportName: "Invoice", reportType: "INVOICE_REPORT", group: "Finance", showSavedReports: true, condition: "financeInvoice", uiConfigKey: "REPORTS_INVOICE", products: ["health", "bookings", "finance", "karty", "golderp"] },
  { reportName: "Expense", reportType: "EXPENSE_REPORT", group: "Finance", showSavedReports: true, condition: "financeExpense", uiConfigKey: "REPORTS_EXPENSE", products: ["finance", "health", "karty", "golderp"] },
  { reportName: "Revenue", reportType: "REVENUE_REPORT", group: "Finance", showSavedReports: true, condition: "financeRevenue", uiConfigKey: "REPORTS_REVENUE", products: ["finance", "health", "karty", "golderp"] },
  { reportName: "Payout", reportType: "PAYOUT_REPORT", group: "Finance", showSavedReports: true, condition: "financePayout", uiConfigKey: "REPORTS_PAYOUT", products: ["finance", "health", "bookings", "karty", "golderp"] },
  { reportName: "Customer Amount Due", reportType: "PATIENT_WISE_INVOICE_AMOUNT_DUE_REPORT", group: "Finance", showSavedReports: true, condition: "customerDue", uiConfigKey: "REPORTS_PATIENTDUE", products: ["health", "bookings", "finance", "karty", "golderp"] },
  { reportName: "Payments", reportType: "PAYMENT", group: "Finance", showSavedReports: true, condition: "payments", uiConfigKey: "REPORTS_PAYMENTS", products: ["health", "bookings", "finance", "karty", "golderp"] },
  { reportName: "Donations", reportType: "DONATION", group: "General", showSavedReports: true, condition: "donations", uiConfigKey: "REPORTS_DONATIONS", products: ["health", "bookings"] },
  { reportName: "Customer Information", reportType: "CUST_INFO_REPORT", group: "General", showSavedReports: true, condition: "customerInfo", uiConfigKey: "REPORTS_PATIENTSINFO", products: ["health", "bookings", "karty", "golderp"] },
  { reportName: "Coupons", reportType: "PROVIDER_COUPON_REPORT", group: "General", showSavedReports: true, condition: "coupons", uiConfigKey: "REPORTS_COUPONS", products: ["bookings", "karty", "golderp"] },
  { reportName: "Reimbursements", group: "General", showSavedReports: false, routeTo: "settings/pos/coupons/report", condition: "reimbursements", uiConfigKey: "REPORTS_REIMBURSEMENT", products: ["health", "bookings", "finance", "karty", "golderp"] },
  { reportName: "Loan Application Status", reportType: "LOAN_APPLICATION_STATUS", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "LOS Lead", reportType: "LOS_LEAD_REPORT", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "Estamp Used", reportType: "ESTAMP_USED_REPORT", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "Estamp Balance", reportType: "ESTAMP_BALANCE_REPORT", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "Loan Application Partial Status", reportType: "LOAN_APPLICATION_PARTIAL_STATUS", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "Approved Partners", reportType: "PARTNER_REPORT", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "Rejected Loan Application", reportType: "REJECTED_LOANAPPLICATION", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "SpInternal Status Wise Loan", reportType: "LOAN_REPORT", group: "Lending", showSavedReports: true, condition: "cdl", products: ["lending"] },
  { reportName: "License User", reportType: "USER_REPORT", group: "General", showSavedReports: true, condition: "licenseUser", uiConfigKey: "REPORTS_LICENSEUSER", products: ["health", "bookings", "finance", "karty", "golderp"] },
  { reportName: "License Dealer", reportType: "LICENSE_DEALER_REPORT", group: "Lending", showSavedReports: true, condition: "licenseDealer", products: ["lending"] },
  { reportName: "CRM Lead", reportType: "CRM_LEAD", group: "CRM", showSavedReports: true, condition: "crm", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Enquiry", reportType: "ENQUIRY_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Monthly Activity Consolidated", reportType: "MONTHLY_ACTIVITY", group: "CRM", showSavedReports: true, condition: "crmOrLending", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Employee Daily Activity", reportType: "DAILY_ACTIVITY", group: "CRM", showSavedReports: true, condition: "crmOrLending", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Consolidated Activity (HO)", reportType: "CONSOLIDATED_REPORT", group: "CRM", showSavedReports: true, condition: "crmOrLending", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Activity Report", reportType: "CRM_TASK", group: "CRM", showSavedReports: true, condition: "crmOrLending", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Lead Status", reportType: "LEAD_STATUS", group: "CRM", showSavedReports: true, condition: "crm", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Processing Files", reportType: "PROCESSING_FILES_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "HO-Tat", reportType: "TAT_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Recommended Status", reportType: "RECOMMENDED_STATUS_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Logins", reportType: "LOGIN_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "HO-Leads Status", reportType: "HO_LEADS_STATUS", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Sanctioned Status", reportType: "SANCTIONED_STATUS", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Employee-Average Tat", reportType: "EMPLOYEE_AVERAGE_TAT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Customers", reportType: "CUST_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Customer CRIF Status", reportType: "CUST_CRIF_STATUS", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Customer Wise Enquiry", reportType: "CUST_ENQUIRY", group: "CRM", showSavedReports: true, condition: "leadOrCdl", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "Documents Collection", reportType: "DOCUMENT_COLLECTION", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Loan Applications", reportType: "LOAN_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Loan User Application", reportType: "LOAN_USER_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "Loan Partner Wise Application", reportType: "LOAN_PARTENER_REPORT", group: "CRM", showSavedReports: true, condition: "crm", products: ["lending"] },
  { reportName: "IVR Users", reportType: "IVR_USER_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Calls", reportType: "IVR_CALL_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Call Metric", reportType: "IVR_CALL_METRIC_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Incoming Call", reportType: "IVR_INCOMING_CALL_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Questionnaire", reportType: "QNR_IVR_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Call Frequency", reportType: "IVR_CALL_FREQUENCY_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Service Hours Summary", reportType: "IVR_SERVICE_OURS_SUMMARY_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Call Missed", reportType: "IVR_CALL_MISSED", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Volunteers Performance", reportType: "IVR_VOLUNTEERS_PERFORMANCE", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "IVR Call and Questionnaire Completion", reportType: "IVR_CALL_AND_QNR_COMPLETION_REPORT", group: "IVR", showSavedReports: true, condition: "ivr", products: ["health"] },
  { reportName: "Sales Order", reportType: "SALES_ORDER", group: "Sales", showSavedReports: true, condition: "salesOrder", products: ["karty", "golderp"] },
  { reportName: "Sales by Product", reportType: "SALES_BY_PRODUCT", group: "Sales", showSavedReports: true, condition: "salesOrder", products: ["karty", "golderp"] },
  { reportName: "Customer Sales", reportType: "CUSTOMER_SALES_REPORT", group: "Sales", showSavedReports: true, condition: "salesOrder", products: ["karty", "golderp"] },
  { reportName: "Sales Order Payment Status", reportType: "SALES_PAYMENT_REPORT", group: "Sales", showSavedReports: true, condition: "salesOrder", products: ["karty", "golderp"] },
  { reportName: "Sales Person Performance", reportType: "SALES_PERSON_PERFORMANCE_REPORT", group: "Sales", showSavedReports: true, condition: "salesOrder", products: ["karty", "golderp"] },
  { reportName: "Sales Invoice", reportType: "INVOICE_REPORT", group: "Sales", showSavedReports: true, condition: "salesInvoice", products: ["karty", "golderp", "health"] },
  { reportName: "Invoice GST Item", reportType: "INVOICE_GST_ITEM_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "Invoice GST", reportType: "INVOICE_GST_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "GST DOC", reportType: "INVOICE_GST_NATURE_DOCUMENT_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "GST B2B", reportType: "INVOICE_GST_B2B_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "GST B2C", reportType: "INVOICE_GST_B2C_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "GST HSN", reportType: "INVOICE_GST_HSN_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "GST Exempt", reportType: "INVOICE_GST_EXEMPT_REPORT", group: "GST", showSavedReports: true, condition: "gst", products: ["finance", "karty", "golderp", "health"] },
  { reportName: "Rx Request", reportType: "RX_REQUESTS_REPORT", group: "Inventory", showSavedReports: true, condition: "inventoryRx", products: ["health"] },
  { reportName: "Stock Summary", reportType: "STOCK_SUMMERY_REPORT", group: "Inventory", showSavedReports: true, condition: "inventory", products: ["karty", "golderp"] },
  { reportName: "Out-Of-Stock", reportType: "OUT_OF_STOCK_REPORT", group: "Inventory", showSavedReports: true, condition: "inventory", products: ["karty", "golderp"] },
  { reportName: "Stock Transfer", reportType: "STOCK_MOVEMENT_REPORT", group: "Inventory", showSavedReports: true, condition: "inventory", products: ["karty", "golderp"] },
  { reportName: "Inventory Adjustment", reportType: "INVENTORY_ADJUSTMENT_REPORT", group: "Inventory", showSavedReports: true, condition: "inventory", products: ["karty", "golderp"] },
  { reportName: "Lead Report", reportType: "LOS_LEAD_MANAGER_REPORT", group: "Lending", showSavedReports: true, condition: "lendingLead", products: ["lending"] },
  { reportName: "Converged Loan Report", reportType: "LOS_CONVERGED_LOAN_REPORT", group: "Lending", showSavedReports: true, condition: "lending", products: ["lending"] },
  { reportName: "Unconverged Loan Report", reportType: "LOS_UNCONVERGED_LOAN_REPORT", group: "Lending", showSavedReports: true, condition: "lending", products: ["lending"] },
  { reportName: "Customer Wise Report", reportType: "LOS_LEAD_CUSTOMER_REPORT", group: "Lending", showSavedReports: true, condition: "lendingLead", products: ["lending"] },
  { reportName: "Active User Report", reportType: "USER_REPORT_BY_LOGIN", group: "General", showSavedReports: true, condition: "activeUser", products: ["health", "karty", "golderp", "lending"] },
  { reportName: "IP Service / Technicians", reportType: "IP_SERVICE_CONSUMPTION_REPORT", group: "General", showSavedReports: true, condition: "ip", products: ["health"] },
];

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function buildPageParams(filter: ReportsPageFilter = {}, includePaging = true) {
  const params: Record<string, string | number> = {};

  if (includePaging) {
    params.from = filter.from ?? 0;
    params.count = filter.count ?? 10;
  }

  if (filter.reportType) params["reportType-eq"] = filter.reportType;
  if (filter.search?.trim()) {
    const search = filter.search.trim();
    params.or = [`reportType-like=${search}`, `reportName-like=${search}`, `reportToken-like=${search}`].join(",");
  }

  return params;
}

function normalizeDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "yes", "y", "1", "enabled", "enable", "active"].includes(normalized);
  }
  return false;
}

function readBoolean(record: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => asBoolean(record[key]));
}

function readUiConfig(settings: ReportsSettings, key?: string) {
  if (!key) return true;
  if (!settings.uiConfig) return true;
  return asBoolean(settings.uiConfig[key]);
}

function isLendingLead(settings: ReportsSettings) {
  const account = settings.accountSettings;
  return readBoolean(account, "jaldeeLending", "enableJaldeeLending") && readBoolean(account, "losLead", "enableLosLead");
}

function deriveFlags(settings: ReportsSettings) {
  const account = settings.accountSettings;
  const financeStatus = readBoolean(settings.financeSettings, "enableJaldeeFinance") || readBoolean(account, "enableJaldeeFinance");
  const enableTax = financeStatus && readBoolean(settings.taxSettings, "enableTax");
  const lendingLead = isLendingLead(settings);

  return {
    appointments: readBoolean(account, "appointment", "enableAppointment"),
    tokens: readBoolean(account, "waitlist", "enableWaitlist"),
    financeStatus,
    enableTax,
    donations: readBoolean(account, "donationFundRaising"),
    crm: readBoolean(account, "enableCrm", "enableCrmLead"),
    cdl: readBoolean(account, "enableCdl"),
    salesOrder: readBoolean(account, "enableSalesOrder"),
    inventory: readBoolean(account, "enableInventory"),
    lead: readBoolean(account, "enableLead"),
    ivr: readBoolean(account, "enableIvr"),
    inventoryRx: readBoolean(account, "enableInventoryRx"),
    inPatient: readBoolean(account, "inPatient"),
    lending: readBoolean(account, "jaldeeLending", "enableJaldeeLending"),
    losLead: readBoolean(account, "losLead", "enableLosLead"),
    lendingLead,
  };
}

function matchesCondition(report: ReportCatalogDefinition, settings: ReportsSettings) {
  const uiEnabled = readUiConfig(settings, report.uiConfigKey);
  const flags = deriveFlags(settings);
  const blockedForLosLead = !(flags.lending && flags.losLead);

  switch (report.condition) {
    case "appointments":
      return flags.appointments && uiEnabled;
    case "tokens":
      return flags.tokens && uiEnabled;
    case "userService":
      return (flags.appointments || flags.tokens || flags.financeStatus) && uiEnabled;
    case "financeInvoice":
    case "financeExpense":
    case "financeRevenue":
    case "financePayout":
    case "customerDue":
      return flags.financeStatus && uiEnabled;
    case "payments":
    case "customerInfo":
    case "coupons":
    case "licenseUser":
      return uiEnabled && blockedForLosLead;
    case "reimbursements":
      return uiEnabled && blockedForLosLead;
    case "donations":
      return flags.donations && uiEnabled;
    case "cdl":
    case "licenseDealer":
      return flags.cdl;
    case "crm":
      return flags.crm;
    case "crmOrLending":
      return flags.crm || flags.lending || flags.losLead;
    case "leadOrCdl":
      return (flags.crm || flags.cdl) && blockedForLosLead;
    case "ivr":
      return flags.ivr;
    case "salesOrder":
      return flags.salesOrder;
    case "salesInvoice":
      return flags.salesOrder || flags.inPatient;
    case "gst":
      return flags.financeStatus && flags.enableTax;
    case "inventoryRx":
      return flags.inventoryRx;
    case "inventory":
      return flags.inventory;
    case "lendingLead":
      return flags.lendingLead;
    case "lending":
      return flags.lending || flags.losLead;
    case "activeUser":
      return flags.crm || flags.lending;
    case "ip":
      return flags.inPatient;
    default:
      return false;
  }
}

function hasAnyLoadedSettings(settings: ReportsSettings) {
  return (
    Object.keys(settings.accountSettings).length > 0 ||
    Object.keys(settings.financeSettings).length > 0 ||
    Object.keys(settings.taxSettings).length > 0 ||
    Boolean(settings.uiConfig)
  );
}

function toCatalogItem(report: ReportCatalogDefinition): ReportCatalogItem {
  const { condition: _condition, uiConfigKey: _uiConfigKey, ...item } = report;
  return item;
}

async function optionalGet(api: ScopedApi, path: string) {
  try {
    const response = await api.get<unknown>(path);
    return response.data;
  } catch {
    return {};
  }
}

function resolveLicensePackageId(user: unknown, account: unknown) {
  const candidates = [asRecord(user), asRecord(account)];
  for (const candidate of candidates) {
    const nestedLicense = asRecord(asRecord(asRecord(candidate.accountLicenseDetails).accountLicense).licPkgLevel);
    const value =
      candidate.licensePackageId ??
      candidate.licensePackageID ??
      candidate.licPkgLevel ??
      candidate.licensePackage ??
      asRecord(candidate.accountLicenseDetails).licPkgLevel ??
      asRecord(asRecord(candidate.accountLicenseDetails).accountLicense).licPkgLevel ??
      nestedLicense.id;
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return "";
}

async function getReportSettings(api: ScopedApi, options: { user?: unknown; account?: unknown } = {}): Promise<ReportsSettings> {
  const licensePackageId = resolveLicensePackageId(options.user, options.account);
  const [accountSettings, financeSettings, taxSettings, licensePayload] = await Promise.all([
    optionalGet(api, "provider/account/settings"),
    optionalGet(api, "provider/jp/finance/settings"),
    optionalGet(api, "provider/payment/tax"),
    licensePackageId ? optionalGet(api, `provider/license/${licensePackageId}`) : Promise.resolve({}),
  ]);

  const licenseRecord = asRecord(licensePayload);
  const uiConfig = Object.keys(licenseRecord).length > 0 ? asRecord(licenseRecord.uiConfigSettings ?? licenseRecord) : null;

  return {
    accountSettings: asRecord(accountSettings),
    financeSettings: asRecord(financeSettings),
    taxSettings: asRecord(taxSettings),
    uiConfig,
  };
}

function normalizeOptions(payload: unknown, valueKeys: string[], labelKeys: string[]): ReportOption[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      const record = asRecord(item);
      const value = valueKeys.map((key) => record[key]).find((value) => value !== undefined && value !== null && String(value).trim());
      const label = labelKeys.map((key) => record[key]).find((value) => value !== undefined && value !== null && String(value).trim());
      if (value === undefined || value === null) return null;
      return { value: String(value), label: String(label ?? value) };
    })
    .filter(Boolean) as ReportOption[];
}

async function getCreateLookups(api: ScopedApi) {
  const [locations, invoiceCategories] = await Promise.all([
    optionalGet(api, "provider/locations"),
    optionalGet(api, "provider/jp/finance/category/type/Invoice"),
  ]);

  return {
    locations: normalizeOptions(locations, ["id", "encId"], ["place", "name", "displayName"]),
    invoiceCategories: normalizeOptions(invoiceCategories, ["id", "encId"], ["name", "displayName"]),
  };
}

function pageField(field: string, title: string, value = "id") {
  return { field, title, type: "page" as const, filterType: "eq", defaultValue: "All", options: [{ value, label: "All" }] };
}

export async function getReportCreateConfig(
  api: ScopedApi,
  reportType: string,
  reportName?: string
): Promise<ReportCreateConfig | null> {
  const lookups = await getCreateLookups(api);
  const time = (options = TIME_PERIOD_OPTIONS) => ({
    field: "timePeriod",
    title: "Time Period",
    type: "timePeriod" as const,
    filterType: "eq",
    options,
    defaultValue: "LAST_THIRTY_DAYS",
  });
  const locations = { field: "locationId", title: "Locations", type: "multiselect" as const, filterType: "eq", options: lookups.locations };

  const configs: ReportCreateConfig[] = [
    {
      reportName: "Invoice",
      reportType: "INVOICE_REPORT",
      fields: [
        { field: "product", title: "Product", type: "multiselect", filterType: "eq", options: INVOICE_PRODUCT_OPTIONS },
        { field: "billStatus", title: "Invoice Status", type: "multiselect", filterType: "eq", options: INVOICE_STATUS_OPTIONS },
        { field: "categoryId", title: "Category", type: "multiselect", filterType: "eq", options: lookups.invoiceCategories },
        { field: "billPaymentStatus", title: "Payment Status", type: "dropdown", filterType: "eq", options: PAYMENT_STATUS_OPTIONS },
        locations,
        { field: "amountDue", title: "Amount Due", type: "dropdown", filterType: "eq", options: DUE_OPTIONS },
        pageField("departmentId", "Departments", "departmentId"),
        { field: "providerConsumerData", title: "Customer Id", type: "text", filterType: "eq", prefix: "jaldeeId::" },
        time(),
      ],
    },
    {
      reportName: "Revenue",
      reportType: "REVENUE_REPORT",
      fields: [
        { field: "product", title: "Product", type: "multiselect", filterType: "eq", options: PRODUCT_OPTIONS },
        pageField("comingFromCategoryId", "Invoice Category"),
        locations,
        pageField("departmentId", "Departments", "departmentId"),
        pageField("category", "Revenue Category"),
        { field: "paymentMode", title: "Mode of Transaction", type: "multiselect", filterType: "eq", options: PAYMENT_MODE_OPTIONS },
        { field: "paymentGateWay", title: "Gateway", type: "dropdown", filterType: "eq", options: GATEWAY_OPTIONS },
        { field: "transactionId", title: "Transaction Id", type: "text", filterType: "like" },
        time(),
      ],
    },
    {
      reportName: "Expense",
      reportType: "EXPENSE_REPORT",
      fields: [
        pageField("category", "Category"),
        locations,
        { field: "paymentMode", title: "Mode of Transaction", type: "multiselect", filterType: "eq", options: PAYMENT_MODE_OPTIONS },
        { field: "paymentGateWay", title: "Gateway", type: "dropdown", filterType: "eq", options: GATEWAY_OPTIONS },
        { field: "transactionId", title: "Transaction Id", type: "text", filterType: "like" },
        pageField("vendorUid", "Vendor", "encId"),
        time(),
      ],
    },
    {
      reportName: "Payout",
      reportType: "PAYOUT_REPORT",
      fields: [
        { field: "product", title: "Product", type: "multiselect", filterType: "eq", options: PRODUCT_OPTIONS },
        pageField("comingFromCategoryId", "Expense Category"),
        locations,
        pageField("category", "Payout Category"),
        { field: "paymentMode", title: "Mode of Transaction", type: "multiselect", filterType: "eq", options: PAYMENT_MODE_OPTIONS },
        { field: "paymentGateWay", title: "Gateway", type: "dropdown", filterType: "eq", options: GATEWAY_OPTIONS },
        { field: "transactionId", title: "Transaction Id", type: "text", filterType: "like" },
        time(),
      ],
    },
    {
      reportName: "User / Service",
      reportType: "SUB_SERVICE_REPORT",
      fields: [pageField("service", "Services"), pageField("assignee", "Assignees"), { ...locations, field: "location", title: "Locations" }, time()],
    },
    {
      reportName: "Customer Amount Due",
      reportType: "PATIENT_WISE_INVOICE_AMOUNT_DUE_REPORT",
      fields: [locations, time()],
    },
    {
      reportName: "Payments",
      reportType: "PAYMENT",
      fields: [
        { field: "product", title: "Product", type: "multiselect", filterType: "eq", options: PRODUCT_OPTIONS },
        { field: "paymentMode", title: "Mode of Transaction", type: "multiselect", filterType: "eq", options: PAYMENT_MODE_OPTIONS },
        { field: "amount", title: "Amount (Rs)", type: "number", filterType: "eq" },
        { field: "onlinePayments", title: "Payment Channel", type: "dropdown", filterType: "eq", defaultValue: "all", options: [{ value: "all", label: "All" }, { value: "true", label: "Online" }] },
        locations,
        pageField("providerOwnConsumerId", "Customers", "jaldeeId"),
        pageField("departmentId", "Departments", "departmentId"),
        pageField("provider", "Users"),
        { field: "transactionEncId", title: "Confirmation", type: "text", filterType: "like", prefix: "confirmationNo::" },
        { field: "invoiceId", title: "Invoice ID", type: "text", filterType: "eq" },
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
    {
      reportName: "Sales Order",
      reportType: "SALES_ORDER",
      fields: [
        { field: "orderStatus", title: "Order Status", type: "multiselect", filterType: "eq", options: ORDER_STATUS_OPTIONS },
        locations,
        pageField("storeEncId", "Stores", "encId"),
        pageField("providerConsumerMemberJaldeeId", "Customers", "jaldeeId"),
        { field: "paymentStatus", title: "Payment Status", type: "multiselect", filterType: "eq", options: PAYMENT_STATUS_OPTIONS },
        { field: "deliveryStatus", title: "Delivery Status", type: "dropdown", filterType: "eq", options: DELIVERY_STATUS_OPTIONS },
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
    {
      reportName: "Sales by Product",
      reportType: "SALES_BY_PRODUCT",
      fields: [
        { field: "orderStatus", title: "Order Status", type: "multiselect", filterType: "eq", options: ORDER_STATUS_OPTIONS },
        locations,
        pageField("storeEncId", "Stores", "encId"),
        pageField("spItemCode", "Items", "spCode"),
        pageField("itemCategory", "Category"),
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
    {
      reportName: "Customer Sales",
      reportType: "CUSTOMER_SALES_REPORT",
      fields: [
        { field: "orderStatus", title: "Order Status", type: "multiselect", filterType: "eq", options: ORDER_STATUS_OPTIONS },
        locations,
        pageField("storeEncId", "Stores", "encId"),
        pageField("providerConsumerMemberJaldeeId", "Customers", "jaldeeId"),
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
    {
      reportName: "Sales Order Payment Status",
      reportType: "SALES_PAYMENT_REPORT",
      fields: [
        { field: "orderStatus", title: "Order Status", type: "multiselect", filterType: "eq", options: ORDER_STATUS_OPTIONS },
        locations,
        pageField("storeEncId", "Stores", "encId"),
        pageField("providerConsumerMemberJaldeeId", "Customers", "jaldeeId"),
        { field: "paymentStatus", title: "Payment Status", type: "multiselect", filterType: "eq", options: PAYMENT_STATUS_OPTIONS },
        { field: "deliveryStatus", title: "Delivery Type", type: "dropdown", filterType: "eq", options: DELIVERY_STATUS_OPTIONS },
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
    {
      reportName: "Sales Person Performance",
      reportType: "SALES_PERSON_PERFORMANCE_REPORT",
      fields: [
        { field: "orderStatus", title: "Order Status", type: "multiselect", filterType: "eq", options: ORDER_STATUS_OPTIONS },
        locations,
        pageField("storeEncId", "Stores", "encId"),
        pageField("assignee", "Assignees"),
        time(),
      ],
    },
    {
      reportName: "Sales Invoice",
      reportType: "INVOICE_REPORT",
      fields: [
        { field: "product", title: "Product", type: "multiselect", filterType: "eq", options: SALES_PRODUCT_OPTIONS },
        { field: "billPaymentStatus", title: "Payment Status", type: "multiselect", filterType: "eq", options: PAYMENT_STATUS_OPTIONS },
        { field: "billStatus", title: "Invoice Status", type: "multiselect", filterType: "eq", options: ORDER_INVOICE_STATUS_OPTIONS },
        locations,
        pageField("storeId", "Stores"),
        pageField("memberJaldeeId", "Customers", "jaldeeId"),
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
    {
      reportName: "Stock Transfer",
      reportType: "STOCK_MOVEMENT_REPORT",
      fields: [
        pageField("storeEncId", "Stores", "encId"),
        pageField("spItemCode", "Items", "spCode"),
        pageField("itemCategory", "Category"),
        pageField("assignee", "Assignees"),
        locations,
        { field: "movementType", title: "Movement Type", type: "multiselect", filterType: "eq", options: MOVEMENT_TYPE_OPTIONS },
        time(PAST_TIME_PERIOD_OPTIONS),
      ],
    },
  ];

  const generic = { reportName: reportName || asString(reportType, "Report"), reportType, fields: [time(PAST_TIME_PERIOD_OPTIONS)] };
  return configs.find((config) => config.reportType === reportType && (!reportName || config.reportName === reportName)) ?? configs.find((config) => config.reportType === reportType) ?? generic;
}

function toGeneratedReport(raw: Record<string, unknown>, index: number): GeneratedReportRow {
  const token = asString(raw.reportToken ?? raw.token ?? raw.uid ?? raw.id, `report-${index}`);

  return {
    id: token,
    reportToken: token,
    reportName: asString(raw.reportName ?? raw.name ?? raw.displayName, asString(raw.reportType, "Report")),
    reportType: asString(raw.reportType ?? raw.type),
    status: asString(raw.status ?? raw.reportStatus, "NEW"),
    createdDate: normalizeDate(raw.createdDate ?? raw.createdTime ?? raw.date),
    requestedBy: asString(raw.userName ?? raw.requestedBy ?? raw.createdBy, "-"),
    filePath: asString(raw.filePath ?? raw.s3path ?? raw.url ?? raw.downloadUrl),
  };
}

function toSavedReport(raw: Record<string, unknown>, index: number): SavedReportRow {
  return {
    id: String(raw.id ?? raw.uid ?? raw.reportToken ?? `saved-${index}`),
    reportToken: asString(raw.reportToken ?? raw.token),
    reportName: asString(raw.reportName ?? raw.name ?? raw.displayName, "Saved report"),
    reportType: asString(raw.reportType ?? raw.type),
    createdDate: normalizeDate(raw.createdDate ?? raw.createdTime ?? raw.date),
  };
}

function toGeneratedReportDetail(raw: Record<string, unknown>, token: string): GeneratedReportDetail {
  const content = asRecord(raw.reportContent);
  const columnsRecord = asRecord(content.columns);
  const rowsPayload = Array.isArray(content.data) ? content.data : [];
  const columns = Object.entries(columnsRecord).map(([key, value]) => ({
    key,
    label: asString(value, key),
  }));

  return {
    token,
    reportType: asString(raw.reportType ?? content.reportType),
    reportName: asString(content.reportName ?? raw.reportName ?? raw.name, "Report"),
    reportHeader: asRecord(content.reportHeader),
    dataHeader: asRecord(content.dataHeader),
    columns,
    rows: rowsPayload.map((row) => asRecord(row)),
  };
}

export async function getReportCatalog(
  api: ScopedApi,
  options: { product?: ProductKey; user?: unknown; account?: unknown } = {}
) {
  const settings = await getReportSettings(api, options);
  const reports = hasAnyLoadedSettings(settings)
    ? REPORT_CATALOG.filter((report) => matchesCondition(report, settings))
    : REPORT_CATALOG.filter((report) => !report.products || !options.product || report.products.includes(options.product));

  return reports.map(toCatalogItem);
}

export async function listGeneratedReports(api: ScopedApi, filter: ReportsPageFilter = {}) {
  const response = await api.get<Record<string, unknown>[]>(REPORT_STATUS_PATH, {
    params: buildPageParams(filter),
  });

  return response.data.map(toGeneratedReport);
}

export async function getGeneratedReportCount(api: ScopedApi, filter: ReportsPageFilter = {}) {
  const response = await api.get<number>(`${REPORT_STATUS_PATH}/count`, {
    params: buildPageParams(filter, false),
  });

  return response.data;
}

export async function getGeneratedReportDetail(api: ScopedApi, token: string) {
  const response = await api.get<Record<string, unknown>>(`provider/report/status/${token}`);
  return toGeneratedReportDetail(response.data, token);
}

export async function listSavedReports(api: ScopedApi, filter: ReportsPageFilter = {}) {
  const response = await api.get<Record<string, unknown>[]>("provider/report/criteria", {
    params: buildPageParams(filter),
  });

  return response.data.map(toSavedReport);
}

export async function getSavedReportCount(api: ScopedApi, filter: ReportsPageFilter = {}) {
  const response = await api.get<number>("provider/report/criteria/count", {
    params: buildPageParams(filter, false),
  });

  return response.data;
}

export async function deleteSavedReport(api: ScopedApi, report: SavedReportRow) {
  return api.delete("provider/report/ops", { data: report });
}

export async function generateReport(api: ScopedApi, payload: ReportGeneratePayload) {
  const path = payload.reportType === "IP_SERVICE_CONSUMPTION_REPORT" ? "provider/ip/report" : "provider/report";
  return api.put(path, payload);
}
