import { httpClient } from "@/lib/httpClient";
import type {
  ChargeType,
  EntityStatus,
  ItemType,
  JewelleryItem,
  TaxSetting,
} from "@/lib/gold-erp-types";

export interface ItemPayload {
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
}

export const catalogueService = {
  async getItems() {
    const res = await httpClient.get<JewelleryItem[]>("provider/golderp/item");
    return res.data;
  },

  async createItem(data: ItemPayload) {
    const res = await httpClient.post<{ itemUid: string }>("/provider/golderp/item", data);
    return res.data;
  },

  async updateItem(itemUid: string, data: Partial<ItemPayload>) {
    const res = await httpClient.put<JewelleryItem>(`/provider/golderp/item/${itemUid}`, data);
    return res.data;
  },

  async getItemDetails(itemUid: string) {
    const res = await httpClient.get<JewelleryItem>(`/provider/golderp/item/${itemUid}`);
    return res.data;
  },

  async getTaxSettings() {
    const res = await httpClient.get<TaxSetting[]>("/provider/golderp/item/settings/tax?status-eq=Enable");
    return res.data;
  },

  async addStoneTemplate(itemUid: string, data: { stoneUid: string; expectedCount: number }) {
    const res = await httpClient.post<{ templateUid: string }>(`/provider/golderp/item/${itemUid}/stone-template`, data);
    return res.data;
  },
};
