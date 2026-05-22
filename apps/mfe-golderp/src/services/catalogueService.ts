import { httpClient } from "@/lib/httpClient";
import type {
  ChargeType,
  EntityStatus,
  ItemType,
  JewelleryItem,
  TaxSetting,
} from "@/lib/gold-erp-types";
import { appendQuery, normalizeCountResponse } from "./serviceUtils";

export interface ItemListFilters {
  itemCode?: string;
  name?: string;
  itemType?: string;
  metalUid?: string;
  purityUid?: string;
  status?: string;
  availableOnline?: boolean;
  hsnCode?: string;
  from?: number;
  count?: number;
}

export interface TaxListFilters {
  taxCode?: string;
  taxName?: string;
  taxType?: string;
  status?: string;
  from?: number;
  count?: number;
}

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
  taxCodes?: string[];
  description?: string;
  availableOnline: boolean;
  chargeType: ChargeType;
  chargeValue: number;
  status: EntityStatus;
}

function buildItemPath(path: string, filters: ItemListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.itemCode?.trim()) params.set("itemCode-like", filters.itemCode.trim());
  if (filters.name?.trim()) params.set("name-like", filters.name.trim());
  if (filters.itemType?.trim() && filters.itemType !== "all") params.set("itemType-eq", filters.itemType.trim());
  if (filters.metalUid?.trim()) params.set("metalUid-eq", filters.metalUid.trim());
  if (filters.purityUid?.trim()) params.set("purityUid-eq", filters.purityUid.trim());
  if (filters.status?.trim() && filters.status !== "all") params.set("status-eq", filters.status.trim());
  if (typeof filters.availableOnline === "boolean") params.set("availableOnline-eq", String(filters.availableOnline));
  if (filters.hsnCode?.trim()) params.set("hsnCode-like", filters.hsnCode.trim());
  if (typeof filters.from === "number") params.set("from", String(Math.max(0, filters.from)));
  if (typeof filters.count === "number") params.set("count", String(Math.max(1, filters.count)));
  return appendQuery(path, params);
}

function buildTaxPath(path: string, filters: TaxListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.taxCode?.trim()) params.set("taxCode-eq", filters.taxCode.trim());
  if (filters.taxName?.trim()) params.set("taxName-like", filters.taxName.trim());
  if (filters.taxType?.trim() && filters.taxType !== "all") params.set("taxType-eq", filters.taxType.trim());
  if (filters.status?.trim() && filters.status !== "all") params.set("status-eq", filters.status.trim());
  if (typeof filters.from === "number") params.set("from", String(Math.max(0, filters.from)));
  if (typeof filters.count === "number") params.set("count", String(Math.max(1, filters.count)));
  return appendQuery(path, params);
}

export const catalogueService = {
  async getItems(filters: ItemListFilters = {}) {
    const res = await httpClient.get<JewelleryItem[]>(buildItemPath("/provider/golderp/item", filters));
    return res.data;
  },

  async getItemCount(filters: Omit<ItemListFilters, "from" | "count"> = {}) {
    const res = await httpClient.get<unknown>(buildItemPath("/provider/golderp/item/count", filters));
    return normalizeCountResponse(res.data);
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

  async deleteItem(itemUid: string) {
    const res = await httpClient.delete<boolean>(`/provider/golderp/item/${itemUid}`);
    return res.data;
  },

  async getTaxSettings() {
    const res = await httpClient.get<TaxSetting[]>("/provider/golderp/item/settings/tax?status-eq=Enable");
    return res.data;
  },

  async getTaxSettingsList(filters: TaxListFilters = {}) {
    const res = await httpClient.get<TaxSetting[]>(buildTaxPath("/provider/golderp/settings/tax", filters));
    return res.data;
  },

  async getTaxSettingsCount(filters: Omit<TaxListFilters, "from" | "count"> = {}) {
    const res = await httpClient.get<unknown>(buildTaxPath("/provider/golderp/settings/tax/count", filters));
    return normalizeCountResponse(res.data);
  },

  async getTaxSettingDetails(taxCode: string) {
    const res = await httpClient.get<TaxSetting>(`/provider/golderp/settings/tax/${taxCode}`);
    return res.data;
  },

  async addStoneTemplate(itemUid: string, data: { stoneUid: string; expectedCount: number }) {
    const res = await httpClient.post<{ templateUid: string }>(`/provider/golderp/item/${itemUid}/stone-template`, data);
    return res.data;
  },

  async deleteStoneTemplate(_itemUid: string, templateUid: string) {
    const res = await httpClient.delete<boolean>(`/provider/golderp/item/stone-template/${templateUid}`);
    return res.data;
  },
};
