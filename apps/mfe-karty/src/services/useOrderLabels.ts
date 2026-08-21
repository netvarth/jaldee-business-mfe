/**
 * Builds shipping-label models from real Karty orders (single or bulk).
 *
 * Ship-to comes from the order's shippingAddress snapshot, falling back to the customer's
 * profile address. An order with no resolvable shipping address is reported and EXCLUDED from
 * the run — never silently dropped (that's the whole point of the design's skip callout).
 */
import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";
import type { LabelModel } from "../pages/shipping/ShippingLabel";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

/** Turn a flat address string into { street (br-joined), city (last 1-2 segments) }. */
function splitAddress(raw: string): { street: string; city: string } {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { street: raw, city: "" };
  // The tail segment usually carries "State — PIN"; keep the last two as the city line.
  const cityCount = parts.length >= 3 ? 2 : 1;
  const street = parts.slice(0, parts.length - cityCount).join(",<br>");
  const city = parts.slice(parts.length - cityCount).join(", ");
  return { street, city };
}

interface ShipTo { street: string; city: string; phone?: string }
function resolveShipTo(order: any, customer: any | null): ShipTo | null {
  const raw = typeof order.shippingAddress === "string" ? order.shippingAddress.trim() : "";
  if (raw && raw.length > 3) {
    const { street, city } = splitAddress(raw);
    return { street, city, phone: order.consumerPhone || customer?.phoneE164 };
  }
  const custAddr = (customer?.address || "").trim();
  if (custAddr) {
    const { street, city } = splitAddress(custAddr);
    return { street, city: city || customer?.state || "", phone: order.consumerPhone || customer?.phoneE164 };
  }
  return null;
}

export function buildLabelModel(order: any, itemsById: Record<string, any>, sellerLine: string, customer: any | null, shipTo: ShipTo): LabelModel {
  const items = (order.items || []).map((l: any) => ({
    name: itemsById[l.itemUid]?.name || String(l.itemUid || "").slice(0, 8),
    qty: String(Number(l.sellQty ?? l.qty ?? 0)),
  }));
  const units = (order.items || []).reduce((s: number, l: any) => s + Number(l.sellQty ?? l.qty ?? 0), 0);
  const total = Number(order.totalAmount || 0);
  const name = order.consumerName || (customer ? (customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ")) : "") || "Customer";
  return {
    orderNo: order.orderNo ? `KRT-${order.orderNo}` : String(order.uid || "").slice(0, 8),
    fromLine: sellerLine,
    carrier: order.shiprocketOrderId ? "SHIPROCKET" : undefined,
    awb: order.awbCode || undefined,
    shipToName: name,
    shipToAddr: shipTo.street,
    shipToCity: shipTo.city,
    shipToPhone: shipTo.phone,
    billToLine: order.billingAddress || `${name}${shipTo.city ? " · " + shipTo.city : ""}`,
    items,
    summary: `${items.length} items · ${units} units · ${fmtDate(order.orderDate)}`,
    // No payment-mode field on the order yet — default to COD for the amount due; a real
    // prepaid/COD flag would come from finance once payment capture is wired.
    payLine: total > 0 ? `COD ${inr(total)}` : "PREPAID",
    isCod: total > 0,
  };
}

export interface LabelBundle { labels: LabelModel[]; skipped: { no: string; name: string }[] }

export function useOrderLabels(orderUids: string[], sellerName: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["order-labels", [...orderUids].sort().join(","), sellerName],
    enabled: orderUids.length > 0,
    queryFn: async (): Promise<LabelBundle> => {
      const [itemsRaw, storesRaw, customersRaw, settings] = await Promise.all([
        api.get<any>(`/v1/api/tenant/items?size=300`).catch(() => []),
        api.get<any>(`/v1/api/tenant/stores`).catch(() => []),
        api.get<any>(`/v1/api/tenant/customers?size=300`).catch(() => []),
        api.get<any>(`/v1/api/tenant/commerce-settings`).catch(() => ({})),
      ]);
      const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw?.content || [];
      const stores = Array.isArray(storesRaw) ? storesRaw : [];
      const customers = Array.isArray(customersRaw) ? customersRaw : customersRaw?.content || [];
      const itemsById: Record<string, any> = {}; items.forEach((i: any) => (itemsById[i.uid] = i));
      const custById: Record<string, any> = {}; customers.forEach((c: any) => (custById[c.uid] = c));
      const store0 = stores[0] || {};
      const seller = `${sellerName || store0.name || "Business"}${store0.name ? ", " + store0.name : ""}`;

      const orders = await Promise.all(orderUids.map((uid) => api.get<any>(`/v1/api/tenant/orders/${uid}`).catch(() => null)));
      const labels: LabelModel[] = [];
      const skipped: { no: string; name: string }[] = [];
      for (const o of orders) {
        if (!o) continue;
        const cust = o.consumerUid ? custById[o.consumerUid] : null;
        const shipTo = resolveShipTo(o, cust);
        if (!shipTo) { skipped.push({ no: o.orderNo ? `KRT-${o.orderNo}` : "—", name: o.consumerName || "Guest" }); continue; }
        labels.push(buildLabelModel(o, itemsById, seller, cust, shipTo));
      }
      return { labels, skipped };
    },
  });
}
