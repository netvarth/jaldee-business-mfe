import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, providerApiFetch } from "@/lib/api";
import { ChargeType, EntityStatus, ItemType, JewelleryItem, TaxSetting } from "@/lib/gold-erp-types";

export const useItems = () => {
  return useQuery({
    queryKey: ["items"],
    queryFn: () => apiFetch<JewelleryItem[]>("/item"),
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      itemCode: string;
      name: string;
      itemType: ItemType;
      metalUid: string;
      purityUid: string;
      typicalGrossWt: number;
      typicalNetWt: number;
      hsnCode: string;
      taxRate: number;
      description?: string;
      availableOnline: boolean;
      chargeType: ChargeType;
      chargeValue: number;
      status: EntityStatus;
    }) =>
      apiFetch<{ itemUid: string }>("/item", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemUid,
      data,
    }: {
      itemUid: string;
      data: Partial<{
        itemCode: string;
        name: string;
        itemType: ItemType;
        metalUid: string;
        purityUid: string;
        typicalGrossWt: number;
        typicalNetWt: number;
        hsnCode: string;
        taxRate: number;
        description?: string;
        availableOnline: boolean;
        chargeType: ChargeType;
        chargeValue: number;
        status: EntityStatus;
      }>;
    }) =>
      apiFetch<JewelleryItem>(`/item/${itemUid}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["items", variables.itemUid] });
    },
  });
};

export const useItemDetails = (itemUid: string | null) => {
  return useQuery({
    queryKey: ["items", itemUid],
    queryFn: () => apiFetch<JewelleryItem>(`/item/${itemUid}`),
    enabled: !!itemUid,
  });
};

export const useTaxSettings = (enabled = true) => {
  return useQuery({
    queryKey: ["taxSettings"],
    queryFn: () => providerApiFetch<TaxSetting[]>("/spitem/settings/tax?status-eq=Enable"),
    enabled,
  });
};

export const useAddStoneTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemUid, data }: { itemUid: string; data: { stoneUid: string; expectedCount: number } }) =>
      apiFetch<{ templateUid: string }>(`/item/${itemUid}/stone-template`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items", variables.itemUid] });
    },
  });
};
