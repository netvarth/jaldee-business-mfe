import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface SerialDto {
  uid: string;
  serialNumber: string;
  storeUid: string;
  storeName?: string;
  itemUid: string;
  itemName?: string;
  catalogItemUid: string;
  status: "IN_STOCK" | "SOLD" | "RETURNED" | "DEFECTIVE" | "TRANSIT";
  purchaseUid?: string;
  orderUid?: string;
  receivedAt: string;
  soldAt?: string;
}

export function useSerials(itemUid?: string, status?: string) {
  const api = useCommerceApi();
  return useQuery({
    queryKey: ["inventory-serials", itemUid, status],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("size", "200");
      if (itemUid) q.set("itemUid", itemUid);
      if (status && status !== "ALL") q.set("status", status);
      // Backend now returns a Spring Page<> (was a raw List<>, and was backed by an
      // unbounded cross-tenant table scan) — unwrap .content the same way useStores/useItems do.
      const rawData = await api.get<any>(`/v1/api/tenant/inventory/serials?${q.toString()}`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as SerialDto[];
    },
    staleTime: 30_000,
  });
}

export function useReceiveSerials() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storeUid,
      itemUid,
      catalogItemUid,
      purchaseUid,
      serialNumbers,
    }: {
      storeUid: string;
      itemUid: string;
      catalogItemUid: string;
      purchaseUid?: string;
      serialNumbers: string[];
    }) => {
      const q = new URLSearchParams({ storeUid, itemUid, catalogItemUid });
      if (purchaseUid) q.set("purchaseUid", purchaseUid);
      return api.post<SerialDto[]>(`/v1/api/tenant/inventory/serials/receive?${q.toString()}`, serialNumbers);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-serials"] });
      qc.invalidateQueries({ queryKey: ["inventory-stock"] });
    },
  });
}

export function useReturnSerial() {
  const api = useCommerceApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => {
      return api.put<SerialDto>(`/v1/api/tenant/inventory/serials/${uid}/return`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-serials"] });
    },
  });
}
