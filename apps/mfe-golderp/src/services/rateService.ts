import { httpClient } from "@/lib/httpClient";
import type { EntityStatus, MetalRate } from "@/lib/gold-erp-types";

export const rateService = {
  async getCurrentRate(metalUid: string, purityUid: string) {
    const res = await httpClient.get<MetalRate>(`provider/golderp/rate/current/${metalUid}/${purityUid}`);
    return res.data;
  },

  async getRates() {
    const res = await httpClient.get<MetalRate[]>("/provider/golderp/rate");
    return res.data;
  },

  async getRateHistory(metalUid: string, purityUid: string) {
    const res = await httpClient.get<MetalRate[]>(`/provider/golderp/rate/history/${metalUid}/${purityUid}`);
    return res.data;
  },

  async saveRate(data: {
    metalUid: string;
    purityUid: string;
    ratePerGram: number;
    effectiveDate: string;
    status: EntityStatus;
  }) {
    const res = await httpClient.post<{ rateUid: string }>("/provider/golderp/rate", data);
    return res.data;
  },
};
