import { httpClient } from "@/lib/httpClient";
import type {
  ChargeType,
  OrderStatus,
  OrderType,
  SalesAdvance,
  SalesDiscount,
  SalesOrder,
} from "@/lib/gold-erp-types";

type SalesInvoiceRecord = SalesOrder & Record<string, unknown>;

function extractInvoiceUid(response: unknown): string | null {
  if (typeof response === "string") {
    return response.trim() || null;
  }

  if (!response || typeof response !== "object") {
    return null;
  }

  const record = response as Record<string, unknown>;
  const directCandidates = [
    record.generalInvoiceUid,
    record.invoiceUid,
    record.invoiceId,
    record.generatedInvoiceId,
    record.invoice,
    record.uid,
    record.id,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const key of ["data", "response", "result"]) {
    const nestedId = extractInvoiceUid(record[key]);
    if (nestedId) return nestedId;
  }

  return null;
}

function getInvoiceCustomerName(invoice: Record<string, unknown>, fallback?: Partial<SalesOrder>) {
  const providerConsumer = invoice.providerConsumer as Record<string, unknown> | undefined;
  const orderFor = invoice.orderFor as Record<string, unknown> | undefined;
  return (
    (typeof providerConsumer?.name === "string" && providerConsumer.name) ||
    (typeof orderFor?.name === "string" && orderFor.name) ||
    fallback?.customerName ||
    ""
  );
}

function getInvoiceCustomerPhone(invoice: Record<string, unknown>, fallback?: Partial<SalesOrder>) {
  const providerConsumer = invoice.providerConsumer as Record<string, unknown> | undefined;
  const providerPhone = providerConsumer?.phone as Record<string, unknown> | undefined;
  const contactInfo = invoice.contactInfo as Record<string, unknown> | undefined;
  const contactPhone = contactInfo?.phone as Record<string, unknown> | undefined;

  return (
    (typeof providerPhone?.number === "string" && providerPhone.number) ||
    (typeof contactPhone?.number === "string" && contactPhone.number) ||
    fallback?.customerPhone ||
    undefined
  );
}

function normalizeInvoiceItems(invoice: Record<string, unknown>, fallback?: Partial<SalesOrder>) {
  const items = Array.isArray(invoice.items) ? (invoice.items as Array<Record<string, unknown>>) : [];
  if (!items.length) {
    return fallback?.lines || [];
  }

  return items.map((item, index) => {
    const orderItem = item.orderItem as Record<string, unknown> | undefined;
    return {
      lineUid: typeof item.encId === "string" ? item.encId : String(item.id ?? index),
      orderUid: fallback?.orderUid || "",
      tagUid: typeof orderItem?.encId === "string" ? orderItem.encId : typeof item.encId === "string" ? item.encId : String(item.id ?? index),
      itemName: typeof item.itemName === "string" ? item.itemName : "Item",
      grossWt: Number(item.grossWt ?? item.grossWeight ?? 0) || 0,
      netWt: Number(item.netWt ?? item.netWeight ?? 0) || 0,
      sellingPrice: Number(item.price ?? item.totalAmount ?? 0) || 0,
      lineTotal: Number(item.totalAmount ?? item.netTotal ?? 0) || 0,
      finalPrice: Number(item.netRate ?? item.totalAmount ?? item.netTotal ?? 0) || 0,
      discountAmount: Number(item.discountedAmount ?? 0) || 0,
      lineTaxAmount: Number(item.taxAmount ?? 0) || 0,
      quantity: Number(item.quantity ?? 0) || 0,
    };
  });
}

function normalizeSalesInvoice(response: unknown, fallback?: Partial<SalesOrder>): SalesInvoiceRecord | null {
  if (!response || typeof response !== "object") {
    return fallback ? ({ ...fallback } as SalesInvoiceRecord) : null;
  }

  const invoice = response as Record<string, unknown>;
  const invoiceUid = extractInvoiceUid(invoice);

  return {
    ...(fallback || {}),
    ...invoice,
    orderUid: fallback?.orderUid || (typeof invoice.orderUid === "string" ? invoice.orderUid : ""),
    orderNumber: fallback?.orderNumber || (typeof invoice.orderNumber === "string" ? invoice.orderNumber : ""),
    orderDate:
      (typeof invoice.invoiceDate === "string" && invoice.invoiceDate) ||
      (typeof invoice.createdDate === "string" && invoice.createdDate) ||
      fallback?.orderDate,
    customerName: getInvoiceCustomerName(invoice, fallback),
    customerPhone: getInvoiceCustomerPhone(invoice, fallback),
    totalAmount: Number(invoice.netRate ?? invoice.netTotalWithTax ?? invoice.netTotal ?? fallback?.totalAmount ?? 0) || 0,
    balanceDue: Number(invoice.amountDue ?? fallback?.balanceDue ?? 0) || 0,
    advancePaid: Number(invoice.amountPaid ?? fallback?.advancePaid ?? 0) || 0,
    discountAmount: Number(invoice.discountTotal ?? fallback?.discountAmount ?? 0) || 0,
    invoiceNumber:
      (typeof invoice.invoiceNum === "string" && invoice.invoiceNum) ||
      (typeof invoice.invoiceNumber === "string" && invoice.invoiceNumber) ||
      undefined,
    generatedInvoiceId: invoiceUid || undefined,
    generalInvoiceUid: invoiceUid || undefined,
    uid: invoiceUid || invoice.uid,
    status: "INVOICED",
    lines: normalizeInvoiceItems(invoice, fallback),
  } as SalesInvoiceRecord;
}

async function fetchSalesOrderHeaders() {
  const statuses: OrderStatus[] = ["DRAFT", "CONFIRMED", "INVOICED", "CANCELLED"];
  const grouped = await Promise.all(
    statuses.map(async (status) => {
      const res = await httpClient.get<SalesOrder[]>(`/provider/golderp/sales/order/status/${status}`);
      return res.data;
    }),
  );

  const deduped = new Map<string, SalesOrder>();
  grouped.flat().forEach((order) => {
    deduped.set(order.orderUid, order);
  });

  return Array.from(deduped.values());
}

export const salesService = {
  getSalesOrderHeaders: fetchSalesOrderHeaders,

  async getSalesOrdersWithDetails() {
    const headers = await fetchSalesOrderHeaders();
    return Promise.all(
      headers.map(async (order) => {
          try {
            const res = await httpClient.get<SalesOrder>(`/provider/golderp/sales/order/${order.orderUid}`);
            return res.data;
          } catch {
            return order;
          }
      }),
    );
  },

  async getSalesOrderDetails(orderUid: string) {
    const res = await httpClient.get<SalesOrder>(`/provider/golderp/sales/order/${orderUid}`);
    return res.data;
  },

  async createSalesOrder(data: {
    orderNumber: string;
    orderType: OrderType;
    customerName: string;
    customerPhone?: string;
    orderDate: string;
    totalAmount: number;
    discountAmount?: number;
    oldGoldDeduction?: number;
    advancePaid?: number;
    balanceDue?: number;
    status: OrderStatus;
    notes?: string;
    lines: Array<{
      tagUid: string;
      grossWt: number;
      netWt: number;
      sellingPrice: number;
      discountOnLine?: number;
      finalPrice: number;
    }>;
  }) {
    const res = await httpClient.post<SalesOrder>("/provider/golderp/sales/order", data);
    return res.data;
  },

  async addAdvance(orderUid: string, data: { amount: number; paymentMode: string; referenceNumber?: string; paymentDate?: string; notes?: string }) {
    const res = await httpClient.post<SalesAdvance>(`/provider/golderp/sales/order/${orderUid}/advance`, data);
    return res.data;
  },

  async addOldGold(
    orderUid: string,
    data: {
      metalType: string;
      purityLabel: string;
      grossWt: number;
      netWt: number;
      rateApplied: number;
      exchangeValue: number;
      notes?: string;
    },
  ) {
    const res = await httpClient.post<{ oldGoldUid: string }>(`/provider/golderp/sales/order/${orderUid}/old-gold`, data);
    return res.data;
  },

  async addDiscount(
    orderUid: string,
    data: { discountType: ChargeType; discountValue: number; discountAmount: number; reason?: string },
  ) {
    const res = await httpClient.post<SalesDiscount>(`/provider/golderp/sales/order/${orderUid}/discount`, data);
    return res.data;
  },

  async confirmSalesOrder(orderUid: string) {
    const res = await httpClient.put<SalesOrder>(`/provider/golderp/sales/order/${orderUid}/status?status=CONFIRMED`);
    return res.data;
  },

  async invoiceSalesOrder(orderUid: string) {
    const res = await httpClient.put<SalesOrder>(`/provider/golderp/sales/order/${orderUid}/invoice`);
    return res.data;
  },

  extractInvoiceUid,

  normalizeSalesInvoice,

  async getSalesInvoiceByOrder(orderUid: string) {
    const orderRes = await httpClient.get<SalesInvoiceRecord>(`/provider/golderp/sales/order/${orderUid}`);
    const invoiceUid = extractInvoiceUid(orderRes.data);

    if (!invoiceUid) {
      return {
        invoice: normalizeSalesInvoice(orderRes.data, orderRes.data),
        invoiceUid: null,
      };
    }

    const invoiceRes = await httpClient.get<Record<string, unknown>>(`/provider/so/invoice/${invoiceUid}`);
    return {
      invoice: normalizeSalesInvoice(invoiceRes.data, orderRes.data),
      invoiceUid,
    };
  },

  async getBusinessProfile() {
    const res = await httpClient.get<Record<string, unknown>>("/provider/bProfile");
    return res.data;
  },
};
