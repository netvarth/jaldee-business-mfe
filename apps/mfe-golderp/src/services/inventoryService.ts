import { httpClient } from "@/lib/httpClient";
import type {
  JewelleryTag,
  StockItemSummary,
  StockItemTypeSummary,
  StockMetalSummary,
  StockPuritySummary,
  StockSummary,
  StockTransfer,
  TransferLine,
} from "@/lib/gold-erp-types";

export interface CreateTransferPayload {
  transferNumber: string;
  toAccount: number;
  transferDate: string;
  totalTags: number;
  status: "PENDING";
  dispatchReference?: string;
  notes?: string;
  lines: Array<{ tagUid: string; notes?: string }>;
}

export const inventoryService = {
  async getTags() {
    const statuses = ["IN_STOCK", "RESERVED", "SOLD", "RETURNED", "TRANSFERRED"];
    const grouped = await Promise.all(
      statuses.map(async (status) => {
        const res = await httpClient.get<JewelleryTag[]>(`/provider/golderp/tag/status/${status}`);
        return res.data;
      }),
    );

    const deduped = new Map<string, JewelleryTag>();
    grouped.flat().forEach((tag) => {
      deduped.set(tag.tagUid, tag);
    });

    return Array.from(deduped.values());
  },

  async getTagDetails(tagUid: string) {
    const res = await httpClient.get<JewelleryTag>(`/provider/golderp/tag/${tagUid}`);
    return res.data;
  },

  async getStockSummary() {
    const res = await httpClient.get<StockSummary>("/provider/golderp/stock/summary");
    return res.data;
  },

  async getStockByItemType() {
    const res = await httpClient.get<StockItemTypeSummary[]>("/provider/golderp/stock/item-type");
    return res.data;
  },

  async getStockByMetal() {
    const res = await httpClient.get<StockMetalSummary[]>("/provider/golderp/stock/metal");
    return res.data;
  },

  async getStockByPurity() {
    const res = await httpClient.get<StockPuritySummary[]>("/provider/golderp/stock/purity");
    return res.data;
  },

  async getStockByItem() {
    const res = await httpClient.get<StockItemSummary[]>("/provider/golderp/stock/item");
    return res.data;
  },

  async getTransfers() {
    const statuses = ["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"];
    const grouped = await Promise.all(
      statuses.map(async (status) => {
        const transfersRes = await httpClient.get<StockTransfer[]>(`/provider/golderp/transfer/status/${status}`);
        const transfers = transfersRes.data;
        return Promise.all(
          transfers.map(async (transfer) => {
            try {
              const linesRes = await httpClient.get<TransferLine[]>(`/provider/golderp/transfer/${transfer.transferUid}/lines`);
              return { ...transfer, lines: linesRes.data };
            } catch {
              return transfer;
            }
          }),
        );
      }),
    );

    const deduped = new Map<string, StockTransfer>();
    grouped.flat().forEach((transfer) => {
      deduped.set(transfer.transferUid, transfer);
    });

    return Array.from(deduped.values());
  },

  async createTransfer(data: CreateTransferPayload) {
    const res = await httpClient.post<StockTransfer>("/provider/golderp/transfer", data);
    return res.data;
  },

  async markTransferInTransit(transferUid: string, dispatchReference?: string) {
    const res = await httpClient.put<StockTransfer>(
      `/provider/golderp/transfer/${transferUid}/in-transit${dispatchReference ? `?dispatchReference=${encodeURIComponent(dispatchReference)}` : ""}`,
    );
    return res.data;
  },

  async confirmTransferReceived(transferUid: string) {
    const res = await httpClient.put<StockTransfer>(`/provider/golderp/transfer/${transferUid}/confirm-received`);
    return res.data;
  },
};
