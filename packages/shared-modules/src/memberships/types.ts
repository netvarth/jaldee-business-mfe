export interface Membership {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in days
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface MembershipFilters {
  status?: string;
  search?: string;
}

export interface MembershipFormValues {
  name: string;
  description?: string;
  price: number;
  duration: number;
  status: 'active' | 'inactive';
}