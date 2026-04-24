export type OrdersSummary = {
  label: string;
  value: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
};

export type OrdersViewKey =
  | "overview"
  | "orders-grid"
  | "order-details"
  | "rx-requests-grid"
  | "catalogs"
  | "inventory"
  | "settings";

export type OrdersAction = {
  label: string;
  route: string;
  note: string;
  accent: "indigo" | "emerald" | "amber" | "rose" | "slate";
  type?: "route" | "externalRoute" | "functionCall";
  imageKey?: string;
  enabled?: boolean;
};

export type OrdersCapabilities = {
  canCreateOrder: boolean;
  canViewOrders: boolean;
  canViewRequests: boolean;
  canViewCatalogs: boolean;
  canViewStores: boolean;
  canViewItems: boolean;
  canViewInvoices: boolean;
  canViewDealers: boolean;
  canViewItemVariants: boolean;
  canViewLogistics: boolean;
  canViewDeliveryProfile: boolean;
  canViewActiveCart: boolean;
};

export type OrdersOrderStatus =
  | "Draft"
  | "Awaiting Fulfilment"
  | "Packed"
  | "Dispatched"
  | "Delivered"
  | string;

export type OrdersRequestStatus =
  | "Pending Verification"
  | "Awaiting Stock"
  | "Ready To Convert"
  | string;

export type OrdersCatalogStatus = "Active" | "Limited" | "Draft";
export type OrdersInventoryStatus = "Healthy" | "Low Stock" | "Critical";

export type OrdersOrderRow = {
  id: string;
  customer: string;
  source: string;
  channel: string;
  itemCount: number;
  totalAmount: number;
  status: OrdersOrderStatus;
  placedOn: string;
};

export type OrdersOrderDetailLineItem = {
  id: string;
  name: string;
  batch: string;
  imageUrl?: string;
  rate: number;
  quantity: number;
  total: number;
};

export type OrdersOrderDetailAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  email: string;
  phone: string;
};

export type OrdersOrderDetail = OrdersOrderRow & {
  orderNumber: string;
  invoiceUid?: string;
  raw?: unknown;
  paymentStatus: string;
  store: string;
  labels: string[];
  assignees: string[];
  items: OrdersOrderDetailLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  couponAmount: number;
  discountLines?: Array<{ name: string; amount: number }>;
  couponLines?: Array<{ code: string; amount: number }>;
  netTotal: number;
  amountPaid: number;
  amountDue: number;
  customerId: string;
  shippingAddress: OrdersOrderDetailAddress | null;
  billingAddress: OrdersOrderDetailAddress | null;
  gstNumber: string;
  businessName: string;
  notesToCustomer?: string;
  notesFromStaff?: string;
};

export type OrdersBillAdjustmentKind = "discount" | "coupon";

export type OrdersBillAdjustmentOption = {
  id: string;
  label: string;
  code?: string;
  amount?: number;
  raw?: unknown;
};

export type OrdersRequestRow = {
  id: string;
  patient: string;
  prescriptionId: string;
  source: string;
  itemsRequested: number;
  doctor: string;
  status: OrdersRequestStatus;
  requestedOn: string;
};

export type OrdersCatalogRow = {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  status: OrdersCatalogStatus;
  updatedOn: string;
};

export type OrdersInventoryRow = {
  id: string;
  item: string;
  batch: string;
  store: string;
  availableQty: number;
  reorderLevel: number;
  expiry: string;
  status: OrdersInventoryStatus;
};

export type OrdersDataset = {
  title: string;
  subtitle: string;
  capabilities: OrdersCapabilities;
  summaries: OrdersSummary[];
  actions: OrdersAction[];
  preferredActionKeys?: string[];
  orders: OrdersOrderRow[];
  requests: OrdersRequestRow[];
  catalogs: OrdersCatalogRow[];
  inventory: OrdersInventoryRow[];
  highlights: string[];
  defaultDashboardView: "orders" | "rxRequests";
  canShowRequests: boolean;
  adminAnalytics: {
    todaySalesAmount: number;
    onlineOrdersEnabled: boolean;
    itemSearches: number;
    itemDetailsPageViews: number;
    itemsAddedToCart: number;
    cartCheckoutsInitiated: number;
    checkoutAbandonmentRate: number;
    providerCouponApplied: number;
    paymentsInitiated: number;
    paymentsCompleted: number;
    paymentsFailed: number;
    weeklySalesPoints?: Array<{ label: string; value: number }>;
    weeklyItemPoints?: Array<{ label: string; value: number }>;
  };
};

export type OrdersInvoiceDetail = {
  invoiceUid: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  customer: string;
  customerId?: string;
  orderId?: string;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  raw?: unknown;
};

export type OrdersPaymentDetail = {
  invoiceUid: string;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
  amount?: number;
  paidOn?: string;
};

export type OrdersCreditSystemDetail = {
  invoiceUid: string;
  creditSystemType: string;
  status?: string;
  amount?: number;
  balance?: number;
};

export type OrdersCreditSystemSettings = {
  enabled?: boolean;
  raw?: unknown;
};

export type OrdersCustomerSummary = {
  id: string;
  memberJaldeeId?: string;
  name: string;
  phone?: string;
  email?: string;
};

export type OrdersCreditSystemProviderConsumer = {
  customerId: string;
  creditLimit?: number;
  availableCredit?: number;
  outstanding?: number;
  raw?: unknown;
};
