import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface OrderEvent {
  uid: string;
  orderUid: string;
  eventType: string;
  eventAt: string;
  actorUserUid?: string;
  actorName?: string;
  summary?: string;
  refUid?: string;
}

export function useOrderTimeline(orderUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["order-timeline", orderUid],
    enabled: !!orderUid,
    queryFn: async () => {
      const data = await api.get<OrderEvent[]>(`/v1/api/tenant/orders/${orderUid}/timeline`);
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });
}
