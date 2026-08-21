import { useQuery } from "@tanstack/react-query";
import { useCrmApi } from "./useCrmApi";

export interface CustomerLabelItem {
  uid: string;
  name: string;
  color?: string;
  status: "ACTIVE" | "INACTIVE";
}

export function useCustomerLabels() {
  const api = useCrmApi();

  return useQuery({
    queryKey: ["customerLabels"],
    queryFn: async () => {
      // POST /search for labels as per TenantConsumerLabelController
      const res = await api.post('/v1/api/tenant/consumer-labels/search?page=0&size=1000');
      const data = (res as any)?.content || res;
      return (Array.isArray(data) ? data : []) as CustomerLabelItem[];
    }
  });
}
