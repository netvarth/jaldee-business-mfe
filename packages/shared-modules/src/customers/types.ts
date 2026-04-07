export interface Customer {
  id: string;
  jaldeeId?: string;
  firstName: string;
  lastName?: string;
  phoneNo?: string;
  countryCode?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  status?: string;
  parent?: boolean;
  whatsappNumber?: string;
  telegramNumber?: string;
  createdAt?: string;
  lastVisit?: string;
  visitCount?: number;
}

export interface CustomerVisit {
  id: string;
  type: "today" | "future" | "history" | "order";
  title: string;
  service?: string;
  date?: string;
  time?: string;
  status?: string;
}

export interface CustomerFilters extends Record<string, unknown> {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerFormValues {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNo: string;
  countryCode: string;
  email: string;
  gender: string;
  dob: string;
  address: string;
  jaldeeId: string;
}
