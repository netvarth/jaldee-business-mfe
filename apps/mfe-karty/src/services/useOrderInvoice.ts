/**
 * Builds a GST Tax Invoice model from a real Karty order — client-side, Karty only.
 *
 * The CGST/SGST-vs-IGST split is derived from the seller's state (first 2 digits of the
 * tenant GSTIN in commerce-settings) vs the place of supply (the buyer's state). Per-line
 * rate comes from the item's `taxGroup` attribute ("GST 12%" → 12). Nothing here is a
 * persisted snapshot yet — it's a live render until the GST snapshot backend lands.
 */
import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import { qrCells, type InvoiceModel, type InvoiceLine, type Slab } from "../pages/TaxInvoicePage";

// ─── Indian GST state codes ─────────────────────────────────────────────────

const STATE_BY_CODE: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman & Nicobar", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};
const CODE_BY_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);

function stateCodeFromName(name?: string): string {
  if (!name) return "";
  const n = name.trim().toLowerCase();
  return CODE_BY_STATE[n] || "";
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** Indian-grouped 2-decimal number, e.g. -799 → "− 799.00", 1234567.5 → "12,34,567.50". */
function inrNum(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  const [i, d] = abs.toFixed(2).split(".");
  const last3 = i.slice(-3);
  const rest = i.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return (neg ? "− " : "") + grouped + "." + d;
}
const inr = (n: number) => (n < 0 ? "− ₹" : "₹") + inrNum(Math.abs(n));

/** "GST 12%" → 12, "GST 2.5%" → 2.5, "Exempt"/"" → 0 */
function parseRate(taxGroup?: string): number {
  if (!taxGroup) return 0;
  const m = taxGroup.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : 0;
}

// ─── Number → Indian words ──────────────────────────────────────────────────

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return (TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "")).trim();
}
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? ONES[h] + " Hundred" : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}
function numToWords(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  return [
    crore ? threeDigits(crore) + " Crore" : "",
    lakh ? twoDigits(lakh) + " Lakh" : "",
    thousand ? twoDigits(thousand) + " Thousand" : "",
    hundred ? threeDigits(hundred) : "",
  ].filter(Boolean).join(" ").trim();
}
export function amountInWords(n: number): string {
  const rupees = Math.round(Math.abs(n));
  return `${numToWords(rupees)} Rupees Only`;
}

// ─── Model build ────────────────────────────────────────────────────────────

interface BuildInput {
  order: any;
  customer: any | null;
  /** B2B trade partner (resolved only for B2B orders). Its GSTIN decides the place of supply. */
  partner: any | null;
  /** True when the order is a B2B (trade-partner) sale. */
  isB2B: boolean;
  sellerGstin: string;
  sellerName: string;
  sellerAddress: string;
  sellerContact?: string;
  itemsById: Record<string, any>;
  unitsById: Record<string, string>;
  /** Real finance invoice number (once persisted); falls back to INV-{orderNo} when absent. */
  invoiceNumber?: string | null;
  /** Store-level invoice profile — bank / UPI / terms / signatory shown in the footer. */
  store?: any;
}

const ACCENT = "#55349A";
const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function buildInvoiceModel(input: BuildInput): InvoiceModel {
  const { order, customer, partner, isB2B, sellerGstin, sellerName, sellerAddress, sellerContact, itemsById, unitsById, invoiceNumber, store } = input;

  const sellerCode = (sellerGstin || "").slice(0, 2);
  const sellerState = STATE_BY_CODE[sellerCode] || "—";

  // Intra vs inter-state (business rule):
  //  • B2B (trade partner) → the PARTNER'S state decides it. A GSTIN's first two digits ARE the
  //    state code (authoritative), so we read it straight off the partner GSTIN. If the partner
  //    has no/invalid GSTIN we fall back to intra (can't prove inter-state).
  //  • B2C (consumer) → the consumer's state is intentionally ignored: always intra-state, and the
  //    place of supply is the seller's own state.
  const partnerGstinCode = (partner?.gstin || "").slice(0, 2);
  const b2bCode = STATE_BY_CODE[partnerGstinCode] ? partnerGstinCode : "";
  const posCode = isB2B ? b2bCode : sellerCode;                 // place-of-supply state code
  const posState = STATE_BY_CODE[posCode] || (isB2B ? "—" : sellerState);
  const intra = isB2B ? (!!sellerCode && !!posCode ? sellerCode === posCode : true) : true;

  // Buyer's own state, used only for the party-card display line (never drives the tax split).
  const buyerStateName = isB2B ? posState : (customer?.state || "");
  const buyerCode = isB2B ? posCode : stateCodeFromName(buyerStateName);

  let subTotal = 0, taxableTotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
  const slabAgg = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number; tax: number }>();

  const lines: InvoiceLine[] = (order.items || []).map((l: any, idx: number) => {
    const item = itemsById[l.itemUid] || {};
    const rate = parseRate(item.attributes?.taxGroup);
    const qty = Number(l.sellQty ?? l.qty ?? 0);
    const price = Number(l.unitPrice ?? 0);
    const taxable = qty * price;
    let cgst = 0, sgst = 0, igst = 0;
    if (intra) { cgst = (taxable * (rate / 2)) / 100; sgst = cgst; } else { igst = (taxable * rate) / 100; }
    subTotal += taxable; taxableTotal += taxable;
    cgstTotal += cgst; sgstTotal += sgst; igstTotal += igst;
    const agg = slabAgg.get(rate) || { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
    agg.taxable += taxable; agg.cgst += cgst; agg.sgst += sgst; agg.igst += igst; agg.tax += cgst + sgst + igst;
    slabAgg.set(rate, agg);
    const unitName = unitsById[l.unitUid] || "";
    return {
      sr: idx + 1,
      desc: item.name || String(l.itemUid || "").slice(0, 8),
      hsn: item.attributes?.hsnCode || "—",
      qty: `${qty}${unitName ? " " + unitName : ""}`,
      rate: inrNum(price),
      disc: "—",
      taxable: inrNum(taxable),
      crate: intra ? `${rate / 2}%` : undefined,
      camt: intra ? inrNum(cgst) : undefined,
      srate: intra ? `${rate / 2}%` : undefined,
      samt: intra ? inrNum(sgst) : undefined,
      irate: !intra ? `${rate}%` : undefined,
      iamt: !intra ? inrNum(igst) : undefined,
      total: inrNum(taxable + cgst + sgst + igst),
    };
  });

  const slabs: Slab[] = [...slabAgg.entries()]
    .filter(([rate]) => rate > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([rate, a]) => ({
      slab: `${rate}%`, taxable: inrNum(a.taxable),
      cgst: intra ? inrNum(a.cgst) : undefined, sgst: intra ? inrNum(a.sgst) : undefined,
      igst: !intra ? inrNum(a.igst) : undefined, tax: inrNum(a.tax),
    }));
  const taxTotal = cgstTotal + sgstTotal + igstTotal;
  const slabTotal: Slab = {
    slab: "Total", taxable: inrNum(taxableTotal),
    cgst: intra ? inrNum(cgstTotal) : undefined, sgst: intra ? inrNum(sgstTotal) : undefined,
    igst: !intra ? inrNum(igstTotal) : undefined, tax: inrNum(taxTotal),
  };

  const grandExact = taxableTotal + taxTotal;
  const grandRounded = Math.round(grandExact);
  const roundOff = grandRounded - grandExact; // + or −, persisted as-is

  const totals = [
    { label: "Sub-total", value: inr(subTotal) },
    { label: "Taxable Value", value: inr(taxableTotal) },
    ...(intra
      ? [{ label: "CGST", value: inr(cgstTotal) }, { label: "SGST", value: inr(sgstTotal) }]
      : [{ label: "IGST", value: inr(igstTotal) }]),
    { label: "Round-off", value: (roundOff < 0 ? "− ₹" : "+ ₹") + inrNum(Math.abs(roundOff)), dashedTop: true },
  ];

  const buyer = isB2B
    ? {
        label: "Bill To / Ship To (B2B)",
        name: partner?.displayName || partner?.name || order.consumerName || "Trade Partner",
        address: (partner?.billingAddress || "").replace(/, /g, ",<br>") || "—",
        gstin: partner?.gstin || undefined,
        gstinNote: partner?.gstin ? undefined : "GSTIN not on file",
        emphasiseGstin: true,
        stateLine: buyerStateName && buyerStateName !== "—" ? `${buyerStateName}${buyerCode ? ", Code " + buyerCode : ""}` : "—",
        contactLines: [partner?.phone ? `Phone: ${partner.phone}` : ""].filter(Boolean),
      }
    : customer
    ? {
        label: "Bill To / Ship To",
        name: customer.displayName || `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || order.consumerName || "Walk-in Customer",
        address: (customer.address || "").replace(/, /g, ",<br>") || "—",
        gstin: undefined,
        gstinNote: "Unregistered (B2C)",
        stateLine: buyerStateName ? `${buyerStateName}${buyerCode ? ", Code " + buyerCode : ""}` : "—",
        contactLines: [order.consumerPhone ? `Phone: ${order.consumerPhone}` : ""].filter(Boolean),
      }
    : {
        label: "Bill To", name: order.consumerName || "Walk-in Customer",
        address: (order.billingAddress || "").replace(/, /g, ",<br>") || "—",
        gstinNote: "Unregistered (B2C)", stateLine: "—",
        contactLines: [order.consumerPhone ? `Phone: ${order.consumerPhone}` : ""].filter(Boolean),
      };

  const placeOfSupply = `${posState}${posCode ? " (" + posCode + ")" : ""}`;

  // ─── Footer: bank details, UPI QR, terms — all from the fulfilling store's invoice profile ──
  const bankLines: string[] = [];
  if (store?.bankAccountName || store?.bankAccountNumber) {
    const acctBits = [
      store?.bankAccountName,
      store?.bankName,
      store?.bankIfsc,
      store?.bankAccountNumber ? `A/c ${store.bankAccountNumber}` : "",
      store?.bankBranch,
    ].filter(Boolean).join(" · ");
    if (acctBits) bankLines.push(`Bank: ${acctBits}`);
  }
  if (store?.upiId) bankLines.push(`UPI: ${store.upiId}`);
  if (store?.invoiceTerms) {
    String(store.invoiceTerms).split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
      .forEach((t: string) => bankLines.push(t));
  }
  if (bankLines.length === 0) {
    bankLines.push("Goods once sold are taken back only per return policy. E&OE.");
  }

  const upiId: string | undefined = store?.upiId || undefined;
  const upiPayload = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(sellerName)}&am=${grandRounded}&cu=INR`
    : undefined;
  const signatoryName: string = store?.invoiceSignatory || sellerName;

  return {
    docType: "INVOICE", taxKind: intra ? "INTRA" : "INTER", accent: ACCENT,
    badge: intra ? "A" : "B", badgeTint: "#f5f3ff",
    badgeText: intra ? "Intra-state · CGST + SGST split" : "Inter-state · IGST only",
    title: "TAX INVOICE", subtitle: "Original for Recipient",
    meta: [
      { label: "Invoice No.", value: invoiceNumber || (order.orderNo ? `INV-${order.orderNo}` : "—") },
      { label: "Invoice Date", value: fmtDate(order.orderDate) },
      { label: "Place of Supply", value: placeOfSupply, emphasise: !intra },
      { label: "Reverse Charge", value: "No" },
    ],
    seller: {
      label: "Sold By", name: sellerName,
      address: sellerAddress.replace(/, /g, ",<br>"),
      gstin: sellerGstin || undefined,
      stateLine: `${sellerState}${sellerCode ? ", Code " + sellerCode : ""}`,
      contactLines: sellerContact ? [`Contact: ${sellerContact}`] : [],
    },
    buyer,
    lines,
    slabs,
    slabTotal,
    totals,
    grandLabel: "Grand Total", grandValue: inr(grandRounded),
    amountInWords: amountInWords(grandRounded),
    showQr: !!upiPayload, qr: qrCells("#1E1B4B"), upiPayload,
    bank: bankLines,
    signatoryName,
    snapshotNote: invoiceNumber
      ? `Invoice ${invoiceNumber} · order ${order.orderNo ?? ""} · issued ${fmtDate(order.orderDate)}. Persisted in finance. GST split is computed from item tax groups pending finance-side GST wiring (see docs/commerce/FINANCE_GST_INVOICE_CHANGES.md).`
      : `System-generated invoice for order ${order.orderNo ?? ""} · issued ${fmtDate(order.orderDate)}. This is a live render — the finance invoice could not be raised for this order.`,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOrderInvoice(orderUid: string | undefined, sellerName: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["order-invoice", orderUid],
    enabled: !!orderUid,
    queryFn: async (): Promise<InvoiceModel> => {
      const order = await api.get<any>(`/v1/api/tenant/orders/${orderUid}`);
      const [settings, itemsRaw, unitsRaw, stores, financeInvoice] = await Promise.all([
        api.get<any>(`/v1/api/tenant/commerce-settings`).catch(() => ({})),
        api.get<any>(`/v1/api/tenant/items?size=300`).catch(() => []),
        api.get<any>(`/v1/api/tenant/units`).catch(() => []),
        api.get<any>(`/v1/api/tenant/stores`).catch(() => []),
        // Raise-or-fetch the real finance invoice: gives the persisted invoice number and the
        // authoritative server-side line prices. Idempotent. Falls back to the order's own lines
        // if finance is unavailable (e.g. service down), so the invoice still renders.
        api.post<any>(`/v1/api/tenant/orders/${orderUid}/invoice`, {}).catch(() => null),
      ]);
      const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw?.content || [];
      const units = Array.isArray(unitsRaw) ? unitsRaw : [];
      const storeList = Array.isArray(stores) ? stores : [];
      const itemsById: Record<string, any> = {};
      items.forEach((i: any) => { itemsById[i.uid] = i; });
      const unitsById: Record<string, string> = {};
      units.forEach((u: any) => { unitsById[u.uid] = u.name; });

      // B2B (trade-partner) order? The persisted order carries `partnerUid` + channel "B2B".
      // Its GSTIN drives the place of supply, so we must resolve the partner for B2B sales.
      const partnerUid = order.partnerUid || order.b2bPartnerUid;
      const isB2B = String(order.channel || "").toUpperCase() === "B2B" || !!partnerUid;

      let customer: any = null;
      let partner: any = null;
      if (isB2B && partnerUid) {
        partner = await api.get<any>(`/v1/api/tenant/trade-partners/${partnerUid}`).catch(() => null);
      } else if (order.consumerUid) {
        customer = await api.get<any>(`/v1/api/tenant/customers/${order.consumerUid}`).catch(() => null);
      }
      const store = storeList.find((s: any) => (s.uid || s.id) === order.storeUid) || storeList[0] || {};
      const storeAddressParts = [
        store?.addressLine1 || store?.address,
        store?.city,
        store?.state,
        store?.pinCode || store?.postalCode
      ].filter(Boolean);
      const resolvedStoreAddress = storeAddressParts.length > 0
        ? storeAddressParts.join(', ')
        : (store?.location || store?.address || "");
      const resolvedStoreContact = store?.contact || store?.phone || store?.email || "";

      // Prefer the finance invoice's line items — their prices come from the server-side order
      // lines (OrderItemEntity.unitPrice), which is what makes the total correct. The order's own
      // GET payload was dropping the price (the ₹0 bug). Keep unitUid from the order line for the
      // unit label. Fall back to the order's items only when no finance invoice was raised.
      const financeLines: any[] = Array.isArray(financeInvoice?.detailList) ? financeInvoice.detailList : [];
      const orderItems: any[] = Array.isArray(order.items) ? order.items : [];
      const unitByItem: Record<string, string> = {};
      orderItems.forEach((oi: any) => { if (oi.itemUid) unitByItem[oi.itemUid] = oi.unitUid; });
      const linedOrder = financeLines.length > 0
        ? {
            ...order,
            items: financeLines.map((d: any) => ({
              itemUid: d.itemUid,
              sellQty: d.quantity,
              unitPrice: d.price,
              unitUid: unitByItem[d.itemUid],
            })),
          }
        : order;

      return buildInvoiceModel({
        order: linedOrder, customer, partner, isB2B,
        invoiceNumber: financeInvoice?.invoiceNum ?? null,
        store,
        // Provider GSTIN = fulfilling STORE first (GST is registered per store), then tenant settings
        sellerGstin: store?.gstin || settings?.gstin || "",
        // Always prefer the fulfilling Store Name over tenant account container name
        sellerName: store?.name || sellerName || "Store",
        sellerAddress: resolvedStoreAddress,
        sellerContact: resolvedStoreContact,
        itemsById, unitsById,
      });
    },
  });
}
