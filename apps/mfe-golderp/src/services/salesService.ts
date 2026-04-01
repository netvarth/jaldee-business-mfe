import { httpClient } from "@/lib/httpClient";
import type {
  ChargeType,
  OrderStatus,
  OrderType,
  SalesAdvance,
  SalesDiscount,
  SalesOrder,
} from "@/lib/gold-erp-types";

async function fetchSalesOrderHeaders() {
  const statuses: OrderStatus[] = ["DRAFT", "CONFIRMED", "INVOICED", "CANCELLED"];
  const grouped = await Promise.all(
    statuses.map(async (status) => {
      const res = await httpClient.get<SalesOrder[]>(`provider/golderp/sales/order/status/${status}`);
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
};
