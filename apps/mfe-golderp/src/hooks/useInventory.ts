import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { JewelleryTag, StockTransfer, TransferLine } from "@/lib/gold-erp-types";

export const useTags = () => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const statuses = ["IN_STOCK", "RESERVED", "SOLD", "RETURNED", "TRANSFERRED"];
      const grouped = await Promise.all(
        statuses.map(async (status) => {
          try {
            return await apiFetch<JewelleryTag[]>(`/tag/status/${status}`);
          } catch {
            return [];
          }
        }),
      );

      const deduped = new Map<string, JewelleryTag>();
      grouped.flat().forEach((tag) => {
        deduped.set(tag.tagUid, tag);
      });
      return Array.from(deduped.values());
    },
  });
};

export const useTagDetails = (tagUid: string | null) => {
  return useQuery({
    queryKey: ["tag", tagUid],
    queryFn: () => apiFetch<JewelleryTag>(`/tag/${tagUid}`),
    enabled: !!tagUid,
  });
};

export const useTransfers = () => {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const statuses = ["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"];
      const grouped = await Promise.all(
        statuses.map(async (status) => {
          try {
            const transfers = await apiFetch<StockTransfer[]>(`/transfer/status/${status}`);
            const transfersWithLines = await Promise.all(
              transfers.map(async (transfer) => {
                try {
                  const lines = await apiFetch<TransferLine[]>(`/transfer/${transfer.transferUid}/lines`);
                  return { ...transfer, lines };
                } catch {
                  return transfer;
                }
              }),
            );
            return transfersWithLines;
          } catch {
            return [];
          }
        }),
      );

      const deduped = new Map<string, StockTransfer>();
      grouped.flat().forEach((transfer) => {
        deduped.set(transfer.transferUid, transfer);
      });
      return Array.from(deduped.values());
    },
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      transferNumber: string;
      toAccount: number;
      transferDate: string;
      totalTags: number;
      status: "PENDING";
      dispatchReference?: string;
      notes?: string;
      lines: Array<{ tagUid: string; notes?: string }>;
    }) =>
      apiFetch<StockTransfer>("/transfer", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

export const useMarkTransferInTransit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transferUid, dispatchReference }: { transferUid: string; dispatchReference?: string }) =>
      apiFetch<StockTransfer>(`/transfer/${transferUid}/in-transit${dispatchReference ? `?dispatchReference=${encodeURIComponent(dispatchReference)}` : ""}`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
};

export const useConfirmTransferReceived = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferUid: string) =>
      apiFetch<StockTransfer>(`/transfer/${transferUid}/confirm-received`, {
        method: "PUT",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};
