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
  | "invoices"
  | "invoice-types"
  | "items"
  | "catalogs"
  | "inventory"
  | "settings"
  | "reviews";

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
  canViewCatalogs: boolean;
  canViewStores: boolean;
  canViewItems: boolean;
  canViewInvoices: boolean;
  canViewDealers: boolean;
  canViewItemVariants: boolean;
  canViewLogistics: boolean;
  canViewDeliveryProfile: boolean;
  canViewActiveCart: boolean;
  canViewReviews: boolean;
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
  customerRef?: string;
  source: string;
  channel: string;
  orderNumber?: string;
  store?: string;
  paymentStatus?: string;
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
  storeName: string;
  status: string;
  active: boolean;
  raw?: unknown;
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

export type OrdersInvoiceTypeRow = {
  id: string;
  type: string;
  prefix: string;
  suffix: string;
  status: string;
  raw?: unknown;
};

export type OrdersInvoiceRow = {
  id: string;
  invoiceUid: string;
  invoiceNumber: string;
  orderId?: string;
  orderNumber?: string;
  customer: string;
  customerRef?: string;
  source: string;
  storeName: string;
  invoiceDate: string;
  status: string;
  totalAmount: number;
  amountPaid?: number;
  amountDue?: number;
  raw?: unknown;
};

export type OrdersItemRow = {
  id: string;
  name: string;
  property: string;
  source: string;
  category: string;
  group: string;
  manufacturer: string;
  type: string;
  trackInventory: string;
  tax: string;
  createdDate: string;
  status: string;
  imageUrl?: string;
  raw?: unknown;
};

export type OrdersItemDetailStats = {
  numberOfOrders: number;
  orderQuantity: number;
  numberOfPurchase: number;
  purchasedQuantity: number;
};

export type OrdersItemConsumptionHistoryRow = {
  id: string;
  date: string;
  batch: string;
  referenceNumber: string;
  store: string;
  transactionType: string;
  updateType: string;
  quantity: number;
  raw?: unknown;
};

export type OrdersItemOption = {
  id: string;
  name: string;
  batchApplicable: string;
  trackInventory: string;
  status: string;
  raw?: unknown;
};

export type OrdersItemDetail = OrdersItemRow & {
  description: string;
  unit: string;
  batchApplicable: string;
  gallery: string[];
  badges: string[];
  stats: OrdersItemDetailStats;
  consumptionHistory: OrdersItemConsumptionHistoryRow[];
  itemOptions: OrdersItemOption[];
  /** True when this item is a child/variant of a parent item (has a parentItemSpCode). */
  isChildItem: boolean;
};

export type OrdersItemSettingsOption = {
  id: string;
  label: string;
  raw?: unknown;
};

export type OrdersItemSettings = {
  categories: OrdersItemSettingsOption[];
  groups: OrdersItemSettingsOption[];
  types: OrdersItemSettingsOption[];
  units: OrdersItemSettingsOption[];
  hsn: OrdersItemSettingsOption[];
  compositions: OrdersItemSettingsOption[];
  taxes: OrdersItemSettingsOption[];
  manufacturers: OrdersItemSettingsOption[];
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
  defaultDashboardView: "orders" | "rxRequests" | "reviews";
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

export type InventoryDashboardAction = {
  label: string;
  href: string;
  icon: "box" | "warehouse" | "database" | "cart" | "refresh" | "layers" | "tag" | "globe" | "history" | "list" | "chart";
  enabled?: boolean;
  actionType?: "route" | "itemVariants" | "editActions";
};

export type InventoryDashboardMetric = {
  label: string;
  value: number;
  currency?: boolean;
  icon: "box" | "cart" | "chart" | "database" | "warehouse" | "alert";
  tone: "emerald" | "blue" | "amber" | "rose" | "slate";
};

export type InventoryDashboardDataset = {
  title: string;
  subtitle: string;
  actions: InventoryDashboardAction[];
  purchaseMetrics: InventoryDashboardMetric[];
  salesMetrics: InventoryDashboardMetric[];
  stockActions: Array<{ label: string; href: string; tone: "rose" | "amber"; icon: "alert" | "box" }>;
  customersTotal: number;
  vendorsTotal: number;
  topSellingStores: Array<{ label: string; value: number; color?: string }>;
  graph: {
    labels: string[];
    purchase: number[];
    sales: number[];
  };
};

export type InventoryAdjustmentStatus = "DRAFT" | "SUBMITTED" | "PROCESSED" | string;

export type InventoryAdjustmentRow = {
  uid: string;
  storeName: string;
  remark: string;
  status: InventoryAdjustmentStatus;
  createdDate: string;
  raw?: unknown;
};

export type InventoryAdjustmentOption = {
  id: string;
  label: string;
  raw?: unknown;
};

export type InventoryAdjustmentItemOption = InventoryAdjustmentOption & {
  spCode: string;
  batchApplicable: boolean;
  description?: string;
};

export type InventoryAdjustmentDetailItem = {
  id: string;
  name: string;
  inventoryCatalogEncId: string;
  batch: string;
  quantity: number;
  stock?: number;
  batchApplicable?: boolean;
};

export type InventoryAdjustmentDetail = {
  uid: string;
  storeEncId: string;
  catalogEncId: string;
  remarkEncId: string;
  notes: string;
  status: InventoryAdjustmentStatus;
  items: InventoryAdjustmentDetailItem[];
  raw?: unknown;
};

export type InventoryAdjustmentFormOptions = {
  stores: InventoryAdjustmentOption[];
  catalogs: InventoryAdjustmentOption[];
  remarks: InventoryAdjustmentOption[];
  items: InventoryAdjustmentItemOption[];
};

export type InventoryStockRow = {
  id: string;
  itemName: string;
  itemSpCode: string;
  inhand: number;
  onHoldQty: number;
  batch?: string;
  expiryDate?: string;
  raw?: unknown;
};

export type InventoryStocksFormOptions = {
  stores: InventoryAdjustmentOption[];
  catalogs: InventoryAdjustmentOption[];
};

export type InventoryCatalogRow = {
  id: string;
  encId: string;
  name: string;
  storeName: string;
  storeEncId: string;
  status: string;
  active: boolean;
  raw?: unknown;
};

export type InventoryCatalogItemRow = {
  id: string;
  encId: string;
  itemName: string;
  spCode: string;
  reorderQuantity?: number;
  hasAttributes: boolean;
  status: string;
  active: boolean;
  itemNature: string;
  raw?: unknown;
};

export type InventoryAuditLogRow = {
  uid: string;
  date: string;
  action: string;
  type: string;
  description: string;
  user: string;
  raw?: unknown;
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

export type ActiveCartRow = {
  id: string;
  itemName: string;
  itemImageUrl?: string;
  customerName: string;
  phoneNumber?: string;
  countryCode?: string;
  storeName?: string;
  catalogName?: string;
  lastModified?: string;
  quantity: number;
};

export type DeliveryProfileRow = {
  id: string;
  encId: string;
  name: string;
  status: string;
  deliveryPolicyEnum?: string;
};

export type DeliveryProfilePriceRange = {
  min: number;
  max: number;
  amount: string;
};

export type DeliveryProfileDetails = {
  id: string;
  encId: string;
  name: string;
  status: string;
  deliveryPolicyEnum: string;
  priceRange: DeliveryProfilePriceRange[];
};

export type StoreRow = {
  id: string;
  encId: string;
  name: string;
  status: string;
};

export type LogisticsRow = {
  id: string;
  uid: string;
  orderNum: string;
  orderId: string;
  orderEncId: string;
  providerConsumerName: string;
  storeName: string;
  locationName: string;
  createdDate: string;
  orderStatus: string;
  shipmentStatus: string;
  shipmentId: string;
  awbNumber?: string;
  courierName?: string;
  itemList?: Array<{ name: string; sku?: string }>;
  packageDetails?: { length: string; breadth: string; height: string; weight: string };
  paymentMethod?: string;
  pickupLocation?: string;
  pickupPincode?: string;
  confirmPickup?: boolean;
  totalAmount?: string;
};

export type CourierRow = {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  estimated_delivery_days: string;
  rating: string;
};

export type ShipmentDetails = {
  tracking_data?: {
    track_url?: string;
    shipment_track?: Array<{
      id: number;
      pickup_date: string;
      delivered_date: string;
      current_status: string;
      activities: Array<{
        date: string;
        status: string;
        activity: string;
        location: string;
      }>;
    }>;
  };
};

export type DealerRow = {
  id: string;
  encId: string;
  referenceNo: string;
  name: string;
  phone: string;
  status: string;
  createdOn: string;
};

export type OrdersReviewRow = {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName: string;
  rating: number;
  comment: string;
  status: "PENDING" | "PUBLISHED" | "REJECTED" | string;
  statusLabel: string;
  createdDate: string;
  raw?: unknown;
};
