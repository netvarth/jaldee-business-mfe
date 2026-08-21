import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommerceApi } from './useCommerceApi';

export interface ItemFeedbackDto {
  uid?: string;
  itemUid: string;
  variantUid?: string;
  consumerUid: string;
  orderUid?: string;
  rating: number;
  comment?: string;
}

export interface OrderReviewDto {
  uid?: string;
  orderUid: string;
  rating: number;
  comment?: string;
  reviewDate?: string;
}

export function useItemFeedbacks() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['item-feedbacks'],
    queryFn: async () => {
      try {
        const res = await api.get<ItemFeedbackDto[]>('/v1/api/tenant/item-feedback');
        return Array.isArray(res) ? res : [];
      } catch (err) {
        console.warn('Failed to fetch item feedbacks:', err);
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}

export function useItemFeedbackByItem(itemUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['item-feedback-item', itemUid],
    queryFn: async () => {
      if (!itemUid) return [];
      try {
        const res = await api.get<ItemFeedbackDto[]>(`/v1/api/tenant/item-feedback/item/${itemUid}`);
        return Array.isArray(res) ? res : [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!itemUid,
  });
}

export function useItemFeedbackByOrder(orderUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['item-feedback-order', orderUid],
    queryFn: async () => {
      if (!orderUid) return [];
      try {
        const res = await api.get<ItemFeedbackDto[]>(`/v1/api/tenant/item-feedback/order/${orderUid}`);
        return Array.isArray(res) ? res : [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!orderUid,
  });
}

export function useOrderReviews() {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['order-reviews'],
    queryFn: async () => {
      try {
        const res = await api.get<OrderReviewDto[]>('/v1/api/tenant/orders/reviews');
        return Array.isArray(res) ? res : [];
      } catch (err) {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });
}

export function useOrderReview(orderUid?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ['order-review', orderUid],
    queryFn: async () => {
      if (!orderUid) return null;
      try {
        return await api.get<OrderReviewDto>(`/v1/api/tenant/orders/${orderUid}/review`);
      } catch (err) {
        return null;
      }
    },
    enabled: !!orderUid,
  });
}

export function useSubmitItemFeedback() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ItemFeedbackDto) =>
      api.post<ItemFeedbackDto>('/v1/api/tenant/item-feedback', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['item-feedback-item'] });
      queryClient.invalidateQueries({ queryKey: ['item-feedback-order'] });
    },
  });
}

export function useSubmitOrderReview() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderUid, review }: { orderUid: string; review: { rating: number; comment?: string } }) =>
      api.put<OrderReviewDto>(`/v1/api/tenant/orders/${orderUid}/review`, review),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['order-review', variables.orderUid] });
    },
  });
}

export function useDeleteItemFeedback() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) =>
      api.delete<boolean>(`/v1/api/tenant/item-feedback/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['item-feedback-item'] });
      queryClient.invalidateQueries({ queryKey: ['item-feedback-order'] });
    },
  });
}

export function useRequestOrderReview() {
  const api = useCommerceApi();
  return useMutation({
    mutationFn: (orderUid: string) =>
      api.post<boolean>(`/v1/api/tenant/orders/${orderUid}/request-review`, {}),
  });
}
