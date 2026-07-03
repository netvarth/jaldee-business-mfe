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

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface FormTemplate {
  uid: string;
  name: string;
  fields: FormField[];
  templateSchema?: unknown;
}