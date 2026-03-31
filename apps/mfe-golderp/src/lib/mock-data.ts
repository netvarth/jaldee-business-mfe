// Gold ERP Mock Data Service
// Replace with real API calls when backend is ready

// Mock data - replace with real API calls when backend is ready

// ---- Types ----
export interface Metal {
  uid: string;
  metalName: string;
  metalSymbol: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface MetalPurity {
  uid: string;
  metalUid: string;
  metalName: string;
  purityName: string;
  purityRatio: number;
  displayLabel: string;
  isBasePurity: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export interface MetalRate {
  uid: string;
  metalUid: string;
  metalName: string;
  purityUid: string;
  purityName: string;
  ratePerGram: number;
  effectiveFrom: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Stone {
  uid: string;
  stoneType: string;
  shape: string;
  color: string;
  clarity: string;
  carat: number | null;
  sizeMm: number | null;
  cut: string;
  pricePerPiece: number;
  stoneCode: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface MakingChargeConfig {
  uid: string;
  itemType: string;
  metalUid: string;
  metalName: string;
  purityUid: string;
  purityName: string;
  chargeType: "PER_GRAM" | "FLAT" | "PERCENTAGE";
  chargeValue: number;
  effectiveFrom: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface JewelleryItem {
  uid: string;
  itemCode: string;
  name: string;
  itemType: "RING" | "NECKLACE" | "BANGLE" | "EARRING";
  metalName: string;
  purityName: string;
  typicalGrossWt: number;
  typicalNetWt: number;
  hsnCode: string;
  taxRate: number;
  isAvailableOnline: boolean;
  imageUrl: string;
  status: "ACTIVE" | "INACTIVE";
}

export type TagStatus = "IN_STOCK" | "RESERVED" | "SOLD" | "RETURNED" | "TRANSFERRED";

export interface JewelleryTag {
  uid: string;
  barcode: string;
  itemUid: string;
  itemName: string;
  itemType: string;
  metalName: string;
  purityName: string;
  storeName: string;
  grossWeight: number;
  netWeight: number;
  metalRateAtGrn: number;
  metalCost: number;
  stoneCost: number;
  makingCharge: number;
  subtotal: number;
  taxAmount: number;
  sellingPrice: number;
  purchaseCost: number;
  tagStatus: TagStatus;
  createdDate: string;
  stones: TagStone[];
}

export interface TagStone {
  stoneDescription: string;
  pieceCount: number;
  pricePerPiece: number;
  totalValue: number;
}

export type OrderType = "WALK_IN" | "ADVANCE" | "ONLINE";
export type OrderStatus = "DRAFT" | "CONFIRMED" | "PENDING_TAG_ASSIGNMENT" | "PARTIALLY_INVOICED" | "FULLY_INVOICED" | "CANCELLED";

export interface SaleOrder {
  uid: string;
  orderNumber: string;
  orderType: OrderType;
  orderStatus: OrderStatus;
  customerName: string;
  customerPhone: string;
  storeName: string;
  tagCount: number;
  goldCost: number;
  stoneCost: number;
  makingCharge: number;
  subtotal: number;
  discount: number;
  oldGoldCredit: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  balanceDue: number;
  createdDate: string;
}

export interface PurchaseOrder {
  uid: string;
  poNumber: string;
  dealerName: string;
  storeName: string;
  itemCount: number;
  totalCost: number;
  status: "DRAFT" | "CONFIRMED" | "GRN_CREATED" | "COMPLETED";
  createdDate: string;
}

export interface OldGoldExchange {
  uid: string;
  customerName: string;
  metalName: string;
  purityName: string;
  weight: number;
  ratePerGram: number;
  creditAmount: number;
  linkedOrderNumber: string | null;
  createdDate: string;
}

export interface StockTransfer {
  uid: string;
  transferNumber: string;
  fromStore: string;
  toStore: string;
  tagCount: number;
  status: "DISPATCHED" | "RECEIVED" | "CANCELLED";
  createdDate: string;
}

// ---- Mock Data ----
export const metals: Metal[] = [
  { uid: "m1", metalName: "Gold", metalSymbol: "AU", status: "ACTIVE" },
  { uid: "m2", metalName: "Silver", metalSymbol: "AG", status: "ACTIVE" },
  { uid: "m3", metalName: "Platinum", metalSymbol: "PT", status: "INACTIVE" },
];

export const purities: MetalPurity[] = [
  { uid: "p1", metalUid: "m1", metalName: "Gold", purityName: "24K", purityRatio: 1.0, displayLabel: "24 Karat Gold", isBasePurity: true, status: "ACTIVE" },
  { uid: "p2", metalUid: "m1", metalName: "Gold", purityName: "22K", purityRatio: 0.9167, displayLabel: "22 Karat Gold", isBasePurity: false, status: "ACTIVE" },
  { uid: "p3", metalUid: "m1", metalName: "Gold", purityName: "18K", purityRatio: 0.75, displayLabel: "18 Karat Gold", isBasePurity: false, status: "ACTIVE" },
  { uid: "p4", metalUid: "m1", metalName: "Gold", purityName: "916", purityRatio: 0.916, displayLabel: "916 Hallmark Gold", isBasePurity: false, status: "ACTIVE" },
  { uid: "p5", metalUid: "m2", metalName: "Silver", purityName: "999", purityRatio: 0.999, displayLabel: "999 Fine Silver", isBasePurity: true, status: "ACTIVE" },
  { uid: "p6", metalUid: "m2", metalName: "Silver", purityName: "925", purityRatio: 0.925, displayLabel: "925 Sterling Silver", isBasePurity: false, status: "ACTIVE" },
];

export const currentRates: MetalRate[] = [
  { uid: "r1", metalUid: "m1", metalName: "Gold", purityUid: "p1", purityName: "24K", ratePerGram: 7200, effectiveFrom: "2026-03-19", status: "ACTIVE" },
  { uid: "r2", metalUid: "m1", metalName: "Gold", purityUid: "p2", purityName: "22K", ratePerGram: 6600, effectiveFrom: "2026-03-19", status: "ACTIVE" },
  { uid: "r3", metalUid: "m1", metalName: "Gold", purityUid: "p3", purityName: "18K", ratePerGram: 5400, effectiveFrom: "2026-03-19", status: "ACTIVE" },
  { uid: "r4", metalUid: "m1", metalName: "Gold", purityUid: "p4", purityName: "916", ratePerGram: 6595, effectiveFrom: "2026-03-19", status: "ACTIVE" },
  { uid: "r5", metalUid: "m2", metalName: "Silver", purityUid: "p5", purityName: "999", ratePerGram: 95, effectiveFrom: "2026-03-19", status: "ACTIVE" },
  { uid: "r6", metalUid: "m2", metalName: "Silver", purityUid: "p6", purityName: "925", ratePerGram: 87.88, effectiveFrom: "2026-03-19", status: "ACTIVE" },
];

export const stones: Stone[] = [
  { uid: "s1", stoneType: "DIAMOND", shape: "ROUND", color: "D", clarity: "VVS1", carat: 0.5, sizeMm: null, cut: "EXCELLENT", pricePerPiece: 15000, stoneCode: "DIA-RND-05-VVS1", description: "Diamond Round 0.5ct VVS1", status: "ACTIVE" },
  { uid: "s2", stoneType: "RUBY", shape: "ROUND", color: "Red", clarity: "NOT_APPLICABLE", carat: null, sizeMm: 3.0, cut: "GOOD", pricePerPiece: 2500, stoneCode: "RBY-RND-3MM", description: "Ruby Round 3mm", status: "ACTIVE" },
  { uid: "s3", stoneType: "EMERALD", shape: "OVAL", color: "Green", clarity: "NOT_APPLICABLE", carat: null, sizeMm: 4.0, cut: "GOOD", pricePerPiece: 3200, stoneCode: "EMR-OVL-4MM", description: "Emerald Oval 4mm", status: "ACTIVE" },
  { uid: "s4", stoneType: "SAPPHIRE", shape: "CUSHION", color: "Blue", clarity: "NOT_APPLICABLE", carat: null, sizeMm: 5.0, cut: "VERY_GOOD", pricePerPiece: 4800, stoneCode: "SAP-CSH-5MM", description: "Sapphire Cushion 5mm", status: "ACTIVE" },
];

export const makingCharges: MakingChargeConfig[] = [
  { uid: "mc1", itemType: "RING", metalUid: "m1", metalName: "Gold", purityUid: "p2", purityName: "22K", chargeType: "PER_GRAM", chargeValue: 1000, effectiveFrom: "2026-03-01", status: "ACTIVE" },
  { uid: "mc2", itemType: "NECKLACE", metalUid: "m1", metalName: "Gold", purityUid: "p2", purityName: "22K", chargeType: "PER_GRAM", chargeValue: 750, effectiveFrom: "2026-03-01", status: "ACTIVE" },
  { uid: "mc3", itemType: "BANGLE", metalUid: "m1", metalName: "Gold", purityUid: "p2", purityName: "22K", chargeType: "PER_GRAM", chargeValue: 600, effectiveFrom: "2026-03-01", status: "ACTIVE" },
  { uid: "mc4", itemType: "EARRING", metalUid: "m1", metalName: "Gold", purityUid: "p2", purityName: "22K", chargeType: "FLAT", chargeValue: 500, effectiveFrom: "2026-03-01", status: "ACTIVE" },
  { uid: "mc5", itemType: "RING", metalUid: "m1", metalName: "Gold", purityUid: "p3", purityName: "18K", chargeType: "PER_GRAM", chargeValue: 800, effectiveFrom: "2026-03-01", status: "ACTIVE" },
];

export const jewelleryItems: JewelleryItem[] = [
  { uid: "ji1", itemCode: "RNG-001", name: "Solitaire Ring", itemType: "RING", metalName: "Gold", purityName: "22K", typicalGrossWt: 3.5, typicalNetWt: 3.2, hsnCode: "7113", taxRate: 3, isAvailableOnline: true, imageUrl: "", status: "ACTIVE" },
  { uid: "ji2", itemCode: "NKL-001", name: "Peacock Necklace", itemType: "NECKLACE", metalName: "Gold", purityName: "22K", typicalGrossWt: 22, typicalNetWt: 21, hsnCode: "7113", taxRate: 3, isAvailableOnline: true, imageUrl: "", status: "ACTIVE" },
  { uid: "ji3", itemCode: "BNG-001", name: "Classic Bangle", itemType: "BANGLE", metalName: "Gold", purityName: "22K", typicalGrossWt: 15, typicalNetWt: 14.5, hsnCode: "7113", taxRate: 3, isAvailableOnline: false, imageUrl: "", status: "ACTIVE" },
  { uid: "ji4", itemCode: "EAR-001", name: "Jhumka Earring", itemType: "EARRING", metalName: "Gold", purityName: "22K", typicalGrossWt: 8, typicalNetWt: 7.5, hsnCode: "7113", taxRate: 3, isAvailableOnline: true, imageUrl: "", status: "ACTIVE" },
  { uid: "ji5", itemCode: "RNG-002", name: "Diamond Band Ring", itemType: "RING", metalName: "Gold", purityName: "18K", typicalGrossWt: 4.2, typicalNetWt: 3.8, hsnCode: "7113", taxRate: 3, isAvailableOnline: true, imageUrl: "", status: "ACTIVE" },
  { uid: "ji6", itemCode: "NKL-002", name: "Temple Necklace", itemType: "NECKLACE", metalName: "Gold", purityName: "22K", typicalGrossWt: 35, typicalNetWt: 33, hsnCode: "7113", taxRate: 3, isAvailableOnline: false, imageUrl: "", status: "ACTIVE" },
];

export const tags: JewelleryTag[] = [
  { uid: "t1", barcode: "TAG-20260318-0001", itemUid: "ji1", itemName: "Solitaire Ring", itemType: "RING", metalName: "Gold", purityName: "22K", storeName: "Kochi Store", grossWeight: 3.5, netWeight: 3.2, metalRateAtGrn: 6600, metalCost: 21120, stoneCost: 15000, makingCharge: 3500, subtotal: 39620, taxAmount: 1189, sellingPrice: 40809, purchaseCost: 32000, tagStatus: "IN_STOCK", createdDate: "2026-03-18", stones: [{ stoneDescription: "Diamond Round 0.5ct VVS1", pieceCount: 1, pricePerPiece: 15000, totalValue: 15000 }] },
  { uid: "t2", barcode: "TAG-20260318-0002", itemUid: "ji2", itemName: "Peacock Necklace", itemType: "NECKLACE", metalName: "Gold", purityName: "22K", storeName: "Kochi Store", grossWeight: 21.5, netWeight: 21, metalRateAtGrn: 6600, metalCost: 138600, stoneCost: 0, makingCharge: 16125, subtotal: 154725, taxAmount: 4642, sellingPrice: 159367, purchaseCost: 125000, tagStatus: "IN_STOCK", createdDate: "2026-03-18", stones: [] },
  { uid: "t3", barcode: "TAG-20260317-0001", itemUid: "ji3", itemName: "Classic Bangle", itemType: "BANGLE", metalName: "Gold", purityName: "22K", storeName: "Kochi Store", grossWeight: 15.2, netWeight: 14.8, metalRateAtGrn: 6550, metalCost: 96940, stoneCost: 0, makingCharge: 9120, subtotal: 106060, taxAmount: 3182, sellingPrice: 109242, purchaseCost: 88000, tagStatus: "IN_STOCK", createdDate: "2026-03-17", stones: [] },
  { uid: "t4", barcode: "TAG-20260317-0002", itemUid: "ji4", itemName: "Jhumka Earring", itemType: "EARRING", metalName: "Gold", purityName: "22K", storeName: "Kochi Store", grossWeight: 8.1, netWeight: 7.6, metalRateAtGrn: 6550, metalCost: 49780, stoneCost: 5000, makingCharge: 500, subtotal: 55280, taxAmount: 1658, sellingPrice: 56938, purchaseCost: 42000, tagStatus: "RESERVED", createdDate: "2026-03-17", stones: [{ stoneDescription: "Ruby Round 3mm", pieceCount: 2, pricePerPiece: 2500, totalValue: 5000 }] },
  { uid: "t5", barcode: "TAG-20260316-0001", itemUid: "ji5", itemName: "Diamond Band Ring", itemType: "RING", metalName: "Gold", purityName: "18K", storeName: "Kochi Store", grossWeight: 4.3, netWeight: 3.9, metalRateAtGrn: 5400, metalCost: 21060, stoneCost: 30000, makingCharge: 3440, subtotal: 54500, taxAmount: 1635, sellingPrice: 56135, purchaseCost: 45000, tagStatus: "SOLD", createdDate: "2026-03-16", stones: [{ stoneDescription: "Diamond Round 0.5ct VVS1", pieceCount: 2, pricePerPiece: 15000, totalValue: 30000 }] },
  { uid: "t6", barcode: "TAG-20260316-0002", itemUid: "ji6", itemName: "Temple Necklace", itemType: "NECKLACE", metalName: "Gold", purityName: "22K", storeName: "Kochi Store", grossWeight: 34.8, netWeight: 33.2, metalRateAtGrn: 6550, metalCost: 217460, stoneCost: 0, makingCharge: 26100, subtotal: 243560, taxAmount: 7307, sellingPrice: 250867, purchaseCost: 200000, tagStatus: "IN_STOCK", createdDate: "2026-03-16", stones: [] },
  { uid: "t7", barcode: "TAG-20260315-0001", itemUid: "ji1", itemName: "Solitaire Ring", itemType: "RING", metalName: "Gold", purityName: "22K", storeName: "TCR Store", grossWeight: 3.3, netWeight: 3.0, metalRateAtGrn: 6500, metalCost: 19500, stoneCost: 15000, makingCharge: 3300, subtotal: 37800, taxAmount: 1134, sellingPrice: 38934, purchaseCost: 30000, tagStatus: "IN_STOCK", createdDate: "2026-03-15", stones: [{ stoneDescription: "Diamond Round 0.5ct VVS1", pieceCount: 1, pricePerPiece: 15000, totalValue: 15000 }] },
  { uid: "t8", barcode: "TAG-20260315-0002", itemUid: "ji2", itemName: "Peacock Necklace", itemType: "NECKLACE", metalName: "Gold", purityName: "22K", storeName: "TCR Store", grossWeight: 22.1, netWeight: 21.5, metalRateAtGrn: 6500, metalCost: 139750, stoneCost: 0, makingCharge: 16575, subtotal: 156325, taxAmount: 4690, sellingPrice: 161015, purchaseCost: 128000, tagStatus: "TRANSFERRED", createdDate: "2026-03-15", stones: [] },
];

export const saleOrders: SaleOrder[] = [
  { uid: "so1", orderNumber: "SO-20260319-001", orderType: "WALK_IN", orderStatus: "FULLY_INVOICED", customerName: "Arun Kumar", customerPhone: "9876543210", storeName: "Kochi Store", tagCount: 2, goldCost: 159720, stoneCost: 15000, makingCharge: 19625, subtotal: 194345, discount: 5000, oldGoldCredit: 0, taxAmount: 5680, grandTotal: 195025, advancePaid: 0, balanceDue: 0, createdDate: "2026-03-19" },
  { uid: "so2", orderNumber: "SO-20260318-001", orderType: "ADVANCE", orderStatus: "CONFIRMED", customerName: "Priya Nair", customerPhone: "9876543211", storeName: "Kochi Store", tagCount: 1, goldCost: 49780, stoneCost: 5000, makingCharge: 500, subtotal: 55280, discount: 0, oldGoldCredit: 20000, taxAmount: 1658, grandTotal: 36938, advancePaid: 15000, balanceDue: 21938, createdDate: "2026-03-18" },
  { uid: "so3", orderNumber: "SO-20260317-001", orderType: "ONLINE", orderStatus: "PENDING_TAG_ASSIGNMENT", customerName: "Ravi Menon", customerPhone: "9876543212", storeName: "Kochi Store", tagCount: 0, goldCost: 0, stoneCost: 0, makingCharge: 0, subtotal: 0, discount: 0, oldGoldCredit: 0, taxAmount: 0, grandTotal: 0, advancePaid: 10000, balanceDue: 0, createdDate: "2026-03-17" },
  { uid: "so4", orderNumber: "SO-20260316-001", orderType: "WALK_IN", orderStatus: "FULLY_INVOICED", customerName: "Lakshmi Devi", customerPhone: "9876543213", storeName: "TCR Store", tagCount: 1, goldCost: 21060, stoneCost: 30000, makingCharge: 3440, subtotal: 54500, discount: 2000, oldGoldCredit: 0, taxAmount: 1575, grandTotal: 54075, advancePaid: 0, balanceDue: 0, createdDate: "2026-03-16" },
];

export const purchaseOrders: PurchaseOrder[] = [
  { uid: "po1", poNumber: "PO-20260318-001", dealerName: "Malabar Wholesale", storeName: "Kochi Store", itemCount: 4, totalCost: 295000, status: "COMPLETED", createdDate: "2026-03-18" },
  { uid: "po2", poNumber: "PO-20260317-001", dealerName: "Joy Alukkas Supply", storeName: "TCR Store", itemCount: 2, totalCost: 158000, status: "GRN_CREATED", createdDate: "2026-03-17" },
  { uid: "po3", poNumber: "PO-20260319-001", dealerName: "Chennai Gold Mart", storeName: "Kochi Store", itemCount: 6, totalCost: 450000, status: "DRAFT", createdDate: "2026-03-19" },
];

export const oldGoldExchanges: OldGoldExchange[] = [
  { uid: "og1", customerName: "Arun Kumar", metalName: "Gold", purityName: "22K", weight: 10, ratePerGram: 6600, creditAmount: 66000, linkedOrderNumber: null, createdDate: "2026-03-19" },
  { uid: "og2", customerName: "Priya Nair", metalName: "Gold", purityName: "22K", weight: 3.2, ratePerGram: 6550, creditAmount: 20960, linkedOrderNumber: "SO-20260318-001", createdDate: "2026-03-18" },
];

export const stockTransfers: StockTransfer[] = [
  { uid: "st1", transferNumber: "TRF-20260318-001", fromStore: "TCR Store", toStore: "Kochi Store", tagCount: 1, status: "DISPATCHED", createdDate: "2026-03-18" },
];

// Dashboard summary helpers
export const getDashboardStats = () => ({
  totalTagsInStock: tags.filter(t => t.tagStatus === "IN_STOCK").length,
  totalTagsReserved: tags.filter(t => t.tagStatus === "RESERVED").length,
  totalTagsSold: tags.filter(t => t.tagStatus === "SOLD").length,
  totalGoldWeightInStock: tags.filter(t => t.tagStatus === "IN_STOCK").reduce((sum, t) => sum + t.netWeight, 0),
  todaySalesCount: saleOrders.filter(s => s.createdDate === "2026-03-19").length,
  todaySalesValue: saleOrders.filter(s => s.createdDate === "2026-03-19").reduce((sum, s) => sum + s.grandTotal, 0),
  pendingOnlineOrders: saleOrders.filter(s => s.orderStatus === "PENDING_TAG_ASSIGNMENT").length,
  pendingTransfers: stockTransfers.filter(s => s.status === "DISPATCHED").length,
  gold24kRate: currentRates.find(r => r.purityName === "24K")?.ratePerGram ?? 0,
  gold22kRate: currentRates.find(r => r.purityName === "22K")?.ratePerGram ?? 0,
  silver999Rate: currentRates.find(r => r.purityName === "999")?.ratePerGram ?? 0,
});

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export const formatWeight = (grams: number) => `${grams.toFixed(2)}g`;
