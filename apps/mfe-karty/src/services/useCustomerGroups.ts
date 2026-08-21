import { useQuery } from "@tanstack/react-query";
import { useCrmApi } from "./useCrmApi";

export interface CustomerGroupItem {
  uid: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
}

export function useCustomerGroups() {
  const api = useCrmApi();

  return useQuery({
    queryKey: ["customerGroups"],
    queryFn: async () => {
      const data = await api.get('/v1/api/tenant/consumer-groups');
      return (data || []) as CustomerGroupItem[];
    }
  });
}
