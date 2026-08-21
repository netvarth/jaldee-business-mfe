import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCrmApi } from './useCrmApi';

export interface PhoneNumber {
  countryCode: string;
  number: string;
}

export interface TenantUserDto {
  uid: string;
  tenantUid: string;
  userDisplayName?: string;
  salutation?: string;
  firstName: string;
  lastName: string;
  email?: string;
  primaryPhoneNumber?: PhoneNumber;
  departmentName?: string;
  userStatus?: string;
  employeeId?: string;
  gender?: string;
  dob?: string;
  pincode?: string;
  // ... other fields from backend
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * base-crm returns Spring's nested envelope — `{content, page:{size,number,totalElements,
 * totalPages}}` — not the legacy flat shape. Reading `totalElements` off the root yields
 * undefined, which is why the footer read "0 of 0" while rows were on screen.
 * Normalise both shapes so consumers only deal with flat fields.
 */
function normalisePage<T>(raw: any): Page<T> {
  const meta = raw?.page ?? raw ?? {};
  return {
    content: raw?.content ?? [],
    totalElements: meta.totalElements ?? 0,
    totalPages: meta.totalPages ?? 1,
    size: meta.size ?? 0,
    number: meta.number ?? 0,
  };
}

export const useUsers = (searchKeyword: string = '', status: string = 'All', role: string = 'All', page: number = 0, size: number = 20) => {
  const api = useCrmApi();

  return useQuery({
    queryKey: ['users', searchKeyword, status, role, page, size],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchKeyword) params.append('keyword', searchKeyword);

      // Map 'All' to empty or omit
      if (status !== 'All') {
        // userStatus in backend is ACTIVE, INACTIVE, ON_LEAVE
        const mappedStatus = status === 'Active' ? 'ACTIVE' : (status === 'Inactive' ? 'INACTIVE' : 'ON_LEAVE');
        params.append('userStatus', mappedStatus);
      }

      if (role !== 'All') {
        params.append('userDisplayName', role);
      }

      params.append('page', page.toString());
      params.append('size', size.toString());

      // useCrmApi already prefixes `/base-service` and returns parsed JSON (not an
      // axios envelope) — repeating the prefix 404s and `.data` is always undefined.
      const raw = await api.get<unknown>(`/v1/api/tenant/users?${params.toString()}`);
      return normalisePage<TenantUserDto>(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateUser = () => {
  const api = useCrmApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: Partial<TenantUserDto>) => {
      return await api.post<TenantUserDto>('/v1/api/tenant/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const api = useCrmApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, data }: { uid: string; data: Partial<TenantUserDto> }) => {
      return await api.put<boolean>(`/v1/api/tenant/users/${uid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUserStatus = () => {
  const api = useCrmApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }: { uid: string; status: string }) => {
      return await api.put<boolean>(`/v1/api/tenant/users/${uid}/user-status/${status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
