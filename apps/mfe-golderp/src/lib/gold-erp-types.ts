export type EntityStatus = "ACTIVE" | "INACTIVE";
export type ItemType = "RING" | "NECKLACE" | "BANGLE" | "EARRING";
export type ChargeType = "PER_GRAM" | "FLAT" | "PERCENTAGE";
export type StoneType = "DIAMOND" | "RUBY" | "EMERALD" | "SAPPHIRE" | "PEARL" | "TOPAZ" | "AMETHYST" | "OTHER";
export type StoneShape = "ROUND" | "PRINCESS" | "OVAL" | "MARQUISE" | "PEAR" | "CUSHION" | "HEART" | "EMERALD_CUT" | "OTHER";
export type StoneClarity = "FL" | "IF" | "VVS1" | "VVS2" | "VS1" | "VS2" | "SI1" | "SI2" | "I1" | "NOT_APPLICABLE";
export type StoneCut = "EXCELLENT" | "VERY_GOOD" | "GOOD" | "FAIR" | "NOT_APPLICABLE";
export type PurchaseOrderStatus = "DRAFT" | "CONFIRMED" | "CLOSED";
export type GrnStatus = "DRAFT" | "CONFIRMED";
export type TagStatus = "DRAFT" | "IN_STOCK" | "RESERVED" | "SOLD" | "RETURNED" | "TRANSFERRED";
export type OrderStatus = "DRAFT" | "CONFIRMED" | "INVOICED" | "CANCELLED";
export type OrderType = "WALK_IN" | "ADVANCE" | "ONLINE";
export type DiscountType = ChargeType;
export type TransferStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface Metal {
  metalUid: string;
  metalCode: string;
  name: string;
  status: EntityStatus;
}

export interface MetalPurity {
  purityUid: string;
  metalUid: string;
  metalName?: string;
  purityCode: string;
  label: string;
  purityRatio: number;
  status: EntityStatus;
}

export interface Stone {
  stoneUid: string;
  stoneCode: string;
  name: string;
  stoneType: StoneType;
  shape: StoneShape;
  clarity: StoneClarity;
  cut: StoneCut;
  pricePerPiece: number;
  status: EntityStatus;
}

export interface TaxSetting {
  id: number | string;
  taxCode?: string;
  taxName: string;
  taxPercentage?: number;
  status?: string;
}

export interface MetalRate {
  rateUid: string;
  metalUid: string;
  metalName?: string;
  purityUid: string;
  purityName?: string;
  purityLabel?: string;
  ratePerGram: number;
  effectiveDate?: string;
  effectiveFrom?: string;
  status?: EntityStatus;
}

export interface StoneTemplate {
  templateUid: string;
  itemUid: string;
  stoneUid: string;
  stoneName: string;
  expectedCount: number;
}

export interface JewelleryItem {
  itemUid: string;
  itemId?: number;
  itemCode: string;
  name: string;
  itemType?: ItemType;
  metalUid: string;
  metalName?: string;
  purityUid: string;
  purityLabel?: string;
  typicalGrossWt?: number;
  typicalNetWt?: number;
  hsnCode?: string;
  taxRate?: number;
  description?: string;
  imageUrl?: string;
  availableOnline?: boolean;
  chargeType?: ChargeType;
  chargeValue?: number;
  status: EntityStatus;
  stoneTemplates?: StoneTemplate[];
}

export interface PurchaseOrderLine {
  lineUid: string;
  poUid: string;
  itemUid: string;
  itemCode?: string;
  itemName?: string;
  quantityOrdered: number;
  quantityReceived?: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

export interface DraftStoneDetail {
  dsdUid: string;
  draftTagUid: string;
  stoneUid: string;
  stoneName?: string;
  count: number;
}

export interface DraftTag {
  draftTagUid: string;
  grnUid: string;
  itemUid: string;
  itemCode?: string;
  itemName?: string;
  tagNumber?: string;
  grossWt?: number;
  netWt?: number;
  stoneWt?: number;
  wastageWt?: number;
  notes?: string;
  stoneDetails?: DraftStoneDetail[];
}

export interface GrnLine {
  lineUid: string;
  grnUid: string;
  itemUid: string;
  itemCode?: string;
  itemName?: string;
  quantity: number;
  grossWeightGrams: number;
  netWeightGrams: number;
  ratePerGram: number;
  stoneCostPerPiece?: number;
  makingChargePerPiece?: number;
}

export interface GoodsReceiptNote {
  grnUid: string;
  grnNumber: string;
  poUid?: string;
  poNumber?: string;
  supplierName?: string;
  receivedDate: string;
  receivedBy?: string;
  totalPieces?: number;
  notes?: string;
  status: GrnStatus;
  draftTags?: DraftTag[];
}

export interface PurchaseOrder {
  poUid: string;
  poNumber: string;
  supplierName: string;
  supplierPhone?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  totalAmount?: number;
  status: PurchaseOrderStatus;
  notes?: string;
  lines?: PurchaseOrderLine[];
}

export interface TagStoneLine {
  stoneUid: string;
  stoneName: string;
  pricePerPieceAtGrn?: number;
  stoneCostLine?: number;
}

export interface JewelleryTag {
  tagUid: string;
  tagNumber?: string;
  barcode?: string;
  itemUid: string;
  itemCode?: string;
  itemName: string;
  metalUid?: string;
  purityUid?: string;
  grnUid?: string;
  grossWt?: number;
  netWt?: number;
  stoneWt?: number;
  wastageWt?: number;
  grossWeight?: number;
  netWeight?: number;
  metalRateAtGrn?: number;
  metalCost?: number;
  stoneCost?: number;
  makingCharge?: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  sellingPrice?: number;
  status: TagStatus;
  stoneDetails?: TagStoneLine[];
}

export interface SalesOrderLine {
  lineUid: string;
  orderUid: string;
  tagUid: string;
  tagNumber?: string;
  itemCode?: string;
  itemName?: string;
  grossWt?: number;
  netWt?: number;
  sellingPrice?: number;
  sellingRatePerGram?: number;
  discountAmount?: number;
  discountOnLine?: number;
  lineTotal?: number;
  finalPrice?: number;
}

export interface SalesAdvance {
  advanceUid: string;
  orderUid: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  paymentDate?: string;
  notes?: string;
}

export interface OldGoldExchange {
  exchangeUid: string;
  orderUid: string;
  metalType: string;
  purityLabel: string;
  grossWt: number;
  netWt: number;
  rateApplied: number;
  exchangeValue: number;
  notes?: string;
}

export interface SalesDiscount {
  discountUid: string;
  orderUid: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount?: number;
  reason?: string;
}

export interface SalesOrder {
  orderUid: string;
  orderNumber: string;
  orderType?: OrderType;
  customerName: string;
  customerPhone?: string;
  orderDate?: string;
  notes?: string;
  totalAmount: number;
  discountAmount?: number;
  oldGoldDeduction?: number;
  advancePaid?: number;
  balanceDue?: number;
  status: OrderStatus;
  lines?: SalesOrderLine[];
  advances?: SalesAdvance[];
  oldGoldEntries?: OldGoldExchange[];
  discounts?: SalesDiscount[];
}

export interface TransferLine {
  lineUid?: string;
  stlUid?: string;
  transferUid?: string;
  tagUid: string;
  tagNumber?: string;
  itemCode?: string;
  itemName?: string;
  receivedTagId?: number | null;
  receivedTagNumber?: string | null;
  notes?: string;
}

export interface StockTransfer {
  transferId?: number;
  transferUid: string;
  transferNumber: string;
  toAccount?: number;
  toAccountName?: string | null;
  transferDate?: string;
  totalTags?: number;
  dispatchReference?: string;
  notes?: string;
  status: TransferStatus;
  receivedDate?: string | null;
  lines?: TransferLine[];
}
