import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface Vendor {
  uid: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  status: string;
}

export function useVendors(search: string = "") {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["vendors", search],
    queryFn: async () => {
      const rawData = await api.get<any>(`/v1/api/tenant/vendors?search=${encodeURIComponent(search)}&size=100`);
      const data = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      return data as Vendor[];
    }
  });
}

export function useCreateVendor() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const data = await api.post("/v1/api/tenant/vendors", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    }
  });
}

export function useUpdateVendor() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, payload }: { uid: string, payload: any }) => {
      const data = await api.put(`/v1/api/tenant/vendors/${uid}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    }
  });
}

export function useUpdateVendorStatus() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string, status: string }) => {
      const data = await api.put(`/v1/api/tenant/vendors/${uid}/status/${status}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    }
  });
}

export function useDeleteVendor() {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      await api.del(`/v1/api/tenant/vendors/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    }
  });
}
