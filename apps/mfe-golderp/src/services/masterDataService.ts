import { httpClient } from "@/lib/httpClient";
import type {
  EntityStatus,
  Metal,
  MetalPurity,
  Stone,
  StoneClarity,
  StoneCut,
  StoneShape,
  StoneType,
} from "@/lib/gold-erp-types";

export const masterDataService = {
  async getMetals() {
    const res = await httpClient.get<Metal[]>("/provider/golderp/master/metal");
    return res.data;
  },

  async createMetal(data: { metalCode: string; name: string; status: EntityStatus }) {
    const res = await httpClient.post<{ metalUid: string }>("/provider/golderp/master/metal", data);
    return res.data;
  },

  async updateMetal(metalUid: string, data: { metalCode: string; name: string; status: EntityStatus }) {
    const res = await httpClient.put<Metal>(`/provider/golderp/master/metal/${metalUid}`, data);
    return res.data;
  },

  async getPurities() {
    const res = await httpClient.get<MetalPurity[]>("/provider/golderp/master/purity");
    return res.data;
  },

  async getPuritiesByMetal(metalUid: string) {
    const res = await httpClient.get<MetalPurity[]>(`/provider/golderp/master/purity/metal/${metalUid}`);
    return res.data;
  },

  async createPurity(data: { metalUid: string; purityCode: string; label: string; purityRatio: number; status: EntityStatus }) {
    const res = await httpClient.post<{ purityUid: string }>("/provider/golderp/master/purity", data);
    return res.data;
  },

  async updatePurity(
    purityUid: string,
    data: { metalUid: string; purityCode: string; label: string; purityRatio: number; status: EntityStatus },
  ) {
    const res = await httpClient.put<MetalPurity>(`/provider/golderp/master/purity/${purityUid}`, data);
    return res.data;
  },

  async getStones() {
    const res = await httpClient.get<Stone[]>("/provider/golderp/master/stone");
    return res.data;
  },

  async createStone(data: {
    stoneCode: string;
    name: string;
    stoneType: StoneType;
    shape: StoneShape;
    clarity: StoneClarity;
    cut: StoneCut;
    pricePerPiece: number;
    status: EntityStatus;
  }) {
    const res = await httpClient.post<Stone>("/provider/golderp/master/stone", data);
    return res.data;
  },

  async updateStone(
    stoneUid: string,
    data: Partial<{
      stoneCode: string;
      name: string;
      stoneType: StoneType;
      shape: StoneShape;
      clarity: StoneClarity;
      cut: StoneCut;
      pricePerPiece: number;
      status: EntityStatus;
    }>,
  ) {
    const res = await httpClient.put<Stone>(`/provider/golderp/master/stone/${stoneUid}`, data);
    return res.data;
  },
};
