import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ChargeType, OrderStatus, OrderType, SalesAdvance, SalesDiscount, SalesOrder } from "@/lib/gold-erp-types";

const fetchSalesOrderHeaders = async () => {
  const statuses: OrderStatus[] = ["DRAFT", "CONFIRMED", "INVOICED", "CANCELLED"];
  const grouped = await Promise.all(
    statuses.map(async (status) => {
      try {
        return await apiFetch<SalesOrder[]>(`/sales/order/status/${status}`);
      } catch {
        return [];
      }
    }),
  );

  const deduped = new Map<string, SalesOrder>();
  grouped.flat().forEach((order) => {
    deduped.set(order.orderUid, order);
  });

  return Array.from(deduped.values());
};

export const useSalesOrders = () => {
  return useQuery({
    queryKey: ["salesOrders"],
    queryFn: fetchSalesOrderHeaders,
  });
};

export const useSalesOrdersWithDetails = () => {
  return useQuery({
    queryKey: ["salesOrders", "details"],
    queryFn: async () => {
      const headers = await fetchSalesOrderHeaders();
      const detailedOrders = await Promise.all(
        headers.map(async (order) => {
          try {
            return await apiFetch<SalesOrder>(`/sales/order/${order.orderUid}`);
          } catch {
            return order;
          }
        }),
      );

      return detailedOrders;
    },
  });
};

export const useSalesOrderDetails = (orderUid: string | null) => {
  return useQuery({
    queryKey: ["salesOrder", orderUid],
    queryFn: () => apiFetch<SalesOrder>(`/sales/order/${orderUid}`),
    enabled: !!orderUid,
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
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
    }) =>
      apiFetch<SalesOrder>("/sales/order", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
    },
  });
};

export const useAddAdvance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderUid,
      data,
    }: {
      orderUid: string;
      data: { amount: number; paymentMode: string; referenceNumber?: string; paymentDate?: string; notes?: string };
    }) =>
      apiFetch<SalesAdvance>(`/sales/order/${orderUid}/advance`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["salesOrder", variables.orderUid] });
    },
  });
};

export const useAddOldGold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderUid,
      data,
    }: {
      orderUid: string;
      data: {
        metalType: string;
        purityLabel: string;
        grossWt: number;
        netWt: number;
        rateApplied: number;
        exchangeValue: number;
        notes?: string;
      };
    }) =>
      apiFetch<{ oldGoldUid: string }>(`/sales/order/${orderUid}/old-gold`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["salesOrder", variables.orderUid] });
    },
  });
};

export const useAddDiscount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderUid,
      data,
    }: {
      orderUid: string;
      data: { discountType: ChargeType; discountValue: number; discountAmount: number; reason?: string };
    }) =>
      apiFetch<SalesDiscount>(`/sales/order/${orderUid}/discount`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["salesOrder", variables.orderUid] });
    },
  });
};

export const useConfirmSalesOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderUid: string) =>
      apiFetch<SalesOrder>(`/sales/order/${orderUid}/status?status=CONFIRMED`, {
        method: "PUT",
      }),
    onSuccess: (_, orderUid) => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["salesOrder", orderUid] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

export const useInvoiceSalesOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderUid: string) =>
      apiFetch<SalesOrder>(`/sales/order/${orderUid}/invoice`, {
        method: "PUT",
      }),
    onSuccess: (_, orderUid) => {
      queryClient.invalidateQueries({ queryKey: ["salesOrders"] });
      queryClient.invalidateQueries({ queryKey: ["salesOrder", orderUid] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};
